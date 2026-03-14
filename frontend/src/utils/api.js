import axios from "axios";

// 1. 공통 인스턴스 생성
const api = axios.create({
  baseURL: "http://localhost:8000", // 서버 주소
});

// 2. 인터셉터: 모든 요청에 토큰 자동 삽입
// 이제 모든 함수에서 'token'을 인자로 일일이 안 넘겨도 됩니다.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 3. 응답 인터셉터: 401 응답 시 로그아웃 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

/**
 * [API 함수들]
 * 기존 fetch 방식에서 -> api(axios) 방식으로 변경
 */

// 🔐 로그인
export const login = async (username, password) => {
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);

  // axios는 두 번째 인자가 데이터, 세 번째가 설정입니다.
  const response = await api.post("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data; // axios는 결과가 data 안에 담겨 있습니다.
};

// 👤 내 정보 가져오기 (마이페이지용)
export const getMyInfo = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// 📝 텍스트 분석
export const analyzeText = async (data) => {
  // interceptor 덕분에 token 인자가 필요 없습니다.
  const response = await api.post("/analyze", data);
  return response.data;
};

// 📷 이미지 분석
export const analyzeImage = async (formData) => {
  const response = await api.post("/analyze/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// 📋 분석 목록 조회
export const getContentList = async (search = "") => {
  const response = await api.get("/contents/list", {
    params: { search: search }, // 쿼리 스트링(?search=...) 자동 생성
  });
  return response.data;
};

export default api;

// 🔍 분석 상세 조회
export const getContentDetail = async (id) => {
  const response = await api.get(`/contents/detail/${id}`);
  return response.data;
};

// 🗑️ 분석 기록 삭제
export const deleteContent = async (id) => {
  // interceptor가 토큰을 자동으로 넣어주므로 id만 받으면 됩니다.
  const response = await api.delete(`/contents/${id}`);
  return response.data;
};

// 📝 객관식 문제 생성
export const generateQuestions = async (data) => {
  const response = await api.post("/practice/generate-questions", data);
  return response.data;
};

// 📷 이미지 기반 객관식 문제 생성
export const generateQuestionsFromImage = async (formData) => {
  const response = await api.post(
    "/practice/generate-questions/image",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};

// ✍️ 글쓰기 첨삭
export const proofreadText = async (data) => {
  const response = await api.post("/practice/proofread", data);
  return response.data;
};

// 📖 서술형 문제 생성
export const generateEssayQuestion = async (data) => {
  const response = await api.post("/practice/generate-essay", data);
  return response.data;
};

// 📖 서술형 문제 생성 (이미지)
export const generateEssayQuestionFromImage = async (formData) => {
  const response = await api.post("/practice/generate-essay/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// 📝 서술형 답안 채점
export const gradeEssay = async (data) => {
  const response = await api.post("/practice/grade-essay", data);
  return response.data;
};

// 📋 연습 기록 조회
export const getPracticeHistory = async (practiceType = null, limit = 20) => {
  const params = { limit };
  if (practiceType) params.practice_type = practiceType;
  const response = await api.get("/practice/history", { params });
  return response.data;
};

// 📋 연습 상세 조회
export const getPracticeDetail = async (sessionId) => {
  const response = await api.get(`/practice/history/${sessionId}`);
  return response.data;
};

// 📝 객관식/서술형 전체 채점 결과 저장
export const submitPractice = async (data) => {
  const response = await api.post("/practice/submit", data);
  return response.data;
};

// 📋 통합 기록 조회 (분석 + 연습)
export const getAllRecords = async (recordType = null, limit = 30) => {
  const params = { limit };
  if (recordType) params.record_type = recordType;
  const response = await api.get("/records/all", { params });
  return response.data;
};

// 🗑️ 연습 기록 삭제
export const deletePracticeSession = async (sessionId) => {
  const response = await api.delete(`/practice/history/${sessionId}`);
  return response.data;
};
