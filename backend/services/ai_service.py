import os
import json
from enum import Enum
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# --- 설정 및 상수 ---
PROMPT_VERSION = "v1.4-multimodal"  # 멀티모달(OCR) 대응 버전

# API 설정 및 모델 로드
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

# --- 고퀄리티 최종 검수용 (분당 2회, 하루 50회 제한) ---
# model = genai.GenerativeModel('gemini-2.0-pro-exp')

class Mode(str, Enum):  # Enum 정의: 문자열을 상속받아 FastAPI와 호환성 높임
    ELEMENTARY = "ELEMENTARY"
    MIDDLE = "MIDDLE"
    HIGH = "HIGH"
    MIDDLE_HIGH = "MIDDLE_HIGH"

# --- 공통 규칙 (모든 프롬프트에 적용) ---
COMMON_RULE = """
[출력 형식 - 절대 준수]
반드시 아래 JSON 형식으로만 응답하세요. 다른 설명이나 주석은 절대 추가하지 마세요.
{
  "detected_title": "작품 제목 (인식 불가시 '제목 미상')",
  "detected_author": "작가 이름 (인식 불가시 '작가 미상')",
  "detected_genre": "시/소설/수필/기타",
  "explanation": "여기에 해설 내용",
  "mbti": "INFP",
  "chat_version": "여기에 말투",
  "summary": "여기에 요약 (유료 전용)"
}

[메타데이터 추출 규칙]
- 텍스트에서 작품 제목과 작가를 자동으로 인식하세요
- 유명 작품(윤동주의 '서시', 김소월의 '진달래꽃' 등)은 정확히 인식
- 제목/작가/장르 정보가 없으면 '제목 미상', '작가 미상', '기타' 표시

[절대 금지 사항 - JSON 포맷팅]
- JSON의 모든 문자열 값 안에서 이스케이프 되지 않은 큰따옴표(")는 절대 사용하지 마세요. 큰따옴표가 필요할 경우 반드시 작은따옴표(')로 대체하세요.
- 예: "이것은 예시입니다" (X) -> '이것은 예시입니다' (O)

[절대 금지 사항 - 내용]
- 'X됨', '존나', '개~', '쌉~', '광탈' 등 비속어/저속한 줄임말 사용 금지
- 작가의 생애나 전기적 사실 언급 금지 (화자와 작가는 다름)
- MBTI는 반드시 '시적 화자' 기준으로 분석 (작가 아님!)
"""

# --- 초등학생용 ---
ELEMENTARY_BASE = """
당신은 초등학생에게 시를 쉽고 재미있게 알려주는 국어 선생님입니다.

[explanation 작성법]
1. 시의 분위기를 1~2문장으로 설명
2. 핵심 시어 2~3개를 [단어 : 속뜻] 형태로 풀이
   - 중요: '시련', '의지', '고난' 같은 어려운 한자어 금지!
   - 초등학생이 쓰는 쉬운 말로 풀기
   - 예시:
     * '눈' : 주인공을 춥고 힘들게 만드는 '속상한 상황' (O) / 시련 (X)
     * '매화 향기' : 힘든 걸 꾹 참고 이겨내려는 '멋진 마음' (O) / 의지 (X)
3. 교훈을 다정하게 설명
4. 어려운 낱말은 '사탕', '놀이터' 같은 일상 소재로 비유
5. 질문형 문장 금지, 설명 위주로 작성

[mbti]
시 속 화자가 어떤 성격인지 친구처럼 설명

[chat_version]
'럭키비키잖아🍀', '갓생 가보자고!' 같은 귀엽고 긍정적인 초등학생 말투
"""

ELEMENTARY_FREE = ELEMENTARY_BASE + """
- explanation은 3~4문장 정도로 간결하게
"""

ELEMENTARY_PRO = ELEMENTARY_BASE + """
- explanation은 5~6문장으로 더 자세하게, 다양한 예시 포함
- summary: 딱 1문장으로 핵심 요약 (예: "힘든 상황에서도 포기하지 않는 마음이 중요해!")
"""

# --- 중학생용 ---
MIDDLE_BASE = """
당신은 중학생의 내신 시험을 완벽 대비시키는 국어 강사입니다.

[explanation 작성법]
1. 화자의 정서와 태도 분석
2. 지문의 핵심 주제 파악
3. 주요 표현 기법 (비유, 상징, 대립 구조 등) 설명
4. 시험에 자주 나오는 키워드 중심으로 정리
5. 서술형 답안에 포함될 핵심 시어와 정의 명시

[mbti]
시적 화자의 정서적 태도를 근거로 MBTI 추론

[chat_version]
중학생 친구한테 카톡 보내듯 친근하고 활기찬 말투로 작성!
- 반드시 '친구들,' 또는 작품명으로 시작할 것
- 이모지(🌟🔥💥 등)를 3~5개 포함할 것
- '중꺾마', '폼 미쳤다', '실화?', '레전드' 같은 중학생 밈 적극 사용
- 예시 시작: '친구들, [작품명] 이 부분, 시험에 진짜 자주 나와! 🌟'
- 절대 금지: 냉철하고 전문적인 어조, '킬러 포인트', '평가원 관점' 같은 수능 용어 사용 금지
"""

MIDDLE_FREE = MIDDLE_BASE + """
- explanation은 4~5문장으로 깔끔하게
"""

MIDDLE_PRO = MIDDLE_BASE + """
- explanation은 6~7문장으로 심화 분석
  * 시어 간 대립 구조 상세 분석
  * 시상 전개 방식의 논리적 흐름
  * 내신 출제 포인트 강조
- summary: '핵심 소재 / 주제 / 시험 팁' 형식으로 3줄 요약
"""

# --- 고등학생용 (수능 대비) ---
HIGH_BASE = """
당신은 고등학생의 수능 국어를 책임지는 1타 강사입니다.

[explanation 작성법]
1. 평가원 관점의 출제 의도 분석
2. 시어의 상징적 의미를 [시어 ↔ 상징] 구조로 명확히 분석
3. 시어 간 대립 구조와 시상 전개를 논리적으로 설명
4. '보기' 관점의 해석 (시대적 배경, 반영론 등) 포함
5. 서술형 감점 방지 포인트 명시
6. 수능 연계 지문과의 비교 가능성 언급

[mbti]
시적 화자의 상황 대응 방식을 근거로 MBTI 추론 + 전략적 독해법 제시

[chat_version]
냉철하고 전문적인 조언 말투
- 예시: '이 문단이 킬러 포인트임', '여기서 추론 삐끗하면 1등급 날아감'
- 불필요한 농담 배제, 시험 상황 가정
"""

HIGH_FREE = HIGH_BASE + """
- explanation은 5~6문장으로 핵심 위주
"""

HIGH_PRO = HIGH_BASE + """
- explanation은 7~8문장으로 최고 심도 분석
  * 평가원 출제 패턴과 연결
  * 다른 지문과의 연계 가능성
  * 배경 지식 심화 설명
- summary: '핵심 소재 / 주제 / 수능 전략' 형식으로 3줄 요약
  (시험 직전 포스트잇에 적을 내용)
"""

# --- 3. 통합 분석 함수 ---
def analyze_content_with_ai(mode: Mode, is_premium: bool, text: str = None, image_data: bytes = None, retry_count: int = 0):
    """
    텍스트 또는 이미지를 받아 AI 분석 결과를 반환합니다.
    """
    # --- 안전장치: mode가 문자열로 들어올 경우 Enum으로 변환 ---
    if isinstance(mode, str):
        try:
            mode = Mode[mode]
        except KeyError:
            mode = Mode.MIDDLE # 잘못된 값이 오면 기본값 설정
    
    # 모드에 따른 프롬프트 선택
    if mode == Mode.ELEMENTARY:
        system_content = ELEMENTARY_PRO if is_premium else ELEMENTARY_FREE
    elif mode == Mode.MIDDLE or mode == Mode.MIDDLE_HIGH: # 👈 MIDDLE_HIGH를 중등(MIDDLE) 수준으로 처리
        system_content = MIDDLE_PRO if is_premium else MIDDLE_FREE
    elif mode == Mode.HIGH:
        system_content = HIGH_PRO if is_premium else HIGH_FREE
    else:
        # 예외 상황 발생 시 기본값은 MIDDLE로 설정
        system_content = MIDDLE_PRO if is_premium else MIDDLE_FREE

    if retry_count == 0:
        print(f"🚀 [ANALYSIS START] Version: {PROMPT_VERSION} | Mode: {mode.value} | Premium: {is_premium}")

    # 멀티모달 프롬프트 구성
    prompt_parts = [f"{system_content}\n{COMMON_RULE}"]

    # 이미지가 있으면 이미지 객체 추가 (Gemini OCR 활성화)
    if image_data:
        prompt_parts.append({
            "mime_type": "image/jpeg",
            "data": image_data
        })
        prompt_parts.append("이미지 속의 지문을 텍스트로 정확히 인식하고 분석을 진행하세요.")

    # 텍스트가 있으면 추가
    if text:
        prompt_parts.append(f"분석할 지문: {text}")

    if retry_count > 0:
        prompt_parts.append("⚠️ 이전 응답이 품질 미달이었습니다. 더 구체적이고 정확한 JSON으로 재작성하세요.")

    try:
        # 모델 호출
        response = model.generate_content(
            prompt_parts,
            generation_config={"response_mime_type": "application/json"}
        )

        result = json.loads(response.text)

        # [필수 키 정의] - 메타데이터 필드 추가
        required_keys = ["detected_title", "detected_author", "detected_genre", "explanation", "mbti", "chat_version"]
        if is_premium:
            required_keys.append("summary")

        # [수정 핵심: 데이터 가공 및 보정]
        final_result = {}
        for key in required_keys:
            val = result.get(key, "")
            
            # summary가 딕셔너리(객체)로 들어오면 예쁘게 문자열로 변환
            if key == "summary" and isinstance(val, (dict, list)):
                val = json.dumps(val, ensure_ascii=False)
            
            # 값이 아예 없거나 None이면 기본 문구 삽입
            if val is None or val == "":
                if key == "summary":
                    val = "핵심 요약 정보를 구성 중입니다."
                elif key == "detected_title":
                    val = "제목 미상"
                elif key == "detected_author":
                    val = "작가 미상"
                elif key == "detected_genre":
                    val = "기타"
                else:
                    val = "분석 내용을 생성하지 못했습니다."
            
            final_result[key] = val

        # 품질 검증 로직 (설명이 너무 짧으면 재시도)
        is_valid_expl = len(final_result.get("explanation", "")) > 30
        
        if not is_valid_expl and retry_count < 2:
            return analyze_content_with_ai(mode, is_premium, text, image_data, retry_count + 1)

        return final_result # 가공된 딕셔너리 반환

    except Exception as e:
        import traceback
        print(f"❌ [AI_ERROR_DETAIL]\n{traceback.format_exc()}")
        
        fallback = {
            "detected_title": "제목 미상",
            "detected_author": "작가 미상",
            "detected_genre": "기타",
            "explanation": f"오류 발생: {str(e)}",
            "mbti": "분석 불가",
            "chat_version": "다시 시도해 주세요."
        }
        if is_premium: fallback["summary"] = "요약을 불러올 수 없습니다."
        return fallback


# --- 4. 객관식 문제 생성 함수 ---
def generate_multiple_choice(mode: Mode, text: str = None, image_data: bytes = None, title: str = "제목 미상", question_count: int = None):
    """
    작품 텍스트 또는 이미지를 기반으로 학년별 객관식 문제를 생성합니다.
    """
    # 안전장치: mode가 문자열로 들어올 경우 Enum으로 변환
    if isinstance(mode, str):
        try:
            mode = Mode[mode]
        except KeyError:
            mode = Mode.MIDDLE

    # 학년별 설정
    if mode == Mode.ELEMENTARY:
        grade_name = "초등학생"
        num_choices = 4
        default_count = 4
        question_types = "내용 이해, 등장인물, 주요 사건"
        style_guide = "쉽고 친근한 표현, 어려운 한자어 금지"
    elif mode == Mode.MIDDLE or mode == Mode.MIDDLE_HIGH:
        grade_name = "중학생"
        num_choices = 4
        default_count = 5
        question_types = "내용 이해, 표현법(비유/상징), 주제 분석"
        style_guide = "내신 시험 스타일, 핵심 개념 중심"
    else:  # HIGH
        grade_name = "고등학생"
        num_choices = 5
        default_count = 6
        question_types = "수능형 고난도, 추론, 비문학적 분석, 표현법 심화"
        style_guide = "평가원 스타일, 오답률 높은 선지 구성"

    final_count = question_count or default_count

    prompt = f"""
당신은 {grade_name}용 국어 문제 출제 전문가입니다.

[작품 정보]
제목: {title}
{"본문: " + text if text else "이미지를 OCR하여 본문을 인식하세요."}

[출제 요구사항]
- 문제 수: {final_count}개
- 선지 수: {num_choices}지선다
- 출제 유형: {question_types}
- 스타일: {style_guide}

[JSON 형식 - 반드시 준수]
{{
  "detected_title": "AI가 인식한 작품 제목 (인식 불가시 '{title}')",
  "detected_author": "AI가 인식한 작가 이름 (인식 불가시 '작가 미상')",
  "questions": [
    {{
      "id": 1,
      "question": "문제 내용",
      "options": ["선지1", "선지2", "선지3", "선지4"],
      "correct_answer": 1,
      "explanation": "정답 해설",
      "difficulty": "중",
      "question_type": "내용이해"
    }}
  ]
}}

[메타데이터 인식 규칙]
- 텍스트/이미지에서 작품 제목과 작가를 자동으로 인식
- 윤동주의 '서시', 김소월의 '진달래꽃' 등 유명 작품은 정확히 인식
- 인식이 불가능하면 사용자 입력값 또는 '제목 미상', '작가 미상' 사용

[주의사항]
- correct_answer는 1부터 시작하는 정답 번호
- difficulty는 "상", "중", "하" 중 하나
- 모든 선지는 그럴듯하게 구성
- 해설은 왜 정답인지, 왜 오답인지 명확히
"""

    try:
        # 멀티모달 프롬프트 구성
        prompt_parts = [prompt]
        
        # 이미지가 있으면 이미지 객체 추가 (Gemini OCR 활성화)
        if image_data:
            prompt_parts.append({
                "mime_type": "image/jpeg",
                "data": image_data
            })
            prompt_parts.append("위 이미지의 텍스트를 정확히 인식하여 문제를 출제하세요.")
        
        response = model.generate_content(
            prompt_parts,
            generation_config={"response_mime_type": "application/json"}
        )
        result = json.loads(response.text)
        
        # 필수 키 검증
        if "questions" not in result or not isinstance(result["questions"], list):
            raise ValueError("questions 키가 없거나 올바르지 않습니다.")
        
        return result
        
    except Exception as e:
        import traceback
        print(f"❌ [QUESTION_GEN_ERROR]\n{traceback.format_exc()}")
        return {
            "questions": [],
            "error": f"문제 생성 실패: {str(e)}"
        }


# --- 5. 글쓰기 첨삭 함수 ---
def proofread_text(mode: Mode, text: str):
    """
    학생이 작성한 글을 첨삭하여 피드백을 제공합니다.
    Play Track: 친근한 톤 / Pro Track: 전문적 피드백
    """
    # 안전장치: mode가 문자열로 들어올 경우 Enum으로 변환
    if isinstance(mode, str):
        try:
            mode = Mode[mode]
        except KeyError:
            mode = Mode.MIDDLE

    # 학년별 스타일 설정
    if mode == Mode.ELEMENTARY:
        grade_name = "초등학생"
        tone_guide = """
피드백 스타일: 친근하고 격려하는 톤
- '잘 썼어요! 👏' 같은 칭찬으로 시작
- '이렇게 바꾸면 더 좋을 것 같아요~' 같은 부드러운 표현
- 어려운 문법 용어 대신 쉬운 설명
- 이모지 적절히 사용"""
    elif mode == Mode.MIDDLE or mode == Mode.MIDDLE_HIGH:
        grade_name = "중학생"
        tone_guide = """
피드백 스타일: 친근하지만 구체적인 톤
- 잘한 점과 개선점을 균형있게 제시
- 내신 시험과 연결된 조언
- 문법 용어는 간단한 설명과 함께 사용"""
    else:  # HIGH
        grade_name = "고등학생"
        tone_guide = """
피드백 스타일: 전문적이고 구체적인 톤
- 논리 구조와 표현력 중심의 날카로운 피드백
- 수능 논술/서술형 관점에서 조언
- 문법적 오류는 정확한 용어로 지적"""

    prompt = f"""
당신은 {grade_name}의 글쓰기를 첨삭하는 국어 전문가입니다.

[학생이 작성한 글]
{text}

{tone_guide}

[JSON 형식 - 반드시 준수]
{{
  "overall_score": 85,
  "overall_comment": "전체적인 평가 코멘트",
  "spelling_errors": [
    {{"original": "틀린 표현", "corrected": "올바른 표현", "explanation": "왜 틀렸는지 설명"}}
  ],
  "grammar_errors": [
    {{"original": "문법 오류 문장", "corrected": "수정된 문장", "issue": "문제 유형", "explanation": "설명"}}
  ],
  "vocabulary_suggestions": [
    {{"original": "원래 단어", "suggested": "추천 단어", "reason": "이유"}}
  ],
  "structure_feedback": {{
    "strengths": ["잘한 점1", "잘한 점2"],
    "improvements": ["개선점1", "개선점2"],
    "overall_comment": "구조에 대한 전체 코멘트"
  }},
  "corrected_text": "전체 글을 수정한 버전 (원문의 좋은 부분은 유지)"
}}

[주의사항]
- overall_score는 0~100점 사이
- 오류가 없으면 해당 배열은 빈 배열로
- corrected_text는 학생의 원래 의도를 살리면서 수정
- 격려와 구체적 개선점을 함께 제시

[절대 금지 사항 - 반드시 지킬 것]
- 피드백(overall_comment 포함 등) 및 수정된 글(corrected_text)에 '꿀맛', '꿀잼' 등의 단어 절대 사용 금지
- 피드백 시작 시 'Ooo 학생', '지연 학생', '000아' 같이 가상의 이름이나 임의의 호칭을 지어내서 부르지 말 것 (그냥 바로 피드백 내용으로 시작할 것)
- 수정된 글(corrected_text)에는 어떠한 이모지(이모티콘)도 절대 포함하지 말 것 (예: 😊, 👍, ❤️ 등 절대 금지)
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        result = json.loads(response.text)
        
        # 필수 키 확인 및 기본값 설정
        required_keys = ["overall_score", "overall_comment", "spelling_errors", 
                        "grammar_errors", "vocabulary_suggestions", "structure_feedback"]
        for key in required_keys:
            if key not in result:
                if key == "overall_score":
                    result[key] = 70
                elif key in ["spelling_errors", "grammar_errors", "vocabulary_suggestions"]:
                    result[key] = []
                elif key == "structure_feedback":
                    result[key] = {"strengths": [], "improvements": [], "overall_comment": ""}
                else:
                    result[key] = ""
        
        return result
        
    except Exception as e:
        import traceback
        print(f"❌ [PROOFREAD_ERROR]\n{traceback.format_exc()}")
        return {
            "overall_score": 0,
            "overall_comment": f"첨삭 중 오류가 발생했습니다: {str(e)}",
            "spelling_errors": [],
            "grammar_errors": [],
            "vocabulary_suggestions": [],
            "structure_feedback": {"strengths": [], "improvements": [], "overall_comment": ""},
            "error": str(e)
        }


# --- 6. 서술형/논술형 문제 생성 함수 ---
def generate_essay_question(mode: Mode, text: str = None, image_data: bytes = None, title: str = "제목 미상"):
    """
    작품 텍스트 또는 이미지를 기반으로 학년별 서술형/논술형 문제를 생성합니다.
    """
    # 안전장치: mode가 문자열로 들어올 경우 Enum으로 변환
    if isinstance(mode, str):
        try:
            mode = Mode[mode]
        except KeyError:
            mode = Mode.MIDDLE

    # 학년별 설정
    if mode == Mode.ELEMENTARY:
        grade_name = "초등학생"
        word_limit = 200
        question_type = "감상문, 경험과 연결하기"
        style_guide = "쉽고 친근한 표현, 구체적인 예시 포함"
        vocabulary_rule = """
[초등학생용 어휘 규칙 - 반드시 준수]
- 절대 사용 금지 단어: '고독', '비애', '슬픔', '애상', '서러움', '허무', '寂寞', '哀愁' 등 어려운 한자어
- 대체 표현 사용:
  * '고독' → '외로운 마음', '혼자인 느낌'
  * '비애' → '슬픈 마음', '마음이 아픔'
  * '애상' → '슬프고 안타까운 마음'
  * '서정적' → '감정을 표현하는'
  * '화자' → '시 속의 주인공', '글쓴이'
- 키워드는 초등학생이 일상에서 쓰는 단어로만 구성
- 예시: '외로움' 대신 '혼자라서 심심한 마음', '슬픔' 대신 '마음이 아픈 느낌'
- 문제와 힌트도 친근하고 쉬운 말투로 작성
"""
    elif mode == Mode.MIDDLE or mode == Mode.MIDDLE_HIGH:
        grade_name = "중학생"
        word_limit = 400
        question_type = "주장/설명, 비교 분석"
        style_guide = "논리적 구성, 근거 제시 요구"
        vocabulary_rule = ""
    else:  # HIGH
        grade_name = "고등학생"
        word_limit = 600
        question_type = "논술형, 비평적 분석"
        style_guide = "수능/논술 스타일, 서론-본론-결론 구조"
        vocabulary_rule = ""

    prompt = f"""
당신은 {grade_name}용 서술형/논술형 문제 출제 전문가입니다.

[작품 정보]
제목: {title}
{f"본문: {text}" if text else ""}

[출제 요구사항]
- 글자 수 제한: 약 {word_limit}자 내외
- 문제 유형: {question_type}
- 스타일: {style_guide}
{vocabulary_rule}

[JSON 형식 - 반드시 준수]
{{
  "detected_title": "AI가 인식한 작품 제목 (인식 불가시 '{title}')",
  "detected_author": "AI가 인식한 작가 이름 (인식 불가시 '작가 미상')",
  "question": "서술형 문제 내용",
  "word_limit": {word_limit},
  "required_keywords": ["키워드1", "키워드2", "키워드3"],
  "scoring_rubric": {{
    "keyword_score": {{
      "weight": 50,
      "description": "필수 키워드 포함 여부",
      "keywords": [
        {{"word": "키워드1", "points": 15}},
        {{"word": "키워드2", "points": 15}},
        {{"word": "키워드3", "points": 20}}
      ]
    }},
    "structure_score": {{
      "weight": 30,
      "description": "글의 논리적 구조",
      "criteria": ["서론-본론-결론 구성", "문단 연결의 자연스러움"]
    }},
    "expression_score": {{
      "weight": 20,
      "description": "표현력과 문장력",
      "criteria": ["적절한 어휘 사용", "맞춤법 및 문법"]
    }}
  }},
  "sample_answer": "모범답안 전문",
  "hints": ["힌트1", "힌트2"]
}}

[메타데이터 인식 규칙]
- 텍스트/이미지에서 작품 제목과 작가를 자동으로 인식
- 윤동주의 '서시', 김소월의 '진달래꽃' 등 유명 작품은 정확히 인식
- 인식이 불가능하면 사용자 입력값 또는 '제목 미상', '작가 미상' 사용

[주의사항]
- 문제는 작품의 핵심 주제와 연관되게 출제
- required_keywords는 답안에 반드시 포함해야 할 키워드 3~5개
- sample_answer는 {word_limit}자 내외로 작성
- hints는 학생이 글을 쓸 때 참고할 수 있는 팁
"""

    try:
        # 멀티모달 프롬프트 구성
        prompt_parts = [prompt]
        
        # 이미지가 있으면 이미지 객체 추가 (Gemini OCR 활성화)
        if image_data:
            prompt_parts.append({
                "mime_type": "image/jpeg",
                "data": image_data
            })
            prompt_parts.append("위 이미지의 텍스트를 정확히 인식하여 서술형 문제를 출제하세요.")
        
        response = model.generate_content(
            prompt_parts,
            generation_config={"response_mime_type": "application/json"}
        )
        result = json.loads(response.text)
        
        # 필수 키 확인
        required_keys = ["question", "word_limit", "required_keywords", "scoring_rubric", "sample_answer"]
        for key in required_keys:
            if key not in result:
                if key == "word_limit":
                    result[key] = word_limit
                elif key == "required_keywords":
                    result[key] = []
                elif key == "scoring_rubric":
                    result[key] = {}
                else:
                    result[key] = ""
        
        return result
        
    except Exception as e:
        import traceback
        print(f"❌ [ESSAY_QUESTION_ERROR]\n{traceback.format_exc()}")
        return {
            "question": "",
            "word_limit": word_limit,
            "required_keywords": [],
            "scoring_rubric": {},
            "sample_answer": "",
            "hints": [],
            "error": f"문제 생성 실패: {str(e)}"
        }


# --- 7. 서술형/논술형 답안 채점 함수 ---
def grade_essay(question: str, scoring_rubric: dict, student_answer: str, mode: Mode):
    """
    서술형/논술형 답안을 채점합니다.
    Temperature 0.3으로 채점 일관성 확보
    """
    # 안전장치: mode가 문자열로 들어올 경우 Enum으로 변환
    if isinstance(mode, str):
        try:
            mode = Mode[mode]
        except KeyError:
            mode = Mode.MIDDLE

    # 학년별 피드백 스타일
    if mode == Mode.ELEMENTARY:
        feedback_style = "친근하고 격려하는 톤, 구체적인 칭찬"
    elif mode == Mode.MIDDLE or mode == Mode.MIDDLE_HIGH:
        feedback_style = "균형 잡힌 피드백, 개선점 명확히 제시"
    else:
        feedback_style = "전문적이고 객관적인 평가, 수능 기준 적용"

    rubric_str = json.dumps(scoring_rubric, ensure_ascii=False, indent=2)

    prompt = f"""
당신은 국어 서술형 답안 채점 전문가입니다.

[문제]
{question}

[채점 기준]
{rubric_str}

[학생 답안]
{student_answer}

[피드백 스타일]
{feedback_style}

[JSON 형식 - 반드시 준수]
{{
  "total_score": 85,
  "keyword_analysis": {{
    "score": 42,
    "max_score": 50,
    "found_keywords": ["발견된 키워드1", "발견된 키워드2"],
    "missing_keywords": ["누락된 키워드"],
    "feedback": "키워드 분석 피드백"
  }},
  "structure_analysis": {{
    "score": 25,
    "max_score": 30,
    "has_intro": true,
    "has_body": true,
    "has_conclusion": false,
    "feedback": "구조 분석 피드백"
  }},
  "expression_analysis": {{
    "score": 18,
    "max_score": 20,
    "feedback": "표현력 분석 피드백"
  }},
  "overall_feedback": "전체 종합 피드백",
  "strengths": ["잘한 점1", "잘한 점2"],
  "improvements": ["개선할 점1", "개선할 점2"]
}}

[주의사항]
- total_score는 각 영역 점수의 합계 (100점 만점)
- 채점은 객관적이고 일관되게
- 피드백은 구체적이고 건설적으로
"""

    try:
        # Temperature 0.3으로 채점 일관성 확보
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.3
            }
        )
        result = json.loads(response.text)
        
        # 필수 키 확인 및 기본값 설정
        if "total_score" not in result:
            result["total_score"] = 0
        if "keyword_analysis" not in result:
            result["keyword_analysis"] = {"score": 0, "max_score": 50, "found_keywords": [], "missing_keywords": [], "feedback": ""}
        if "structure_analysis" not in result:
            result["structure_analysis"] = {"score": 0, "max_score": 30, "has_intro": False, "has_body": False, "has_conclusion": False, "feedback": ""}
        if "expression_analysis" not in result:
            result["expression_analysis"] = {"score": 0, "max_score": 20, "feedback": ""}
        if "overall_feedback" not in result:
            result["overall_feedback"] = ""
        if "strengths" not in result:
            result["strengths"] = []
        if "improvements" not in result:
            result["improvements"] = []
        
        return result
        
    except Exception as e:
        import traceback
        print(f"❌ [ESSAY_GRADING_ERROR]\n{traceback.format_exc()}")
        return {
            "total_score": 0,
            "keyword_analysis": {"score": 0, "max_score": 50, "found_keywords": [], "missing_keywords": [], "feedback": ""},
            "structure_analysis": {"score": 0, "max_score": 30, "has_intro": False, "has_body": False, "has_conclusion": False, "feedback": ""},
            "expression_analysis": {"score": 0, "max_score": 20, "feedback": ""},
            "overall_feedback": f"채점 중 오류가 발생했습니다: {str(e)}",
            "strengths": [],
            "improvements": [],
            "error": str(e)
        }