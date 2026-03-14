import os
import json
import time
import requests
from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Header, Form, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import Optional
# 중요: services 폴더에서 가져옵니다.
from services.database import (
    save_analysis_result,
    DBError,
    get_analysis_list,
    get_analysis_detail,
    get_db_connection,
    delete_analysis_result,
    get_admin_stats,
    check_daily_limit,
    increment_daily_count,
    get_content_by_id,
    save_practice_session,
    save_practice_result,
    update_practice_session_score,
    get_practice_history,
    get_practice_detail,
)
from services.ai_service import analyze_content_with_ai, generate_multiple_choice, proofread_text, generate_essay_question, grade_essay, Mode
from services.auth_service import hash_password, verify_password, create_access_token, get_current_user

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ 422 Validation Error on {request.url}:")
    try:
        body = await request.body()
        print(f"Body: {body.decode()}")
    except:
        pass
    print(f"Details: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

KAKAO_ADMIN_KEY = os.getenv("KAKAO_ADMIN_KEY")

# CORS 설정 추가 (반드시 라우터 등록 전에! origins는 프론트엔드 주소에 맞게 수정)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중에는 모든 곳에서의 접근 허용, 배포 시 ["http://localhost:3000", "https://yourdomain.com"] 처럼 구체적으로 지정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# 1. 사용자가 보낼 데이터의 형식을 정의합니다.
class AnalysisRequest(BaseModel):
    title: str = "제목 없음"       # 기본값 설정 (필수 아님)
    author: str = "작성자 미상"     # 기본값 설정 (필수 아님)
    body_text: str                # 분석할 본문은 필수! (프론트엔드가 이 이름으로 보내야 함!)
    mode: str = "MIDDLE"     # 기본값 설정

@app.get("/")
def read_root():
    return {"message": "Duru AI API Server is running!"}

# 회원가입 시 받을 데이터 규격
class UserCreate(BaseModel):
    username: str
    password: str
    nickname: str
    user_mode: str = "PRO"

# 회원가입 API 엔드포인트
@app.post("/auth/signup")
async def signup(user: UserCreate):
    connection = None  # 1. 먼저 None으로 초기화 (에러 방지 핵심!)
    try:
        connection = get_db_connection()  # 여기서 에러가 나도 connection은 None임
        with connection.cursor() as cursor:
            # 아이디 중복 확인
            cursor.execute("SELECT id FROM users WHERE username = %s", (user.username,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")

            # 비밀번호 암호화 및 저장
            hashed_pwd = hash_password(user.password)
            sql = """
                INSERT INTO users (username, password, nickname, user_mode)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(sql, (user.username, hashed_pwd, user.nickname, user.user_mode))
            connection.commit()
            
        return {"status": "success", "message": "회원가입 성공!"}
    
    except Exception as e:
        # 실제 어떤 에러인지 터미널에 찍어보기 위해 추가
        raise HTTPException(status_code=500, detail=f"회원가입 실패: {str(e)}")
    
    finally:
        # 2. connection이 정상적으로 생성되었을 때만 닫도록 수정
        if connection:
            connection.close()

# 로그인 API 엔드포인트
@app.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    connection = None
    try:
        connection = get_db_connection()
        # dictionary=True 추가!
        with connection.cursor(dictionary=True) as cursor:
            sql = "SELECT id, username, password, is_premium FROM users WHERE username = %(username)s"
            cursor.execute(sql, {'username': form_data.username})
            user = cursor.fetchone()

            # dictionary 형태로 접근!
            if not user or not verify_password(form_data.password, user['password']):
                raise HTTPException(
                    status_code=401,
                    detail="아이디 또는 비밀번호가 잘못되었습니다.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            access_token = create_access_token(
                data={
                    "sub": user['username'], 
                    "user_id": user['id'],
                    "is_premium": user['is_premium']  # 토큰에 유료 여부도 포함
                }
            )
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user_id": user['id'],
                "is_premium": user['is_premium']
            }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ 로그인 에러 상세: {str(e)}")
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")
    finally:
        if connection:
            connection.close()

# 관리자 통계 조회 API
@app.get("/admin/stats")
async def get_system_stats(token: str = Depends(oauth2_scheme)):
    # 1. 관리자 권한 체크 (간단하게 'admin' 유저인지 확인하거나 토큰 검증)
    user_payload = get_current_user(token)
    # if user_payload["username"] != "admin": # 관리자 아이디가 따로 있다면 설정
    #     raise HTTPException(status_code=403, detail="관리자만 접근 가능합니다.")

    try:
        stats = get_admin_stats()
        return {
            "status": "success",
            "data": stats
        }
    except Exception as e:
        print(f"❌ 통계 에러 상세: {str(e)}")
        raise HTTPException(status_code=500, detail=f"통계 조회 중 오류: {str(e)}")

# 회원 정보 조회 API
@app.get("/auth/me")
async def get_my_info(token: str = Depends(oauth2_scheme)):
    # 1. 토큰 검증
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 정보가 유효하지 않습니다.")

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor(dictionary=True) as cursor:
            # 2. DB 조회 (daily_analysis_count는 daily_usage 테이블로 분리됨)
            sql = "SELECT id, username, nickname, is_premium, created_at FROM users WHERE username = %s"
            cursor.execute(sql, (user_payload["username"],))
            user_data = cursor.fetchone()
            
            if not user_data:
                raise HTTPException(status_code=404, detail="사용자 정보를 찾을 수 없습니다.")
            
            user_id = user_data['id']
            
            # 3. 일일 사용량 조회
            cursor.execute(
                "SELECT count FROM daily_usage WHERE user_id = %s AND usage_date = CURRENT_DATE()",
                (user_id,)
            )
            usage_data = cursor.fetchone()
            current_usage = usage_data['count'] if usage_data else 0

            # 4. 비즈니스 로직 안전하게 처리
            limit = 3
            
            # 프리미엄 여부 확인
            is_premium = user_data.get('is_premium', 0)
            remaining = 999 if is_premium == 1 else max(0, limit - current_usage)

            # 가입일 포맷팅 시 None 체크 추가
            created_at_str = ""
            if user_data.get('created_at'):
                created_at_str = user_data['created_at'].strftime("%Y-%m-%d %H:%M:%S")

            # 5. 프론트엔드 반환 데이터
            return {
                "status": "success",
                "data": {
                    "id": user_id,
                    "username": user_data.get('username'),
                    "nickname": user_data.get('nickname'),
                    "is_premium": is_premium,
                    "created_at": created_at_str,
                    "daily_count": current_usage,
                    "remaining_count": remaining,
                    "max_count": limit
                }
            }
            
    except HTTPException as he:
        raise he
    except Exception as e:
        # 서버 터미널에 에러 상세 내용을 찍어서 원인을 파악하기 쉽게 합니다.
        import traceback
        print(f"❌ 내 정보 조회 서버 에러 상세:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {str(e)}")
    finally:
        if connection:
            connection.close()

# 회원 정보 수정 API
@app.put("/auth/update")
async def update_user_info(
    new_password: str = None, 
    token: str = Depends(oauth2_scheme)
):
    # 1. 토큰으로 현재 로그인한 유저 확인
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 정보가 유효하지 않습니다.")

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 2. 비밀번호를 변경하는 경우
            if new_password:
                # 보안을 위해 새 비밀번호를 해싱(암호화)합니다.
                hashed_password = hash_password(new_password)
                
                sql = "UPDATE users SET password = %s WHERE username = %s"
                cursor.execute(sql, (hashed_password, user_payload["username"]))
                connection.commit()

            return {"status": "success", "message": "회원 정보가 성공적으로 수정되었습니다."}
            
    except Exception as e:
        print(f"❌ 정보 수정 에러: {str(e)}")
        raise HTTPException(status_code=500, detail="정보 수정 중 오류가 발생했습니다.")
    finally:
        if connection:
            connection.close()

# 분석 및 저장 API 엔드포인트
@app.post("/analyze")
async def analyze_and_save(request: AnalysisRequest, token: str = Depends(oauth2_scheme)):
    user_payload = get_current_user(token)
    
    # DB에서 최신 유저 정보(프리미엄 여부) 다시 조회
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    # 일일 제한 체크 (이제 최신 DB 기반의 is_premium을 사용함)
    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수(3회)를 모두 사용했습니다. 내일 다시 시도하거나 유료 회원으로 업그레이드 해주세요!"
        )
    
    try:
        # 1. 안전하게 Mode 객체 확보 (대소문자 무시 및 예외 처리 강화)
        # 안전하게 모드 추출
        request_mode = getattr(request, 'mode', 'MIDDLE').upper()

        if request_mode == "MIDDLE_HIGH":
            request_mode = "MIDDLE"

        try:
            selected_mode = Mode[request_mode]
        except (KeyError, AttributeError):
            selected_mode = Mode.MIDDLE
            request_mode = "MIDDLE"

        # 2. [핵심 수정] 새 ai_service 함수 규격에 맞게 호출
        # 순서가 달라졌으므로 반드시 mode=, text= 처럼 이름을 지정하세요.
        ai_result = analyze_content_with_ai(
            mode=selected_mode,
            is_premium=is_premium,
            text=request.body_text,  # 사용자가 보낸 텍스트
            image_data=None         # 현재는 텍스트 분석이므로 이미지는 None
        )
        
        # [메타데이터 처리] AI가 인식한 제목/작가를 사용 (사용자 입력이 기본값인 경우)
        final_title = request.title
        final_author = request.author
        
        detected_title = ai_result.get("detected_title", "제목 미상")
        detected_author = ai_result.get("detected_author", "작가 미상")
        
        # 사용자가 기본값을 사용한 경우 AI 인식 결과로 대체
        default_titles = ["제목 없음", "텍스트 분석", "이미지 분석", "", None]
        default_authors = ["작성자 미상", "사용자", "", None]
        
        if request.title in default_titles and detected_title != "제목 미상":
            final_title = detected_title
        if request.author in default_authors and detected_author != "작가 미상":
            final_author = detected_author
        
        # 2. DB 저장 시 감지된 메타데이터 사용
        content_id = save_analysis_result(
            user_id=user_payload["id"],
            mode=request_mode,
            result=ai_result,
            title=final_title,
            author=final_author,
            body_text=request.body_text
        )

        # [추가] 성공 후 최신 카운트 조회
        new_remaining = 0
        if not is_premium:
            increment_daily_count(user_payload["id"]) 
            # 여기서 다시 조회하거나 계산
            connection = get_db_connection()
            try:
                with connection.cursor(dictionary=True) as cursor:
                    cursor.execute("SELECT count FROM daily_usage WHERE user_id = %s AND usage_date = CURRENT_DATE()", (user_payload["id"],))
                    usage_data = cursor.fetchone()
                    current_usage = usage_data['count'] if usage_data else 1
                    new_remaining = max(0, 3 - current_usage)
            finally:
                connection.close()

        return {
            "status": "success",
            "content_id": content_id,
            "ai_analysis": ai_result,
            "remaining_count": new_remaining if not is_premium else "Unlimited"
        }
        
    except DBError as de:
        raise HTTPException(status_code=de.status_code, detail=de.message)
    except Exception as e:
        import traceback
        print(f"❌ 서버 에러 발생:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 내부 에러: {str(e)}")

# --- 객관식 문제 생성 API ---
class PracticeCreateRequest(BaseModel):
    content_id: int
    practice_type: str

@app.post("/practice/generate-questions")
async def generate_questions(request: PracticeCreateRequest, token: str = Depends(oauth2_scheme)):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    # DB에서 프리미엄 여부 확인
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    # 일일 제한 체크
    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수를 모두 사용했습니다."
        )

    try:
        content = get_content_by_id(request.content_id)
        if not content:
            raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다.")

        body_text = content.get("body_text", "")
        title = content.get("title", "제목 미상")
        author = content.get("author", "작가 미상")
        grade_level = content.get("grade_level", "MIDDLE")

        try:
            selected_mode = Mode[grade_level]
        except KeyError:
            selected_mode = Mode.MIDDLE

        # 문제 생성
        result = generate_multiple_choice(
            mode=selected_mode,
            text=body_text,
            title=title,
            question_count=None
        )

        session_id = None
        try:
            session_id = save_practice_session(
                user_id=user_payload["id"],
                practice_type="multiple_choice",
                content_id=request.content_id,
                work_title=title,
                work_author=author,
                grade=grade_level,
                question_data=result,
                question_count=len(result.get("questions", [])),
                is_completed=False,
                final_score=0,
            )
        except Exception as save_err:
            print(f"⚠️ 객관식 세션 저장 실패 (무시): {save_err}")

        # 사용량 증가 (무료 사용자만)
        if not is_premium:
            increment_daily_count(user_payload["id"])

        return {
            "status": "success",
            "session_id": session_id,
            "content_id": request.content_id,
            "title": title,
            "author": author,
            "practice_type": "multiple_choice",
            "data": result
        }

    except Exception as e:
        import traceback
        print(f"❌ 문제 생성 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")

# --- 이미지 기반 객관식 문제 생성 API ---
@app.post("/practice/generate-questions/image")
async def generate_questions_from_image(
    title: str = Form("제목 미상"),
    mode: str = Form("MIDDLE"),
    question_count: int = Form(None),
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    # DB에서 프리미엄 여부 확인
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    # 일일 제한 체크
    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수를 모두 사용했습니다."
        )

    try:
        # 이미지 읽기
        image_bytes = await file.read()
        
        # 모드 검증
        request_mode = mode.upper()
        if request_mode == "MIDDLE_HIGH":
            request_mode = "MIDDLE"
        
        try:
            selected_mode = Mode[request_mode]
        except KeyError:
            selected_mode = Mode.MIDDLE

        # 문제 생성 (이미지 기반)
        result = generate_multiple_choice(
            mode=selected_mode,
            text=None,
            image_data=image_bytes,
            title=title,
            question_count=question_count
        )

        # 세션 저장 (연습 기록) - AI가 인식한 메타데이터 활용
        session_id = None
        try:
            # AI가 인식한 제목/작가 사용
            detected_title = result.get("detected_title", title)
            detected_author = result.get("detected_author", "작가 미상")
            
            final_title = detected_title if detected_title and detected_title != "제목 미상" else title
            final_author = detected_author if detected_author and detected_author != "작가 미상" else "작가 미상"
            
            q_count = len(result.get("questions", [])) if isinstance(result, dict) else 1
            session_id = save_practice_session(
                user_id=user_payload["id"],
                practice_type="multiple_choice",
                work_title=final_title or "제목 미상",
                work_author=final_author,
                grade=request_mode,
                question_data=result,
                question_count=q_count
            )
        except Exception as save_err:
            print(f"⚠️ 이미지 객관식 세션 저장 실패 (무시): {save_err}")

        # 사용량 증가 (무료 사용자만)
        if not is_premium:
            increment_daily_count(user_payload["id"])

        return {
            "status": "success",
            "session_id": session_id,
            "data": result
        }

    except Exception as e:
        import traceback
        print(f"❌ 이미지 문제 생성 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")


# --- 글쓰기 첨삭 API ---
class ProofreadRequest(BaseModel):
    text: str                     # 학생이 작성한 글
    mode: str = "MIDDLE"          # ELEMENTARY, MIDDLE, HIGH

@app.post("/practice/proofread")
async def proofread_writing(request: ProofreadRequest, token: str = Depends(oauth2_scheme)):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    # DB에서 프리미엄 여부 확인
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    # 일일 제한 체크
    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수를 모두 사용했습니다."
        )

    try:
        # 모드 검증
        request_mode = request.mode.upper()
        if request_mode == "MIDDLE_HIGH":
            request_mode = "MIDDLE"
        
        try:
            selected_mode = Mode[request_mode]
        except KeyError:
            selected_mode = Mode.MIDDLE

        # 첨삭 수행
        result = proofread_text(
            mode=selected_mode,
            text=request.text
        )

        # 세션 저장 (연습 기록)
        session_id = None
        try:
            session_id = save_practice_session(
                user_id=user_payload["id"],
                practice_type="writing",
                content_id=None,
                work_title="글쓰기 첨삭",
                work_author="사용자",
                grade=request_mode,
                question_data={"original_text": request.text[:500], "result": result},
                question_count=1
            )
        except Exception as save_err:
            print(f"⚠️ 글쓰기 첨삭 세션 저장 실패 (무시): {save_err}")

        # 사용량 증가 (무료 사용자만)
        if not is_premium:
            increment_daily_count(user_payload["id"])

        return {
            "status": "success",
            "session_id": session_id,
            "data": result
        }

    except Exception as e:
        import traceback
        print(f"❌ 첨삭 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"첨삭 실패: {str(e)}")


# --- 서술형 문제 생성 API ---
@app.post("/practice/generate-essay")
async def generate_essay(request: PracticeCreateRequest, token: str = Depends(oauth2_scheme)):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    # DB에서 프리미엄 여부 확인
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    # 일일 제한 체크
    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수를 모두 사용했습니다."
        )

    try:
        content = get_content_by_id(request.content_id)
        if not content:
            raise HTTPException(status_code=404, detail="작품을 찾을 수 없습니다.")

        body_text = content.get("body_text", "")
        title = content.get("title", "제목 미상")
        author = content.get("author", "작가 미상")
        grade_level = content.get("grade_level", "MIDDLE")

        try:
            selected_mode = Mode[grade_level]
        except KeyError:
            selected_mode = Mode.MIDDLE

        # 문제 생성
        result = generate_essay_question(
            mode=selected_mode,
            text=body_text,
            title=title
        )

        session_id = None
        try:
            session_id = save_practice_session(
                user_id=user_payload["id"],
                practice_type="essay",
                content_id=request.content_id,
                work_title=title,
                work_author=author,
                grade=grade_level,
                question_data=result,
                question_count=1,
                is_completed=False,
                final_score=0,
            )
        except Exception as save_err:
            print(f"⚠️ 세션 저장 실패 (무시): {save_err}")

        # 사용량 증가 (무료 사용자만)
        if not is_premium:
            increment_daily_count(user_payload["id"])

        return {
            "status": "success",
            "session_id": session_id,
            "data": result
        }

    except Exception as e:
        import traceback
        print(f"❌ 서술형 문제 생성 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")


# --- 이미지 기반 서술형 문제 생성 API ---
@app.post("/practice/generate-essay/image")
async def generate_essay_from_image(
    title: str = Form("제목 미상"),
    author: str = Form("작가 미상"),
    mode: str = Form("MIDDLE"),
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    # DB에서 프리미엄 여부 확인
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    # 일일 제한 체크
    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수를 모두 사용했습니다."
        )

    try:
        # 이미지 읽기
        image_bytes = await file.read()
        
        # 모드 검증
        request_mode = mode.upper()
        if request_mode == "MIDDLE_HIGH":
            request_mode = "MIDDLE"
        
        try:
            selected_mode = Mode[request_mode]
        except KeyError:
            selected_mode = Mode.MIDDLE

        # 문제 생성 (이미지 기반)
        result = generate_essay_question(
            mode=selected_mode,
            text=None,
            image_data=image_bytes,
            title=title
        )

        # 세션 저장 (연습 기록) - AI가 인식한 메타데이터 활용
        session_id = None
        try:
            detected_title = result.get("detected_title", title)
            detected_author = result.get("detected_author", author)
            
            final_title = detected_title if detected_title and detected_title != "제목 미상" else title
            final_author = detected_author if detected_author and detected_author != "작가 미상" else author
            
            session_id = save_practice_session(
                user_id=user_payload["id"],
                practice_type="essay",
                content_id=None,
                work_title=final_title or "제목 미상",
                work_author=final_author or "작가 미상",
                grade=request_mode,
                question_data=result,
                question_count=1
            )
        except Exception as save_err:
            print(f"⚠️ 이미지 서술형 세션 저장 실패 (무시): {save_err}")

        # 사용량 증가 (무료 사용자만)
        if not is_premium:
            increment_daily_count(user_payload["id"])

        return {
            "status": "success",
            "session_id": session_id,
            "data": result
        }

    except Exception as e:
        import traceback
        print(f"❌ 이미지 서술형 문제 생성 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")


# --- 서술형 답안 채점 API ---
class EssayGradingRequest(BaseModel):
    session_id: Optional[int] = None   # 세션 ID (연습 기록 저장용)
    question: str                      # 문제
    scoring_rubric: dict               # 채점 기준
    student_answer: str                # 학생 답안
    sample_answer: str = ""            # 모범답안 (프론트에서 전달)
    mode: str = "MIDDLE"               # ELEMENTARY, MIDDLE, HIGH

@app.post("/practice/grade-essay")
async def grade_essay_answer(request: EssayGradingRequest, token: str = Depends(oauth2_scheme)):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    # DB에서 프리미엄 여부 확인
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    # 일일 제한 체크
    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수를 모두 사용했습니다."
        )

    try:
        # 모드 검증
        request_mode = request.mode.upper()
        if request_mode == "MIDDLE_HIGH":
            request_mode = "MIDDLE"
        
        try:
            selected_mode = Mode[request_mode]
        except KeyError:
            selected_mode = Mode.MIDDLE

        # 채점 수행
        result = grade_essay(
            question=request.question,
            scoring_rubric=request.scoring_rubric,
            student_answer=request.student_answer,
            mode=selected_mode
        )

        # 결과 저장 (session_id가 있는 경우)
        if request.session_id:
            try:
                save_practice_result(
                    session_id=request.session_id,
                    user_id=user_payload["id"],
                    question_index=0,
                    question_type="서술형",
                    is_correct=False,  # 서술형은 수동/AI 점수 기반이므로 is_correct는 기본값 부여
                    time_spent=0
                )
            except Exception as save_err:
                print(f"⚠️ 결과 저장 실패 (무시): {save_err}")

        # 사용량 증가 (무료 사용자만)
        if not is_premium:
            increment_daily_count(user_payload["id"])

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        import traceback
        print(f"❌ 채점 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"채점 실패: {str(e)}")


# --- 객관식 개별 답안 제출 API ---
class SubmitAnswerRequest(BaseModel):
    session_id: int                 # 세션 ID
    question_index: int             # 문제 번호 (0부터 시작)
    user_answer: int                # 학생이 선택한 답 (1~5)
    correct_answer: int             # 정답 번호 (1~5)
    question_text: str = ""         # 문제 내용 (선택)
    explanation: str = ""           # 해설 (선택)

@app.post("/practice/submit-answer")
async def submit_answer(request: SubmitAnswerRequest, token: str = Depends(oauth2_scheme)):
    """객관식 개별 문제 답안 제출 및 저장"""
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    try:
        is_correct = request.user_answer == request.correct_answer
        score = 100 if is_correct else 0

        # 결과 저장
        result_id = save_practice_result(
            session_id=request.session_id,
            user_id=user_payload["id"],
            question_index=request.question_index,
            user_answer=str(request.user_answer),
            correct_answer=str(request.correct_answer),
            is_correct=is_correct,
            score=score,
            result_data={
                "question_text": request.question_text,
                "explanation": request.explanation,
                "is_correct": is_correct
            }
        )

        return {
            "status": "success",
            "result_id": result_id,
            "is_correct": is_correct,
            "score": score
        }

    except Exception as e:
        import traceback
        print(f"❌ 답안 제출 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"답안 제출 실패: {str(e)}")


from typing import Optional

class PracticeAnswerItem(BaseModel):
    question_index: int
    question_type: str
    user_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    score: Optional[int] = None
    is_correct: bool
    time_spent: int

class PracticeSubmitRequest(BaseModel):
    session_id: int
    answers: list[PracticeAnswerItem]

@app.post("/practice/submit")
def submit_practice(
    request: PracticeSubmitRequest,
    token: str = Depends(oauth2_scheme)
):
    current_user = get_current_user(token)
    if not current_user:
        raise HTTPException(status_code=401, detail="인증 필요")
    
    try:
        correct_count = 0

        for item in request.answers:
            save_practice_result(
                session_id=request.session_id,
                user_id=current_user["id"],
                question_index=item.question_index,
                question_type=item.question_type,
                user_answer=item.user_answer,
                correct_answer=item.correct_answer,
                is_correct=item.is_correct,
                score=item.score if item.score is not None else (100 if item.is_correct else 0),
                time_spent=item.time_spent,
            )
            if item.is_correct:
                correct_count += 1

        total_questions = len(request.answers)
        final_score = int((correct_count / total_questions) * 100) if total_questions > 0 else 0

        update_practice_session_score(
            session_id=request.session_id,
            final_score=final_score,
            is_completed=True,
        )

        return {
            "status": "success",
            "session_id": request.session_id,
            "total_questions": total_questions,
            "correct_count": correct_count,
            "final_score": final_score,
            "total_score": final_score, # For backward compatibility with some frontend logic
        }

    except Exception as e:
        import traceback
        print(f"❌ 제출 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"제출 실패: {str(e)}")

# --- 연습 기록 조회 API ---
@app.get("/practice/history")
async def get_history(
    practice_type: str = None,  # essay, multiple_choice, writing
    limit: int = 20,
    token: str = Depends(oauth2_scheme)
):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    try:
        results = get_practice_history(
            user_id=user_payload["id"],
            practice_type=practice_type,
            limit=limit
        )
        return {
            "status": "success",
            "data": results
        }
    except Exception as e:
        import traceback
        print(f"❌ 연습 기록 조회 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"조회 실패: {str(e)}")


# --- 연습 상세 조회 API ---
@app.get("/practice/history/{session_id}")
async def get_history_detail(
    session_id: int,
    token: str = Depends(oauth2_scheme)
):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    try:
        result = get_practice_detail(session_id, user_payload["id"])
        if not result:
            raise HTTPException(status_code=404, detail="연습 기록을 찾을 수 없습니다.")
        return {
            "status": "success",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ 연습 상세 조회 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"조회 실패: {str(e)}")


# --- 연습 기록 삭제 API ---
@app.delete("/practice/history/{session_id}")
async def delete_practice_session(
    session_id: int,
    token: str = Depends(oauth2_scheme)
):
    """연습 세션 삭제 (관련 결과도 함께 삭제)"""
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor(dictionary=True) as cursor:
            # 1. 먼저 해당 세션이 이 유저의 것인지 확인
            cursor.execute(
                "SELECT id FROM practice_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_payload["id"])
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="연습 기록을 찾을 수 없습니다.")
            
            # 2. 관련 결과 삭제
            cursor.execute(
                "DELETE FROM practice_results WHERE session_id = %s",
                (session_id,)
            )
            
            # 3. 세션 삭제
            cursor.execute(
                "DELETE FROM practice_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_payload["id"])
            )
            connection.commit()
            
            return {"status": "success", "message": "연습 기록이 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ 연습 기록 삭제 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"삭제 실패: {str(e)}")
    finally:
        if connection:
            connection.close()


# --- 통합 기록 조회 API (분석 + 연습) ---
@app.get("/records/all")
async def get_all_records(
    record_type: str = None,  # analysis, multiple_choice, essay, writing
    limit: int = 30,
    token: str = Depends(oauth2_scheme)
):
    """분석 기록과 연습 기록을 통합하여 반환"""
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="인증 필요")

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor(dictionary=True) as cursor:
            records = []
            
            # 분석 기록 조회 (record_type이 없거나 'analysis'인 경우)
            if not record_type or record_type == "analysis":
                cursor.execute("""
                    SELECT 
                        id,
                        'analysis' as record_type,
                        title as work_title,
                        author as work_author,
                        grade_level as grade,
                        NULL as score,
                        NULL as question_count,
                        created_at
                    FROM contents 
                    WHERE user_id = %(user_id)s
                    ORDER BY created_at DESC
                    LIMIT %(limit)s
                """, {'user_id': user_payload["id"], 'limit': limit})
                analysis_records = cursor.fetchall()
                records.extend(analysis_records)
            
            # 연습 기록 조회 (record_type이 없거나 연습 유형인 경우)
            practice_types = []
            if not record_type:
                practice_types = ['multiple_choice', 'essay', 'writing']
            elif record_type in ['multiple_choice', 'essay', 'writing']:
                practice_types = [record_type]
            
            if practice_types:
                placeholders = ', '.join(['%s'] * len(practice_types))
                cursor.execute(f"""
                    SELECT 
                        s.id,
                        s.practice_type as record_type,
                        s.work_title,
                        s.work_author,
                        s.grade,
                        COALESCE(AVG(r.score), NULL) as score,
                        s.question_count,
                        s.created_at
                    FROM practice_sessions s
                    LEFT JOIN practice_results r ON s.id = r.session_id
                    WHERE s.user_id = %s AND s.practice_type IN ({placeholders})
                    GROUP BY s.id
                    ORDER BY s.created_at DESC
                    LIMIT %s
                """, [user_payload["id"]] + practice_types + [limit])
                practice_records = cursor.fetchall()
                records.extend(practice_records)
            
            # 날짜 기준 정렬
            for record in records:
                if record.get('created_at'):
                    record['created_at'] = record['created_at'].strftime("%Y-%m-%d %H:%M:%S")
                # score가 Decimal인 경우 float로 변환
                if record.get('score') is not None:
                    record['score'] = float(record['score'])
            
            # 날짜 기준 내림차순 정렬
            records.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            # limit 적용
            records = records[:limit]
            
            return {
                "status": "success",
                "data": records
            }
    except Exception as e:
        import traceback
        print(f"❌ 통합 기록 조회 에러:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"조회 실패: {str(e)}")
    finally:
        if connection:
            connection.close()


# --- 이미지 분석(OCR) API ---
@app.post("/analyze/image")
async def analyze_image(
    title: str = Form(...),    # 👈 str 대신 Form(...)으로 변경
    author: str = Form(...),   # 👈 Form(...) 추가
    mode: str = Form("MIDDLE"),
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    user_payload = get_current_user(token)
    if not user_payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    # DB에서 최신 유저 정보(프리미엄 여부) 다시 조회
    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_payload["id"],))
            db_user = cursor.fetchone()
            is_premium = db_user['is_premium'] if db_user else 0
    finally:
        connection.close()

    if not check_daily_limit(user_payload["id"], is_premium):
        raise HTTPException(
            status_code=429,
            detail="오늘의 무료 분석 횟수(3회)를 모두 사용했습니다. 내일 다시 시도하거나 유료 회원으로 업그레이드 해주세요!"
        )
        
    try:
        # 이미지 읽기
        image_bytes = await file.read()
        request_mode_str = mode.upper()
        
        # 입력받은 mode를 대문자로 변환
        request_mode_str = mode.upper()

        # 만약 MIDDLE_HIGH로 오면 DB 저장을 위해 MIDDLE로 강제 변경
        if request_mode_str == "MIDDLE_HIGH":
            request_mode_str = "MIDDLE"

        try:
            selected_mode = Mode[request_mode_str]
        except KeyError:
            # 없는 모드면 기본값 MIDDLE 사용
            selected_mode = Mode.MIDDLE
            request_mode_str = "MIDDLE"

        # AI 서비스 호출
        ai_result = analyze_content_with_ai(
            mode=selected_mode,
            is_premium=is_premium,
            text=None,
            image_data=image_bytes
        )
        
        # [메타데이터 처리] AI가 인식한 제목/작가를 사용
        detected_title = ai_result.get("detected_title", "제목 미상")
        detected_author = ai_result.get("detected_author", "작가 미상")
        
        final_title = detected_title if detected_title != "제목 미상" else title
        final_author = detected_author if detected_author != "작가 미상" else author
        
        # 3. DB 저장 (감지된 메타데이터 사용)
        content_id = save_analysis_result(
            user_id=user_payload["id"],
            mode=request_mode_str,
            result=ai_result,
            title=final_title,
            author=final_author,
            body_text="[이미지 파일 분석 건]"
        )
        
        # [추가] 성공 후 최신 카운트 조회
        new_remaining = 0
        if not is_premium:
            increment_daily_count(user_payload["id"]) 
            # 여기서 다시 조회하거나 계산
            connection = get_db_connection()
            try:
                with connection.cursor(dictionary=True) as cursor:
                    cursor.execute("SELECT count FROM daily_usage WHERE user_id = %s AND usage_date = CURRENT_DATE()", (user_payload["id"],))
                    usage_data = cursor.fetchone()
                    current_usage = usage_data['count'] if usage_data else 1
                    new_remaining = max(0, 3 - current_usage)
            finally:
                connection.close()
                
        return {
            "status": "success", 
            "content_id": content_id, 
            "ai_analysis": ai_result,
            "remaining_count": new_remaining if not is_premium else "Unlimited"
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"이미지 분석 실패: {str(e)}")
        
# --- 목록 조회 API (토큰 적용 버전) ---
@app.get("/contents/list")
async def fetch_list(
    search: str = None,  # 검색어를 선택적으로 받을 수 있게 추가
    token: str = Depends(oauth2_scheme)
):
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    try:
        # DB 함수에 검색어를 같이 넘겨줍니다.
        results = get_analysis_list(user["id"], search)

        # 💡 터미널에 로그를 찍어서 데이터가 몇 건 나오는지 확인해보세요
        print(f"DEBUG: 유저 {user['id']}의 데이터 조회 결과 -> {len(results)}건")
        
        return {"status": "success", "username": user["username"], "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 상세 조회 API (수정) ---
@app.get("/contents/detail/{content_id}")
async def fetch_detail(
    content_id: int, 
    token: str = Depends(oauth2_scheme) # 자물쇠 버튼을 생성하고 토큰을 자동으로 가져옴
):

    # 1. 토큰 검증 (이제 Bearer를 직접 split할 필요가 없습니다!)
    user = get_current_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    # 2. 상세 내역 조회
    try:
        result = get_analysis_detail(content_id)
        if not result:
            raise HTTPException(status_code=404, detail="내역을 찾을 수 없습니다.")
        
        # 3. [데이터 소유권 확인] 
        # result[1] -> result['user_id'] 로 수정 (딕셔너리 방식)
        if result['user_id'] != user["id"]:  
            raise HTTPException(status_code=403, detail="해당 콘텐츠에 접근 권한이 없습니다.")
            
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 실패: {str(e)}")

# --- 삭제 API (수정) ---
@app.delete("/contents/{content_id}")
async def remove_content(
    content_id: int, 
    token: str = Depends(oauth2_scheme)
):
    # 1. 토큰으로 유저 확인
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="인증되지 않은 사용자입니다.")

    # 2. DB 삭제 실행
    success = delete_analysis_result(content_id, user["id"])

    # 3. 결과 응답
    if not success:
        # 삭제된 데이터가 없거나, 내 데이터가 아닐 경우
        raise HTTPException(
            status_code=404, 
            detail="삭제할 내역이 없거나 삭제 권한이 없습니다."
        )

    return {"status": "success", "message": f"{content_id}번 내역이 성공적으로 삭제되었습니다."}

# 결제 준비
@app.post("/payment/ready")
async def pay_ready(token: str = Depends(oauth2_scheme)):
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="인증 필요")
    
    order_id = f"ORDER_{user['id']}_{int(time.time())}"
    
    params = {
        "cid": "TCSUBSCRIP",  # 👈 정기결제용 테스트 CID
        "partner_order_id": order_id,
        "partner_user_id": user["username"],
        "item_name": "두루국어 프리미엄 멤버십",
        "quantity": 1,
        "total_amount": 9900,
        "tax_free_amount": 0,
        "approval_url": f"http://localhost:3000/payment/success?user_id={user['id']}",
        "cancel_url": "http://localhost:3000/mypage",
        "fail_url": "http://localhost:3000/mypage",
    }
    
    headers = {"Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}", "Content-type": "application/x-www-form-urlencoded;charset=utf-8"}
    res = requests.post("https://kapi.kakao.com/v1/payment/ready", data=params, headers=headers)
    result = res.json()
    
    try:
        res = requests.post("https://kapi.kakao.com/v1/payment/ready", 
                          data=params, headers=headers)
        result = res.json()

        # ⭐ 에러 확인 추가
        print(f"카카오페이 응답: {result}")  # 디버깅용
        
        if 'tid' not in result:
            # 카카오페이가 에러를 반환한 경우
            raise HTTPException(
                status_code=400, 
                detail=f"카카오페이 에러: {result}"
            )
        
        # DB에 임시 데이터 저장
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE users SET pending_tid = %s, last_order_id = %s WHERE id = %s", 
                           (result['tid'], order_id, user['id']))
            connection.commit()
        connection.close()

        return result
        
    except Exception as e:
        print(f"결제 준비 에러: {str(e)}")
        raise HTTPException(status_code=500, detail="결제 준비 실패")

# 결제 승인 (SID 추출 및 저장)
@app.get("/payment/approve")
async def pay_approve(pg_token: str, user_id: int):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor(dictionary=True) as cursor:
            # 1. DB에서 기존에 저장했던 tid와 order_id 조회
            cursor.execute(
                "SELECT username, pending_tid, last_order_id FROM users WHERE id = %s",
                (user_id,)
            )
            user_data = cursor.fetchone()
            
            if not user_data or not user_data['pending_tid']:
                raise HTTPException(status_code=400, detail="결제 정보 없음")
            
            # 2. 카카오페이 승인 요청 (CID를 반드시 TCSUBSCRIP로!)
            params = {
                "cid": "TCSUBSCRIP",  # 👈 정기결제용 CID로 일치시켜야 함
                "tid": user_data['pending_tid'],
                "partner_order_id": user_data['last_order_id'],
                "partner_user_id": user_data['username'],
                "pg_token": pg_token,
            }
            
            headers = {
                "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
                "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
            }
            
            res = requests.post("https://kapi.kakao.com/v1/payment/approve",
                              data=params, headers=headers)
            result_data = res.json()
            
            if res.status_code == 200:
                result_data = res.json()
                # 핵심: 정기결제 키(sid) 추출
                sid = result_data.get("sid")
                
                # 유저 정보 업데이트 (프리미엄 등급 + SID 저장)
                cursor.execute(
                    """
                    UPDATE users 
                    SET is_premium = 1, 
                        kakao_sid = %s, 
                        pending_tid = NULL, 
                        last_order_id = NULL 
                    WHERE id = %s
                    """,
                    (sid, user_id)
                )
                
                # 4. 결제 이력 기록 (payments 테이블)
                cursor.execute(
                    "INSERT INTO payments (user_id, merchant_uid, amount, status, paid_at) VALUES (%s, %s, %s, 'PAID', NOW())",
                    (user_id, user_data['last_order_id'], 9900)
                )
                
                connection.commit()
                return {"status": "success", "message": "정기 구독이 시작되었습니다!", "sid": sid}
            else:
                return {"status": "fail", "detail": result_data}
                
    except Exception as e:
        print(f"❌ 결제 승인 에러: {str(e)}")
        raise HTTPException(status_code=500, detail="결제 승인 중 오류 발생")
    finally:
        if connection:
            connection.close()

# 구독 해지 (정기결제 비활성화)
@app.post("/payment/unsubscribe")
async def unsubscribe(token: str = Depends(oauth2_scheme)):
    user_payload = get_current_user(token)
    print(f"--- 해지 시도 유저 ID: {user_payload['id']} ---") # 터미널 확인용

    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            # 1. 사용자의 sid 가져오기
            cursor.execute("SELECT kakao_sid FROM users WHERE id = %s", (user_payload["id"],))
            user_data = cursor.fetchone()
            print(f"조회된 SID: {user_data.get('kakao_sid') if user_data else '유저없음'}")
            
            if not user_data or not user_data['kakao_sid']:
                raise HTTPException(status_code=400, detail="현재 정기 구독 상태가 아닙니다.")

            # 2. 카카오페이 비활성화 API 호출
            headers = {
                "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
                "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
            }
            params = {
                "cid": "TCSUBSCRIP",
                "sid": user_data['kakao_sid']
            }
            
            res = requests.post("https://kapi.kakao.com/v1/payment/manage/subscription/inactive", 
                               data=params, headers=headers)
            
            if res.status_code == 200:
                # 3. DB 정보 업데이트 (프리미엄 해제 및 SID 삭제)
                cursor.execute(
                    "UPDATE users SET is_premium = 0, kakao_sid = NULL WHERE id = %s",
                    (user_payload["id"],)
                )
                connection.commit()

                # 안내 문구 강화
                return {
                    "status": "success", 
                    "message": "구독 해지가 완료되었습니다. 정기 결제가 중단되었으며, 현재 시간부로 일반 등급으로 전환되었습니다. 그동안 이용해주셔서 감사합니다."
                }
            else:
                return {"status": "fail", "detail": "카카오페이 해지 처리 중 오류가 발생했습니다."}
    finally:
        connection.close()