"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  generateQuestions,
  generateQuestionsFromImage,
  getMyInfo,
  submitPractice,
  getContentList,
} from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function MultipleChoicePage() {
  useAuth();
  const router = useRouter();
  const { track, isDarkMode, getDefaultGrade, isLoaded } = useTrack();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [inputMode, setInputMode] = useState("text"); // "text" or "image"
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [contentList, setContentList] = useState([]);
  const [selectedContentId, setSelectedContentId] = useState("");

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

  const handleGenerate = async () => {
    if (!selectedContentId) {
      setError("연습할 작품을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setShowResults(false);

    try {
      const result = await generateQuestions({
        content_id: parseInt(selectedContentId),
        practice_type: "객관식"
      });

      if (result.status === "success" && result.data?.questions) {
        setQuestions(result.data.questions);
        if (result.session_id) setSessionId(result.session_id);
      } else {
        setError(result.data?.error || "문제 생성에 실패했습니다.");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "문제 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 이미지 기반 문제 생성
  const handleImageGenerate = async () => {
    if (!file) {
      setError("이미지 파일을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setShowResults(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || "제목 미상");
      formData.append("mode", grade);

      const result = await generateQuestionsFromImage(formData);

      if (result.status === "success" && result.data?.questions) {
        setQuestions(result.data.questions);
        if (result.session_id) setSessionId(result.session_id);
      } else {
        setError(result.data?.error || "문제 생성에 실패했습니다.");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "이미지 문제 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex, answerIndex) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleSubmit = async () => {
    setShowResults(true);

    // 채점 결과 저장 API 호출
    if (sessionId && questions.length > 0) {
      try {
        const answersData = questions.map((q, index) => ({
          question_index: index,
          question_type: "multiple_choice",
          user_answer: String(answers[index] || ""),
          correct_answer: String(q.correct_answer || ""),
          score: answers[index] === q.correct_answer ? 100 : 0,
          is_correct: answers[index] === q.correct_answer,
          time_spent: 0
        }));

        await submitPractice({
          session_id: sessionId,
          answers: answersData,
        });
        console.log("✅ 채점 결과 저장 완료");
      } catch (err) {
        console.error("채점 결과 저장 실패:", err);
      }
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correct_answer) correct++;
    });
    return correct;
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

  return (
    <main className={`min-h-screen p-8 ${bgClass} ${textClass}`}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className={`mb-6 hover:underline ${
            isPlayTrack
              ? "text-purple-500"
              : isDarkMode
                ? "text-blue-400"
                : "text-blue-600"
          }`}
        >
          ← 뒤로 가기
        </button>

        <h1
          className={`text-3xl font-bold mb-6 ${isPlayTrack ? "text-pink-500" : ""}`}
        >
          {isPlayTrack ? "📝 퀴즈 풀기" : "📝 객관식 문제 연습"}
        </h1>

        {/* 입력 영역 */}
        {questions.length === 0 && (
          <div className={`p-6 mb-6 ${cardClass}`}>
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
                onClick={handleGenerate}
                disabled={loading || !selectedContentId}
                className={`w-full py-3 rounded-xl font-bold transition-all ${buttonClass} disabled:opacity-50`}
              >
                {loading ? "🔍 문제 생성 중..." : "🚀 문제 만들기"}
              </button>
            )}

            {/* 이미지 모드 버튼 */}
            {inputMode === "image" && (
              <button
                onClick={handleImageGenerate}
                disabled={loading || !file}
                className={`w-full py-3 rounded-xl font-bold transition-all ${buttonClass} disabled:opacity-50`}
              >
                {loading ? "🔍 이미지 분석 중..." : "📸 이미지로 문제 만들기"}
              </button>
            )}
          </div>
        )}

        {/* 문제 표시 */}
        {questions.length > 0 && (
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={index} className={`p-6 ${cardClass}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">
                    {index + 1}. {q.question}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      q.difficulty === "상"
                        ? "bg-red-100 text-red-600"
                        : q.difficulty === "중"
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-green-100 text-green-600"
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>

                <div className="space-y-2">
                  {q.options.map((option, optIndex) => {
                    const optionNum = optIndex + 1;
                    const isSelected = answers[index] === optionNum;
                    const isCorrect = q.correct_answer === optionNum;

                    let optionStyle = isPlayTrack
                      ? "border-pink-200 hover:border-pink-400"
                      : isDarkMode
                        ? "border-neutral-700 hover:border-neutral-500"
                        : "border-gray-200 hover:border-gray-400";

                    if (showResults) {
                      if (isCorrect) {
                        optionStyle = isDarkMode 
                          ? "border-green-500 bg-green-900/30 text-green-400"
                          : "border-green-500 bg-green-50 text-green-700";
                      } else if (isSelected && !isCorrect) {
                        optionStyle = isDarkMode
                          ? "border-red-500 bg-red-900/30 text-red-400"
                          : "border-red-500 bg-red-50 text-red-700";
                      }
                    } else if (isSelected) {
                      optionStyle = isPlayTrack
                        ? "border-purple-500 bg-purple-50"
                        : isDarkMode
                          ? "border-blue-500 bg-blue-900/20 text-blue-400"
                          : "border-blue-500 bg-blue-50";
                    }

                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleAnswer(index, optionNum)}
                        disabled={showResults}
                        className={`w-full text-left p-3 border-2 rounded-lg transition-all ${optionStyle}`}
                      >
                        <span className="font-bold mr-2">{optionNum}.</span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* 해설 표시 */}
                {showResults && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      isPlayTrack
                        ? "bg-purple-50 border border-purple-200"
                        : isDarkMode
                          ? "bg-slate-800 border border-slate-700"
                          : "bg-blue-50 border border-blue-200"
                    }`}
                  >
                    <p className="font-bold mb-1">
                      {answers[index] === q.correct_answer
                        ? "✅ 정답!"
                        : "❌ 오답"}
                    </p>
                    <p
                      className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* 제출/결과 버튼 */}
            <div className={`p-6 text-center ${cardClass}`}>
              {!showResults ? (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length !== questions.length}
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${buttonClass} disabled:opacity-50`}
                >
                  {Object.keys(answers).length === questions.length
                    ? "📊 채점하기"
                    : `${Object.keys(answers).length}/${questions.length} 문제 선택됨`}
                </button>
              ) : (
                <div>
                  <p className="text-2xl font-bold mb-4">
                    {isPlayTrack ? "🎉 " : ""}
                    {calculateScore()} / {questions.length} 문제 정답!
                  </p>
                  <button
                    onClick={() => {
                      setQuestions([]);
                      setAnswers({});
                      setShowResults(false);
                      setFile(null);
                      setInputMode("text");
                      setSessionId(null);
                    }}
                    className={`px-6 py-2 rounded-lg font-bold ${buttonClass}`}
                  >
                    다시 풀기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
