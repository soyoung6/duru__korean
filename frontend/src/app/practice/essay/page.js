"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  generateEssayQuestion,
  generateEssayQuestionFromImage,
  gradeEssay,
  getMyInfo,
  getContentList,
} from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function EssayPage() {
  useAuth();
  const router = useRouter();
  const { track, isDarkMode, getDefaultGrade, isLoaded } = useTrack();

  // 입력 상태
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState(null);
  const [inputMode, setInputMode] = useState("text"); // "text" or "image"

  // 문제 및 답안 상태
  const [question, setQuestion] = useState(null);
  const [sessionId, setSessionId] = useState(null); // 연습 기록 저장용
  const [studentAnswer, setStudentAnswer] = useState("");
  const [gradingResult, setGradingResult] = useState(null);
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const [contentList, setContentList] = useState([]);
  const [selectedContentId, setSelectedContentId] = useState("");

  // UI 상태
  const [step, setStep] = useState("input"); // input, question, grading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  const grade = getDefaultGrade();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await getMyInfo();
        setUserInfo(data.data);
      } catch (err) {
        console.error("유저 정보 로드 실패", err);
      }
    };
    
    const fetchContents = async () => {
      try {
        const res = await getContentList();
        if (res.status === "success" && res.data) {
          setContentList(res.data);
        }
      } catch (err) {
        console.error("작품 목록 로드 실패", err);
      }
    };

    fetchUserInfo();
    fetchContents();
  }, []);

  // 텍스트 유효성 검사 함수
  const validateTextInput = (inputText) => {
    const trimmed = inputText.trim();

    // 최소 글자 수 검사 (20자 이상)
    if (trimmed.length < 20) {
      return {
        valid: false,
        message: "작품 본문이 너무 짧습니다. 최소 20자 이상 입력해주세요.",
      };
    }

    // 의미 없는 반복 문자 검사 (같은 문자가 50% 이상)
    const charCounts = {};
    const cleanText = trimmed.replace(/\s/g, "");
    for (const char of cleanText) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(charCounts));
    if (maxCount / cleanText.length > 0.5) {
      return { valid: false, message: "의미 있는 작품 본문을 입력해주세요." };
    }

    return { valid: true };
  };

  // 문제 생성 (텍스트)
  const handleGenerateQuestion = async () => {
    if (!selectedContentId) {
      setError("연습할 작품을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await generateEssayQuestion({
        content_id: parseInt(selectedContentId),
        practice_type: "서술형",
      });

      if (response.status === "success" && response.data) {
        // 문제 생성 결과 검증
        if (!response.data.question || response.data.question.trim() === "") {
          setError("문제 생성에 실패했습니다. 다른 작품으로 시도해주세요.");
          return;
        }
        setQuestion(response.data);
        setSessionId(response.session_id); // 세션 ID 저장
        setStep("question");
      } else {
        setError(response.data?.error || "문제 생성에 실패했습니다.");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "문제 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 문제 생성 (이미지)
  const handleImageGenerateQuestion = async () => {
    if (!file) {
      setError("이미지 파일을 선택해주세요.");
      return;
    }

    // 파일 크기 검사 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      setError("이미지 파일이 너무 큽니다. 10MB 이하의 파일을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || "제목 미상");
      formData.append("author", author || "작가 미상");
      formData.append("mode", grade);

      const response = await generateEssayQuestionFromImage(formData);

      if (response.status === "success" && response.data) {
        // 문제 생성 결과 검증
        if (!response.data.question || response.data.question.trim() === "") {
          setError(
            "⚠️ 이미지에서 작품을 인식하지 못했습니다.\n\n다음 사항을 확인해주세요:\n• 글씨가 선명하게 보이는 사진인가요?\n• 작품 본문이 충분히 포함되어 있나요?\n• 다른 이미지로 다시 시도해주세요.",
          );
          return;
        }
        setQuestion(response.data);
        if (response.session_id) setSessionId(response.session_id);
        setStep("question");
      } else {
        setError(
          response.data?.error ||
            "이미지에서 문제를 생성하지 못했습니다. 다른 이미지로 시도해주세요.",
        );
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "이미지 분석 중 오류가 발생했습니다.";
      setError(
        `⚠️ ${errorMessage}\n\n이미지가 선명한지 확인하고 다시 시도해주세요.`,
      );
    } finally {
      setLoading(false);
    }
  };

  // 답안 채점
  const handleGradeAnswer = async () => {
    const trimmedAnswer = studentAnswer.trim();

    // 최소 글자 수 검증 (30자 이상)
    if (!trimmedAnswer) {
      setError("답안을 작성해주세요.");
      return;
    }

    if (trimmedAnswer.length < 30) {
      setError("답안이 너무 짧습니다. 최소 30자 이상 작성해주세요.");
      return;
    }

    // 의미 없는 반복 문자 검사 (같은 문자가 50% 이상)
    const charCounts = {};
    for (const char of trimmedAnswer.replace(/\s/g, "")) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(charCounts));
    if (maxCount / trimmedAnswer.replace(/\s/g, "").length > 0.5) {
      setError("의미 있는 답안을 작성해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await gradeEssay({
        session_id: sessionId,
        question: question.question,
        scoring_rubric: question.scoring_rubric,
        student_answer: studentAnswer,
        sample_answer: question.sample_answer || "",
        mode: grade,
      });

      if (response.status === "success" && response.data) {
        setGradingResult(response.data);
        setStep("grading");
      } else {
        setError(response.data?.error || "채점에 실패했습니다.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "채점 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 처음부터 다시하기
  const handleReset = () => {
    setText("");
    setTitle("");
    setAuthor("");
    setFile(null);
    setInputMode("text");
    setQuestion(null);
    setSessionId(null); // 세션 ID 초기화
    setStudentAnswer("");
    setGradingResult(null);
    setShowSampleAnswer(false);
    setStep("input");
    setError("");
  };

  if (!isLoaded) return <div className="p-8 text-center">로딩 중...</div>;

  const isPlayTrack = track === "play";

  const bgClass = isPlayTrack
    ? "bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50"
    : isDarkMode
      ? "bg-neutral-950"
      : "bg-gray-50";

  const textClass = isPlayTrack
    ? "text-purple-800"
    : isDarkMode
      ? "text-gray-100"
      : "text-gray-900";

  const cardClass = isPlayTrack
    ? "bg-white border-2 border-pink-200 rounded-2xl"
    : isDarkMode
      ? "bg-neutral-900 border border-neutral-800 rounded-xl"
      : "bg-white border border-gray-200 rounded-xl";

  const inputClass = isPlayTrack
    ? "border-2 border-pink-200 focus:border-pink-400 rounded-xl"
    : isDarkMode
      ? "bg-neutral-800 border-neutral-700 text-gray-100 rounded-lg"
      : "border-gray-300 rounded-lg";

  const buttonClass = isPlayTrack
    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500"
    : "bg-blue-500 text-white hover:bg-blue-600";

  const accentColor = isPlayTrack
    ? "text-pink-500"
    : isDarkMode
      ? "text-blue-400"
      : "text-blue-600";

  return (
    <main className={`min-h-screen p-8 ${bgClass} ${textClass}`}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className={`mb-6 hover:underline ${accentColor}`}
        >
          ← 뒤로 가기
        </button>

        <h1
          className={`text-3xl font-bold mb-6 ${isPlayTrack ? "text-pink-500" : ""}`}
        >
          {isPlayTrack ? "📖 긴 글쓰기" : "📖 서술형/논술형 연습"}
        </h1>

        {/* Step 1: 작품 입력 */}
        {step === "input" && (
          <div className={`p-6 ${cardClass}`}>
            {/* 입력 모드 탭 */}
            <div className="flex mb-6 border-b">
              <button
                onClick={() => setInputMode("text")}
                className={`flex-1 py-3 font-bold transition-all ${
                  inputMode === "text"
                    ? isPlayTrack
                      ? "text-pink-500 border-b-2 border-pink-500"
                      : "text-blue-500 border-b-2 border-blue-500"
                    : isDarkMode
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                }`}
              >
                ✍️ 텍스트 입력
              </button>
              <button
                onClick={() => setInputMode("image")}
                className={`flex-1 py-3 font-bold transition-all ${
                  inputMode === "image"
                    ? isPlayTrack
                      ? "text-pink-500 border-b-2 border-pink-500"
                      : "text-blue-500 border-b-2 border-blue-500"
                    : isDarkMode
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                }`}
              >
                📷 이미지 업로드
              </button>
            </div>

            {/* 작품 제목 (공통) */}
            <div className="mb-4">
              <label className="block font-bold mb-2">작품 제목 (선택)</label>
              <input
                type="text"
                className={`w-full p-3 outline-none ${inputClass}`}
                placeholder="예: 서시"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* 작가 (공통) */}
            <div className="mb-4">
              <label className="block font-bold mb-2">작가 (선택)</label>
              <input
                type="text"
                className={`w-full p-3 outline-none ${inputClass}`}
                placeholder="예: 윤동주"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            {/* 텍스트 입력 모드 (기존 입력 -> 선택) */}
            {inputMode === "text" && (
              <div className="mb-4">
                <label className="block font-bold mb-2">연습할 작품 선택 (분석 내역에서 불러오기)</label>
                <select
                  className={`w-full p-3 outline-none ${inputClass}`}
                  value={selectedContentId}
                  onChange={(e) => setSelectedContentId(e.target.value)}
                >
                  <option value="">작품을 선택해주세요</option>
                  {contentList.map((content) => (
                    <option key={content.id} value={content.id}>
                      {content.title} ({content.author}) - {new Date(content.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {contentList.length === 0 && (
                  <p className="text-sm mt-2 text-red-500">
                    아직 분석된 작품이 없습니다. 먼저 작품 분석을 진행해주세요.
                  </p>
                )}
              </div>
            )}

            {/* 이미지 업로드 모드 */}
            {inputMode === "image" && (
              <div className="mb-4">
                <label className="block font-bold mb-2">
                  교과서/문제집 사진
                </label>
                <div
                  className={`p-6 rounded-xl border-2 border-dashed text-center ${
                    isPlayTrack
                      ? "border-pink-300 bg-pink-50"
                      : isDarkMode
                        ? "border-neutral-600 bg-neutral-800"
                        : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <p
                    className={`mb-3 text-sm ${
                      isPlayTrack
                        ? "text-purple-500"
                        : isDarkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                    }`}
                  >
                    {isPlayTrack
                      ? "📚 교과서나 문제집 사진을 올려주세요!"
                      : "시, 소설, 수필 등의 본문이 담긴 이미지를 업로드하세요"}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-bold ${
                      isPlayTrack
                        ? "text-purple-600 file:bg-pink-200 file:text-pink-700 hover:file:bg-pink-300"
                        : isDarkMode
                          ? "text-gray-400 file:bg-slate-700 file:text-blue-400 hover:file:bg-slate-600"
                          : "text-gray-600 file:bg-blue-100 file:text-blue-600 hover:file:bg-blue-200"
                    }`}
                  />
                  {file && (
                    <p
                      className={`mt-3 text-sm font-medium ${
                        isPlayTrack ? "text-pink-600" : "text-green-600"
                      }`}
                    >
                      ✅ {file.name} 선택됨
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 mb-4 bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 텍스트 모드 버튼 */}
            {inputMode === "text" && (
              <button
                onClick={handleGenerateQuestion}
                disabled={loading || !selectedContentId}
                className={`w-full py-3 rounded-xl font-bold transition-all ${buttonClass} disabled:opacity-50`}
              >
                {loading ? "🔍 문제 생성 중..." : "🚀 서술형 문제 만들기"}
              </button>
            )}

            {/* 이미지 모드 버튼 */}
            {inputMode === "image" && (
              <button
                onClick={handleImageGenerateQuestion}
                disabled={loading || !file}
                className={`w-full py-3 rounded-xl font-bold transition-all ${buttonClass} disabled:opacity-50`}
              >
                {loading ? "🔍 이미지 분석 중..." : "📸 이미지로 문제 만들기"}
              </button>
            )}
          </div>
        )}

        {/* Step 2: 문제 풀기 */}
        {step === "question" && question && (
          <div className="space-y-6">
            {/* 문제 카드 */}
            <div className={`p-6 ${cardClass}`}>
              <h2 className={`text-xl font-bold mb-4 ${accentColor}`}>
                📝 문제
              </h2>
              <p
                className={`text-lg mb-4 ${isDarkMode ? "text-gray-200" : ""}`}
              >
                {question.question}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`text-sm px-3 py-1 rounded-full ${
                    isPlayTrack
                      ? "bg-pink-100 text-pink-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  글자 수: 약 {question.word_limit}자 내외
                </span>
                {question.required_keywords?.map((kw, idx) => (
                  <span
                    key={idx}
                    className={`text-sm px-3 py-1 rounded-full ${
                      isPlayTrack
                        ? "bg-purple-100 text-purple-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    #{kw}
                  </span>
                ))}
              </div>
              {question.hints?.length > 0 && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    isDarkMode ? "bg-neutral-800" : "bg-gray-50"
                  }`}
                >
                  <p className="font-bold mb-1">💡 힌트</p>
                  <ul className="list-disc list-inside">
                    {question.hints.map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 답안 작성 */}
            <div className={`p-6 ${cardClass}`}>
              <h2 className={`text-xl font-bold mb-4 ${accentColor}`}>
                ✍️ 내 답안
              </h2>
              <textarea
                className={`w-full h-60 p-4 outline-none resize-none ${inputClass}`}
                placeholder="여기에 답안을 작성하세요..."
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
              />
              <div className="flex justify-between items-center mt-2">
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  글자 수: {studentAnswer.length}자
                </span>
                <button
                  onClick={() => setShowSampleAnswer(!showSampleAnswer)}
                  className={`text-sm ${accentColor} hover:underline`}
                >
                  {showSampleAnswer ? "모범답안 숨기기" : "모범답안 보기 👀"}
                </button>
              </div>

              {showSampleAnswer && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    isPlayTrack
                      ? "bg-pink-50 border border-pink-200"
                      : isDarkMode
                        ? "bg-slate-800 border border-slate-700"
                        : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <p className="font-bold mb-2">📚 모범답안</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {question.sample_answer}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGradeAnswer}
              disabled={loading || !studentAnswer.trim()}
              className={`w-full py-3 rounded-xl font-bold transition-all ${buttonClass} disabled:opacity-50`}
            >
              {loading ? "🔍 채점 중..." : "📊 채점하기"}
            </button>
          </div>
        )}

        {/* Step 3: 채점 결과 */}
        {step === "grading" && gradingResult && (
          <div className="space-y-6">
            {/* 총점 */}
            <div className={`p-6 text-center ${cardClass}`}>
              <p
                className={`text-5xl font-bold mb-2 ${
                  gradingResult.total_score >= 80
                    ? "text-green-500"
                    : gradingResult.total_score >= 60
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {gradingResult.total_score}점
              </p>
              <p className={isDarkMode ? "text-gray-300" : "text-black font-medium"}>
                {gradingResult.overall_feedback}
              </p>
            </div>

            {/* 키워드 분석 */}
            <div className={`p-6 ${cardClass}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`font-bold ${accentColor}`}>🔑 키워드 분석</h3>
                <span className="font-bold">
                  {gradingResult.keyword_analysis?.score} /{" "}
                  {gradingResult.keyword_analysis?.max_score}점
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {gradingResult.keyword_analysis?.found_keywords?.map(
                  (kw, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm"
                    >
                      ✅ {kw}
                    </span>
                  ),
                )}
                {gradingResult.keyword_analysis?.missing_keywords?.map(
                  (kw, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm"
                    >
                      ❌ {kw}
                    </span>
                  ),
                )}
              </div>
              <p
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {gradingResult.keyword_analysis?.feedback}
              </p>
            </div>

            {/* 구조 분석 */}
            <div className={`p-6 ${cardClass}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`font-bold ${accentColor}`}>🏗️ 글 구조</h3>
                <span className="font-bold">
                  {gradingResult.structure_analysis?.score} /{" "}
                  {gradingResult.structure_analysis?.max_score}점
                </span>
              </div>
              <div className="flex gap-4 mb-3">
                <span
                  className={
                    gradingResult.structure_analysis?.has_intro
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {gradingResult.structure_analysis?.has_intro ? "✅" : "❌"}{" "}
                  서론
                </span>
                <span
                  className={
                    gradingResult.structure_analysis?.has_body
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {gradingResult.structure_analysis?.has_body ? "✅" : "❌"}{" "}
                  본론
                </span>
                <span
                  className={
                    gradingResult.structure_analysis?.has_conclusion
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {gradingResult.structure_analysis?.has_conclusion
                    ? "✅"
                    : "❌"}{" "}
                  결론
                </span>
              </div>
              <p
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {gradingResult.structure_analysis?.feedback}
              </p>
            </div>

            {/* 표현력 분석 */}
            <div className={`p-6 ${cardClass}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`font-bold ${accentColor}`}>✨ 표현력</h3>
                <span className="font-bold">
                  {gradingResult.expression_analysis?.score} /{" "}
                  {gradingResult.expression_analysis?.max_score}점
                </span>
              </div>
              <p
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {gradingResult.expression_analysis?.feedback}
              </p>
            </div>

            {/* 잘한 점 / 개선점 */}
            <div className={`p-6 ${cardClass}`}>
              {gradingResult.strengths?.length > 0 && (
                <div className="mb-4">
                  <p className="font-bold text-green-600 mb-2">✅ 잘한 점</p>
                  <ul className="list-disc list-inside space-y-1">
                    {gradingResult.strengths.map((s, idx) => (
                      <li
                        key={idx}
                        className={isDarkMode ? "text-gray-300" : "text-black font-medium"}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {gradingResult.improvements?.length > 0 && (
                <div>
                  <p className="font-bold text-orange-600 mb-2">💪 개선할 점</p>
                  <ul className="list-disc list-inside space-y-1">
                    {gradingResult.improvements.map((s, idx) => (
                      <li
                        key={idx}
                        className={isDarkMode ? "text-gray-300" : "text-black font-medium"}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 모범답안 */}
            {question?.sample_answer && (
              <div className={`p-6 ${cardClass}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`font-bold ${accentColor}`}>📚 모범답안</h3>
                  <button
                    onClick={() => setShowSampleAnswer(!showSampleAnswer)}
                    className={`text-sm ${accentColor} hover:underline`}
                  >
                    {showSampleAnswer ? "접기" : "펼치기"}
                  </button>
                </div>
                {showSampleAnswer && (
                  <div
                    className={`p-4 rounded-lg whitespace-pre-wrap text-sm ${
                      isPlayTrack
                        ? "bg-pink-50 text-gray-800"
                        : isDarkMode
                          ? "bg-neutral-800 text-gray-200"
                          : "bg-blue-50 text-gray-800"
                    }`}
                  >
                    {question.sample_answer}
                  </div>
                )}
              </div>
            )}

            {/* 다시하기 버튼 */}
            <div className="text-center">
              <button
                onClick={handleReset}
                className={`px-8 py-3 rounded-xl font-bold ${buttonClass}`}
              >
                새 문제 풀기
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
