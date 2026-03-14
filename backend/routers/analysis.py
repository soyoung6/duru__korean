from fastapi import APIRouter, Depends
from ..services import ai_service

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/")
def create_analysis(content: str, mode: str = "PRO"):
    # AI 서비스 호출
    result = ai_service.analyze_text_with_ai(content, mode)
    return {"status": "success", "data": result}