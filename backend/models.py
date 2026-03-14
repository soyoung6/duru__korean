from sqlalchemy import Column, Integer, String, Boolean, Enum, Text, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base

# 1. 사용자 모델
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    nickname = Column(String(50))
    user_mode = Column(Enum('ELEMENTARY', 'PRO'), default='PRO')
    is_premium = Column(Boolean, default=False)
    daily_analysis_count = Column(Integer, default=0)
    last_reset_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

# 2. 국어 작품/콘텐츠 모델
class Content(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    author = Column(String(50))
    grade_level = Column(Enum('ELEMENTARY', 'MIDDLE', 'HIGH'), nullable=False)
    body_text = Column(Text, nullable=False)
    ai_explanation = Column(Text)
    modern_interpretation = Column(JSON)
    voice_url = Column(String(255))
    image_url = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())