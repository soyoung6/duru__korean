import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
from .database import get_db_connection

load_dotenv()

# .env에서 설정값 읽기 (없을 경우를 대비한 기본값 설정)
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# ---  보안 도구 함수들 ---
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    # 사용자 정보 담은 JWT 토큰 생성.
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 토큰 검증 함수
def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if username is None or user_id is None:
            return None
        return {"username": username, "id": user_id}
    except JWTError:
        return None

# --- 회원가입 함수 ---
def create_user(username, password, nickname):
    hashed_password = hash_password(password)
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. 중복 가입 확인 (선택 사항이지만 권장)
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return {"status": "error", "message": "이미 존재하는 아이디입니다."}

            # 2. 유저 정보 삽입
            # is_premium에 기본값을 명시합니다.
            sql = """
                INSERT INTO users 
                (username, password, nickname, is_premium) 
                VALUES (%s, %s, %s, %s)
            """
            # is_premium=0 (무료) 으로 시작
            cursor.execute(sql, (username, hashed_password, nickname, 0))
            connection.commit()
            return {"status": "success", "message": "회원가입이 완료되었습니다."}
    except Exception as e:
        print(f"❌ 회원가입 중 오류: {str(e)}")
        return {"status": "error", "message": str(e)}
    finally:
        connection.close()