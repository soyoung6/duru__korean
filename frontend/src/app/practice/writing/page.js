"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { proofreadText, getMyInfo } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function WritingPage() {
  useAuth();
  const router = useRouter();
  const { track, isDarkMode, getDefaultGrade, isLoaded } = useTrack();

  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
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
    fetchUserInfo();
  }, []);

  const handleProofread = async () => {
    if (!text.trim()) {
      setError("첨삭받을 글을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await proofreadText({
        text,
        mode: grade,
      });

      if (response.status === "success" && response.data) {
        setResult(response.data);
      } else {
        setError(response.data?.error || "첨삭에 실패했습니다.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "첨삭 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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
          {isPlayTrack ? "✍️ 글쓰기 도우미" : "✍️ AI 글쓰기 첨삭"}
        </h1>

        {/* 입력 영역 */}
        {!result && (
          <div className={`p-6 mb-6 ${cardClass}`}>
            <div className="mb-4">
              <label className="block font-bold mb-2">
                {isPlayTrack ? "내가 쓴 글" : "첨삭받을 글"}
              </label>
              <textarea
                className={`w-full h-60 p-4 outline-none resize-none ${inputClass}`}
                placeholder={
                  isPlayTrack
                    ? "여기에 글을 써보세요! AI 선생님이 도와줄게요 ✨"
                    : "첨삭받을 글을 입력하세요. 맞춤법, 문법, 어휘, 문장 구조를 분석해드립니다."
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p
                className={`text-sm mt-2 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                글자 수: {text.length}자
              </p>
            </div>
            {error && (
              <div className="p-3 mb-4 bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleProofread}
              disabled={loading || !text.trim()}
              className={`w-full py-3 rounded-xl font-bold transition-all ${buttonClass} disabled:opacity-50`}
            >
              {loading
                ? isPlayTrack
                  ? "🔍 선생님이 읽는 중..."
                  : "🔍 첨삭 중..."
                : isPlayTrack
                  ? "🚀 첨삭 받기!"
                  : "🚀 AI 첨삭 시작"}
            </button>
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <div className="space-y-6">
            {/* 점수 카드 */}
            <div className={`p-6 text-center ${cardClass}`}>
              <p
                className={`text-5xl font-bold mb-2 ${
                  result.overall_score >= 80
                    ? "text-green-500"
                    : result.overall_score >= 60
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {result.overall_score}점
              </p>
              <p className={isPlayTrack ? "text-gray-800 font-medium" : isDarkMode ? "text-gray-300" : "text-black font-medium"}>
                {result.overall_comment}
              </p>
            </div>

            {/* 맞춤법 오류 */}
            {result.spelling_errors?.length > 0 && (
              <div className={`p-6 ${cardClass}`}>
                <h3 className={`font-bold mb-4 ${accentColor}`}>
                  📝 맞춤법 오류
                </h3>
                <div className="space-y-3">
                  {result.spelling_errors.map((err, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        isPlayTrack
                          ? "bg-pink-50 text-gray-800"
                          : isDarkMode
                            ? "bg-neutral-800 text-gray-200"
                            : "bg-gray-50 text-gray-800"
                      }`}
                    >
                      <p>
                        <span className="text-red-500 line-through font-bold">
                          {err.original}
                        </span>
                        {" → "}
                        <span className="text-green-500 font-bold">
                          {err.corrected}
                        </span>
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                           isPlayTrack ? "text-gray-800 font-medium" :
                           isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {err.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 문법 오류 */}
            {result.grammar_errors?.length > 0 && (
              <div className={`p-6 ${cardClass}`}>
                <h3 className={`font-bold mb-4 ${accentColor}`}>
                  📚 문법 오류
                </h3>
                <div className="space-y-3">
                  {result.grammar_errors.map((err, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg whitespace-pre-wrap ${
                        isPlayTrack
                          ? "bg-pink-50 text-gray-800"
                          : isDarkMode
                            ? "bg-neutral-800 text-gray-200"
                            : "bg-blue-50 text-gray-800"
                      }`}
                    >
                      <p className="text-sm text-orange-500 font-medium mb-1">
                        {err.issue}
                      </p>
                      <p>
                        <span className="text-red-500 font-bold">{err.original}</span>
                        {" → "}
                        <span className="text-green-500 font-bold">
                          {err.corrected}
                        </span>
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          isPlayTrack ? "text-gray-800 font-medium" :
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {err.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 어휘 추천 */}
            {result.vocabulary_suggestions?.length > 0 && (
              <div className={`p-6 ${cardClass}`}>
                <h3 className={`font-bold mb-4 ${accentColor}`}>
                  💡 어휘 추천
                </h3>
                <div className="space-y-3">
                  {result.vocabulary_suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        isPlayTrack
                          ? "bg-purple-50 text-gray-800"
                          : isDarkMode
                            ? "bg-neutral-800 text-gray-200"
                            : "bg-gray-50 text-gray-800"
                      }`}
                    >
                      <p>
                        <span className={`font-bold ${isPlayTrack ? "text-gray-700" : isDarkMode ? "text-gray-300" : ""}`}>
                          {sug.original}
                        </span>
                        {" → "}
                        <span className="text-blue-500 font-bold">
                          {sug.suggested}
                        </span>
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          isPlayTrack ? "text-gray-800 font-medium" :
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {sug.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 구조 피드백 */}
            {result.structure_feedback && (
              <div className={`p-6 ${cardClass}`}>
                <h3 className={`font-bold mb-4 ${accentColor}`}>
                  🏗️ 글 구조 피드백
                </h3>
                {result.structure_feedback.strengths?.length > 0 && (
                  <div className="mb-4">
                    <p className="font-bold text-green-600 mb-2">
                      ✅ 잘한 점
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.structure_feedback.strengths.map((s, idx) => (
                        <li
                          key={idx}
                          className={isPlayTrack ? "text-gray-900 font-medium" : isDarkMode ? "text-gray-300 font-medium" : "text-black font-medium"}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.structure_feedback.improvements?.length > 0 && (
                  <div className="mb-4">
                    <p className="font-bold text-orange-600 mb-2">
                      💪 개선할 점
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.structure_feedback.improvements.map((s, idx) => (
                        <li
                          key={idx}
                          className={isPlayTrack ? "text-gray-900 font-medium" : isDarkMode ? "text-gray-300 font-medium" : "text-black font-medium"}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.structure_feedback.overall_comment && (
                  <p className={`font-medium ${isPlayTrack ? "text-gray-900" : isDarkMode ? "text-gray-400" : "text-black"}`}>
                    {result.structure_feedback.overall_comment}
                  </p>
                )}
              </div>
            )}

            {/* 수정된 글 */}
            {result.corrected_text && (
              <div className={`p-6 ${cardClass}`}>
                <h3 className={`font-bold mb-4 ${accentColor}`}>
                  ✨ 수정된 글
                </h3>
                <div
                  className={`p-4 rounded-lg whitespace-pre-wrap ${
                    isPlayTrack
                      ? "bg-pink-50 text-gray-800"
                      : isDarkMode
                        ? "bg-neutral-800 text-gray-200"
                        : "bg-blue-50 text-gray-800"
                  }`}
                >
                  {result.corrected_text}
                </div>
              </div>
            )}

            {/* 다시하기 버튼 */}
            <div className="text-center">
              <button
                onClick={() => {
                  setResult(null);
                  setText("");
                }}
                className={`px-8 py-3 rounded-xl font-bold ${buttonClass}`}
              >
                새 글 첨삭하기
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
