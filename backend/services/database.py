import json
import os
from datetime import date
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

current_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(current_dir, "..", ".env")
load_dotenv(dotenv_path)


class DBError(Exception):
    def __init__(self, message, status_code=500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "duru_db"),
            charset="utf8mb4",
        )
        return connection
    except Error as e:
        raise DBError(f"데이터베이스 연결에 실패했습니다: {str(e)}", status_code=503)


# =========================
# 분석 결과 저장 / 조회
# =========================

def save_analysis_result(user_id, mode, result, title="Unknown", author="Unknown", body_text=""):
    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)

        if isinstance(result, str):
            result_dict = json.loads(result)
        else:
            result_dict = result

        interpretation_data = {
            "mbti": result_dict.get("mbti", ""),
            "chat_version": result_dict.get("chat_version", ""),
            "summary": result_dict.get("summary", "")
        }

        sql = """
            INSERT INTO contents
            (user_id, title, author, grade_level, body_text, ai_explanation, modern_interpretation, created_at)
            VALUES
            (%(user_id)s, %(title)s, %(author)s, %(grade_level)s, %(body_text)s, %(explanation)s, %(interpretation)s, NOW())
        """

        values = {
            "user_id": user_id,
            "title": title,
            "author": author,
            "grade_level": mode,
            "body_text": body_text,
            "explanation": result_dict.get("explanation") or result_dict.get("ai_explanation") or "해설 없음",
            "interpretation": json.dumps(interpretation_data, ensure_ascii=False),
        }

        cursor.execute(sql, values)
        conn.commit()
        return cursor.lastrowid

    except Exception as e:
        if conn:
            conn.rollback()
        raise DBError(f"데이터 저장 중 서버 오류가 발생했습니다: {str(e)}", status_code=500)

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def get_analysis_list(user_id: int, search_query: str = None):
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            sql = """
                SELECT id, title, author, grade_level AS mode, created_at
                FROM contents
                WHERE user_id = %(user_id)s
            """
            params = {"user_id": user_id}

            if search_query:
                sql += " AND (title LIKE %(search1)s OR author LIKE %(search2)s)"
                params["search1"] = f"%{search_query}%"
                params["search2"] = f"%{search_query}%"

            sql += " ORDER BY created_at DESC"

            cursor.execute(sql, params)
            results = cursor.fetchall()

            for item in results:
                if item.get("created_at"):
                    item["created_at"] = item["created_at"].strftime("%Y-%m-%d %H:%M:%S")

            return results
    finally:
        connection.close()


def get_analysis_detail(content_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            sql = "SELECT * FROM contents WHERE id = %(content_id)s"
            cursor.execute(sql, {"content_id": content_id})
            result = cursor.fetchone()

            if result and result.get("created_at"):
                result["created_at"] = result["created_at"].strftime("%Y-%m-%d %H:%M:%S")

            if result and result.get("modern_interpretation") and isinstance(result["modern_interpretation"], str):
                try:
                    result["modern_interpretation"] = json.loads(result["modern_interpretation"])
                except Exception:
                    pass

            return result
    finally:
        connection.close()


def delete_analysis_result(content_id: int, user_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            sql = "DELETE FROM contents WHERE id = %(content_id)s AND user_id = %(user_id)s"
            cursor.execute(sql, {"content_id": content_id, "user_id": user_id})
            conn.commit()
            return cursor.rowcount > 0
    except Exception:
        return False
    finally:
        if conn and conn.is_connected():
            conn.close()


def get_admin_stats():
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT COUNT(*) as total_users FROM users")
            total_users = cursor.fetchone()["total_users"]

            cursor.execute("SELECT COUNT(*) as total_contents FROM contents")
            total_contents = cursor.fetchone()["total_contents"]

            return {
                "total_users": total_users,
                "total_analysis": total_contents,
            }
    finally:
        connection.close()


# =========================
# 일일 사용량 제한
# users 테이블이 아니라 daily_usage 사용
# =========================

def check_daily_limit(user_id: int, is_premium: bool):
    if is_premium == 1 or is_premium is True:
        return True

    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            sql = """
                SELECT count
                FROM daily_usage
                WHERE user_id = %(user_id)s
                  AND usage_date = CURDATE()
            """
            cursor.execute(sql, {"user_id": user_id})
            result = cursor.fetchone()

            used_count = result["count"] if result else 0
            return int(used_count) < 3
    finally:
        connection.close()


def increment_daily_count(user_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO daily_usage (user_id, usage_date, count)
                VALUES (%s, CURDATE(), 1)
                ON DUPLICATE KEY UPDATE count = count + 1
            """
            cursor.execute(sql, (user_id,))
            connection.commit()
    finally:
        connection.close()


# =========================
# contents 조회 보조 함수
# =========================

def get_content_by_id(content_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            sql = """
                SELECT id, user_id, title, author, grade_level, body_text, ai_explanation, modern_interpretation, created_at
                FROM contents
                WHERE id = %(content_id)s
            """
            cursor.execute(sql, {"content_id": content_id})
            row = cursor.fetchone()

            if row and row.get("created_at"):
                row["created_at"] = row["created_at"].strftime("%Y-%m-%d %H:%M:%S")

            if row and row.get("modern_interpretation") and isinstance(row["modern_interpretation"], str):
                try:
                    row["modern_interpretation"] = json.loads(row["modern_interpretation"])
                except Exception:
                    pass

            return row
    finally:
        connection.close()


# =========================
# 연습 세션 저장 / 조회
# 신규 스키마 기준
# =========================

def save_practice_session(
    user_id: int,
    practice_type: str,
    content_id: int = None,
    work_title: str = "제목 미상",
    work_author: str = "작가 미상",
    grade: str = "MIDDLE",
    question_data: dict = None,
    question_count: int = 1,
    is_completed: bool = False,
    final_score: int = 0
):
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            sql = """
                INSERT INTO practice_sessions
                (user_id, content_id, practice_type, work_title, work_author, grade, question_data, question_count, is_completed, final_score, created_at)
                VALUES
                (%(user_id)s, %(content_id)s, %(practice_type)s, %(work_title)s, %(work_author)s, %(grade)s, %(question_data)s, %(question_count)s, %(is_completed)s, %(final_score)s, NOW())
            """
            cursor.execute(
                sql,
                {
                    "user_id": user_id,
                    "content_id": content_id,
                    "practice_type": practice_type,
                    "work_title": work_title,
                    "work_author": work_author,
                    "grade": grade,
                    "question_data": json.dumps(question_data, ensure_ascii=False) if question_data else None,
                    "question_count": question_count,
                    "is_completed": int(is_completed),
                    "final_score": final_score,
                },
            )
            connection.commit()
            return cursor.lastrowid
    except Exception as e:
        if connection:
            connection.rollback()
        raise DBError(f"연습 세션 저장 실패: {str(e)}")
    finally:
        connection.close()


def save_practice_result(
    session_id: int,
    user_id: int,
    question_index: int,
    question_type: str,
    is_correct: bool,
    time_spent: int,
    user_answer: str = None,
    correct_answer: str = None,
    score: int = 0,
    result_data: dict = None
):
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            sql = """
                INSERT INTO practice_results
                (session_id, user_id, question_index, question_type, user_answer, correct_answer, is_correct, score, result_data, time_spent)
                VALUES
                (%(session_id)s, %(user_id)s, %(question_index)s, %(question_type)s, %(user_answer)s, %(correct_answer)s, %(is_correct)s, %(score)s, %(result_data)s, %(time_spent)s)
            """
            cursor.execute(
                sql,
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "question_index": question_index,
                    "question_type": question_type,
                    "user_answer": user_answer,
                    "correct_answer": correct_answer,
                    "is_correct": int(is_correct),
                    "score": score,
                    "result_data": json.dumps(result_data, ensure_ascii=False) if result_data else None,
                    "time_spent": int(time_spent),
                },
            )
            connection.commit()
            return cursor.lastrowid
    except Exception as e:
        if connection:
            connection.rollback()
        raise DBError(f"연습 결과 저장 실패: {str(e)}")
    finally:
        connection.close()


def update_practice_session_score(session_id: int, final_score: int, is_completed: bool = True):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                UPDATE practice_sessions
                SET final_score = %s,
                    is_completed = %s
                WHERE id = %s
            """
            cursor.execute(sql, (final_score, int(is_completed), session_id))
            connection.commit()
    finally:
        connection.close()


def get_practice_history(user_id: int, practice_type: str = None, limit: int = 20):
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            sql = """
                SELECT
                    s.id,
                    s.user_id,
                    s.content_id,
                    s.practice_type,
                    s.is_completed,
                    s.final_score,
                    s.created_at,
                    COALESCE(c.title, s.work_title) AS work_title,
                    COALESCE(c.author, s.work_author) AS work_author,
                    COALESCE(c.grade_level, s.grade) AS grade,
                    COUNT(r.id) AS attempt_count,
                    ROUND(AVG(CASE WHEN r.is_correct = 1 THEN 100 ELSE 0 END), 1) AS accuracy_avg,
                    ROUND(AVG(r.time_spent), 1) AS avg_time_spent
                FROM practice_sessions s
                LEFT JOIN contents c ON s.content_id = c.id
                LEFT JOIN practice_results r ON s.id = r.session_id
                WHERE s.user_id = %(user_id)s
            """
            params = {"user_id": user_id}

            if practice_type:
                sql += " AND s.practice_type = %(practice_type)s"
                params["practice_type"] = practice_type

            sql += """
                GROUP BY
                    s.id, s.user_id, s.content_id, s.practice_type, s.is_completed,
                    s.final_score, s.created_at, c.title, c.author, c.grade_level
                ORDER BY s.created_at DESC
                LIMIT %(limit)s
            """
            params["limit"] = limit

            cursor.execute(sql, params)
            results = cursor.fetchall()

            for item in results:
                if item.get("created_at"):
                    item["created_at"] = item["created_at"].strftime("%Y-%m-%d %H:%M:%S")

            return results
    except Exception as e:
        raise DBError(f"연습 기록 조회 실패: {str(e)}")
    finally:
        connection.close()


def get_practice_detail(session_id: int, user_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            session_sql = """
                SELECT
                    s.id,
                    s.user_id,
                    s.content_id,
                    s.practice_type,
                    s.is_completed,
                    s.final_score,
                    s.created_at,
                    COALESCE(c.title, s.work_title) AS work_title,
                    COALESCE(c.author, s.work_author) AS work_author,
                    COALESCE(c.grade_level, s.grade) AS grade,
                    s.question_data,
                    c.body_text
                FROM practice_sessions s
                LEFT JOIN contents c ON s.content_id = c.id
                WHERE s.id = %(session_id)s
                  AND s.user_id = %(user_id)s
            """
            cursor.execute(session_sql, {"session_id": session_id, "user_id": user_id})
            session = cursor.fetchone()

            if not session:
                return None

            if session.get("created_at"):
                session["created_at"] = session["created_at"].strftime("%Y-%m-%d %H:%M:%S")

            if session.get("question_data") and isinstance(session["question_data"], str):
                try:
                    session["question_data"] = json.loads(session["question_data"])
                except Exception:
                    pass

            result_sql = """
                SELECT
                    id,
                    session_id,
                    user_id,
                    question_index,
                    question_type,
                    user_answer,
                    correct_answer,
                    is_correct,
                    score,
                    result_data,
                    time_spent,
                    submitted_at
                FROM practice_results
                WHERE session_id = %(session_id)s
                ORDER BY question_index
            """
            cursor.execute(result_sql, {"session_id": session_id})
            results = cursor.fetchall()

            for item in results:
                if item.get("submitted_at"):
                    item["submitted_at"] = item["submitted_at"].strftime("%Y-%m-%d %H:%M:%S")
                if item.get("result_data") and isinstance(item["result_data"], str):
                    try:
                        item["result_data"] = json.loads(item["result_data"])
                    except Exception:
                        pass

            session["results"] = results
            return session
    except Exception as e:
        raise DBError(f"연습 상세 조회 실패: {str(e)}")
    finally:
        connection.close()
