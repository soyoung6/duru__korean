import pymysql
import random
import json
import time
from datetime import datetime, timedelta

conn = pymysql.connect(
    host='localhost', user='root', password='1234', 
    db='duru_db', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor
)

print("더미 데이터 생성을 시작합니다. 잠시만 기다려주세요...")

try:
    with conn.cursor() as cursor:
        # 1. 유저 200명 생성
        user_ids = []
        ts = int(time.time())
        for i in range(200):
            mode = 'ELEMENTARY' if i % 2 == 0 else 'PRO'
            # 가입일을 과거 10일~40일 전으로 설정
            created_at = datetime.now() - timedelta(days=random.randint(10, 40))
            sql = "INSERT INTO users (username, password, nickname, user_mode, is_premium, created_at) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (f"user_{ts}_{i}", "1234", f"유저{i+1}", mode, i % 4 == 0, created_at))
            user_ids.append({'id': cursor.lastrowid, 'mode': mode, 'created_at': created_at})

        # 2. 작품 70개 생성
        content_ids = []
        grades = ['ELEMENTARY', 'MIDDLE', 'HIGH']
        for i in range(70):
            grade = grades[i % 3]
            modern_json = json.dumps({"summary": f"난이도 {grade} 작품 해석"})
            sql = "INSERT INTO contents (user_id, title, author, grade_level, body_text, modern_interpretation) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (random.choice([u['id'] for u in user_ids]), f"작품_{i+1}", "작가", grade, "본문", modern_json))
            content_ids.append({'id': cursor.lastrowid, 'grade': grade})

        # 3. 학습 데이터 3000개 생성 (철저한 수준별 매칭)
        print("3/3. 수준별 매칭 데이터 시뮬레이션 중...")
        for _ in range(3000):
            user = random.choice(user_ids)
            u_id, u_mode, u_created_at = user['id'], user['mode'], user['created_at']
            
            # 유저 모드에 맞는 지문만 필터링
            if u_mode == 'ELEMENTARY':
                valid_contents = [c['id'] for c in content_ids if c['grade'] == 'ELEMENTARY']
            else:
                valid_contents = [c['id'] for c in content_ids if c['grade'] in ['MIDDLE', 'HIGH']]
            
            c_id = random.choice(valid_contents)
            
            # 수준에 맞는 문제를 풀므로 완강률(is_completed)은 80~90% 수준으로 설정
            is_comp = 1 if random.random() < 0.85 else 0
            
            # 세션일은 반드시 유저 가입일 이후(최소 5분 뒤)의 날짜로 생성되도록 선후관계 일치
            max_days_after = max(1, (datetime.now() - u_created_at).days)
            session_created_at = u_created_at + timedelta(
                days=random.randint(0, max_days_after),
                minutes=random.randint(5, 60)
            )

            # 점수는 일단 0점(초기값)으로 밀어 넣음 (문제 반복문 끝난 후 실제 점수로 UPDATE)
            s_sql = "INSERT INTO practice_sessions (user_id, content_id, practice_type, is_completed, final_score, created_at) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(s_sql, (u_id, c_id, '객관식', is_comp, 0, session_created_at))
            s_id = cursor.lastrowid

            # 이탈 여부에 따른 문제 풀이 개수 제어 (퍼널 분석용)
            num_questions = 4 if is_comp else random.randint(1, 3)
            correct_count = 0 # 맞힌 문제 수 집계용
            
            for q_idx in range(1, num_questions + 1):
                q_type = random.choice(['어휘', '독해', '문법'])
                
                # 취약점(문법) 정답률 하락 및 체류 시간(Dwell Time) 증가 시뮬레이션
                if q_type == '문법':
                    correct_prob = 0.3
                    time_spent = random.randint(30, 90)
                else:
                    correct_prob = 0.8
                    time_spent = random.randint(10, 40)
                    
                is_corr = 1 if random.random() < correct_prob else 0
                if is_corr:
                    correct_count += 1
                
                res_sql = "INSERT INTO practice_results (session_id, user_id, question_index, question_type, is_correct, time_spent) VALUES (%s, %s, %s, %s, %s, %s)"
                cursor.execute(res_sql, (s_id, u_id, q_idx, q_type, is_corr, time_spent))

            # 루프 종료 후, 실제 푼 문제 기준으로 진짜 점수를 계산하여 업데이트 (1문제당 25점)
            actual_score = correct_count * 25
            update_sql = "UPDATE practice_sessions SET final_score = %s WHERE id = %s"
            cursor.execute(update_sql, (actual_score, s_id))

        conn.commit()
        print(f"✅ 더미 데이터 생성 완료! (유저: {u_mode} 등 분리 반영)")

except Exception as e:
    conn.rollback()
    print(f"❌ 오류: {e}")
finally:
    conn.close()