"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPracticeDetail } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function PracticeDetailPage() {
  useAuth();
  const { track, isDarkMode, isLoaded } = useTrack();
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await getPracticeDetail(id);

        if (response.status === "success") {
          setData(response.data);
        } else {
          alert("데이터를 가져오지 못했습니다.");
          router.push("/history");
        }
      } catch (err) {
        console.error("데이터 로드 실패:", err);
        alert("오류가 발생했습니다.");
        router.push("/history");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading || !isLoaded)
    return <div className="p-8 text-center">로딩 중...</div>;
  if (!data)
    return <div className="p-8 text-center">데이터를 찾을 수 없습니다.</div>;

  const isPlayTrack = track === "play";

  // 트랙별 스타일
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

  const accentColor = isPlayTrack
    ? "text-pink-500"
    : isDarkMode
      ? "text-blue-400"
      : "text-blue-600";

  // 연습 유형별 정보
  const practiceTypeInfo = {
    multiple_choice: { label: "객관식 문제", emoji: "📝" },
    essay: { label: "서술형/논술형", emoji: "📖" },
    writing: { label: "글쓰기 첨삭", emoji: "✍️" },
  };

  const typeInfo = practiceTypeInfo[data.practice_type] || {
    label: "연습",
    emoji: "📋",
  };

  return (
    <main className={`min-h-screen p-8 ${bgClass} ${textClass}`}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className={`mb-6 hover:underline flex items-center ${accentColor}`}
        >
          ← 뒤로 가기
        </button>

        <div className={`p-8 shadow-md mb-6 ${cardClass}`}>
          {/* 헤더 */}
          <div className="mb-8 border-b pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${
                  isPlayTrack
                    ? "bg-pink-100 text-pink-600"
                    : isDarkMode
                      ? "bg-blue-900 text-blue-300"
                      : "bg-blue-100 text-blue-600"
                }`}
              >
                {typeInfo.emoji} {typeInfo.label}
              </span>
            </div>
            <h1
              className={`text-3xl font-bold mb-2 ${
                isPlayTrack ? "text-purple-700" : ""
              }`}
            >
              {data.work_title || "제목 없음"}
            </h1>
            <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              작가: {data.work_author || "미상"} | 학년: {data.grade || "-"} |
              일시: {data.created_at}
            </p>
          </div>

          {/* 문제 정보 */}
          {data.question_data && (
            <div className="mb-8">
              <h2 className={`text-lg font-semibold mb-4 ${accentColor}`}>
                {data.practice_type === "writing" ? "📝 글쓰기 내용" : "📋 문제 내용"}
              </h2>

              {/* 객관식 문제일 경우 */}
              {data.practice_type === "multiple_choice" &&
                data.question_data.questions &&
                data.question_data.questions.length > 0 && (
                  <div className="space-y-6">
                    {data.question_data.questions.map((q, qIndex) => (
                      <div
                        key={qIndex}
                        className={`p-6 rounded-xl ${
                          isPlayTrack
                            ? "bg-pink-50 border border-pink-100"
                            : isDarkMode
                              ? "bg-neutral-800"
                              : "bg-gray-50"
                        }`}
                      >
                        <p className="font-bold mb-4">
                          {qIndex + 1}. {q.question}
                        </p>
                        {q.options && (
                          <ul className="space-y-2">
                            {q.options.map((opt, idx) => {
                              const optionNum = idx + 1;
                              const isCorrect = q.correct_answer === optionNum;
                              return (
                                <li
                                  key={idx}
                                  className={`p-2 rounded border ${
                                    isCorrect
                                      ? isPlayTrack
                                        ? "bg-white text-pink-600 border-2 border-pink-400 font-bold shadow-sm"
                                        : isDarkMode
                                          ? "bg-transparent text-blue-400 border border-blue-500"
                                          : "bg-green-50 text-green-700 border border-green-400"
                                      : isPlayTrack
                                        ? "bg-white border-pink-200 text-gray-800 shadow-sm"
                                        : isDarkMode
                                          ? "border-neutral-700 text-gray-300"
                                          : "bg-white border-gray-200 text-gray-700"
                                  }`}
                                >
                                  <span className="font-bold mr-2">{optionNum}.</span>
                                  {opt}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {q.explanation && (
                          <div className={`mt-4 p-3 rounded text-sm ${
                            isPlayTrack ? "bg-white border border-gray-200 text-gray-800" :
                            isDarkMode ? "bg-neutral-700 text-gray-300" : "bg-white border border-gray-200 text-gray-700"
                          }`}>
                            <strong>해설:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              {/* 서술형/논술형 문제일 경우 */}
              {data.practice_type === "essay" &&
                data.question_data.question && (
                  <div
                    className={`p-6 rounded-xl ${
                      isPlayTrack
                        ? "bg-purple-50 border border-purple-100"
                        : isDarkMode
                          ? "bg-neutral-800"
                          : "bg-gray-50"
                    }`}
                  >
                    <p className="font-medium mb-4">
                      {data.question_data.question}
                    </p>
                    {data.question_data.word_count && (
                      <p
                        className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        권장 글자 수: {data.question_data.word_count}자
                      </p>
                    )}
                  </div>
                )}

              {/* 글쓰기 첨삭일 경우 */}
              {data.practice_type === "writing" && data.question_data && (
                <div className="space-y-6">
                  {/* 원문 */}
                  <div
                    className={`p-6 rounded-xl ${
                      isPlayTrack
                        ? "bg-pink-50 border border-pink-100"
                        : isDarkMode
                          ? "bg-neutral-800"
                          : "bg-gray-50"
                    }`}
                  >
                    <h3 className={`font-bold mb-4 ${accentColor}`}>
                     📝 작성한 글
                    </h3>
                    <p className={`whitespace-pre-wrap ${isPlayTrack ? "text-gray-800" : isDarkMode ? "text-gray-300" : "text-gray-800"}`}>
                      {data.question_data.original_text}
                    </p>
                  </div>

                  {/* 첨삭 결과 */}
                  {data.question_data.result && (
                    <div
                      className={`p-6 rounded-xl ${
                        isPlayTrack
                          ? "bg-purple-50 border border-purple-100"
                          : isDarkMode
                            ? "bg-neutral-800"
                            : "bg-white border border-gray-200"
                      }`}
                    >
                      <h3 className={`font-bold mb-4 ${accentColor}`}>
                        ✨ 첨삭 결과
                      </h3>
                      
                      {/* 점수 코멘트 */}
                      <div className="mb-6 text-center">
                        <p className={`text-4xl font-bold mb-2 ${
                          data.question_data.result.overall_score >= 80 ? "text-green-500" :
                          data.question_data.result.overall_score >= 60 ? "text-yellow-500" : "text-red-500"
                        }`}>
                          {data.question_data.result.overall_score}점
                        </p>
                        <p className={`font-medium ${isPlayTrack ? "text-gray-800" : isDarkMode ? "text-gray-300" : "text-gray-800"}`}>
                           {data.question_data.result.overall_comment}
                        </p>
                      </div>

                      {/* 맞춤법 오류 */}
                      {data.question_data.result.spelling_errors?.length > 0 && (
                        <div className="mb-6">
                          <h4 className={`font-bold mb-2 ${isPlayTrack ? "text-gray-800" : isDarkMode ? "text-gray-300" : "text-gray-700"}`}>📝 맞춤법 오류</h4>
                          <div className="space-y-2">
                            {data.question_data.result.spelling_errors.map((err, idx) => (
                              <div key={idx} className={`p-3 rounded-lg ${isPlayTrack ? "bg-orange-50 text-gray-800" : isDarkMode ? "bg-neutral-700" : "bg-gray-50 text-gray-800"}`}>
                                <p>
                                  <span className="text-red-500 line-through font-bold">{err.original}</span>
                                  {" → "}
                                  <span className="text-green-500 font-bold">{err.corrected}</span>
                                </p>
                                <p className={`text-sm mt-1 ${isPlayTrack ? "text-gray-800 font-medium" : isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  {err.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 문법 오류 */}
                      {data.question_data.result.grammar_errors?.length > 0 && (
                        <div className="mb-6">
                           <h4 className={`font-bold mb-2 ${isPlayTrack ? "text-gray-800" : isDarkMode ? "text-gray-300" : "text-gray-700"}`}>📚 문법 오류</h4>
                           <div className="space-y-2">
                             {data.question_data.result.grammar_errors.map((err, idx) => (
                               <div key={idx} className={`p-3 rounded-lg ${isPlayTrack ? "bg-pink-50 text-gray-800" : isDarkMode ? "bg-neutral-700" : "bg-blue-50 text-gray-800"}`}>
                                  <p className="text-sm text-orange-500 font-medium mb-1">{err.issue}</p>
                                  <p>
                                    <span className="text-red-500 font-bold">{err.original}</span>
                                    {" → "}
                                    <span className="text-green-500 font-bold">{err.corrected}</span>
                                  </p>
                                  <p className={`text-sm mt-1 ${isPlayTrack ? "text-gray-800 font-medium" : isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                    {err.explanation}
                                  </p>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}

                      {/* 구조 피드백 */}
                      {data.question_data.result.structure_feedback && (
                        <div className="mb-6">
                           <h4 className={`font-bold mb-2 ${isPlayTrack ? "text-gray-800" : isDarkMode ? "text-gray-300" : "text-gray-700"}`}>🏗️ 구조 피드백</h4>
                           <div className={`p-4 rounded-lg ${isPlayTrack ? "bg-purple-50" : isDarkMode ? "bg-neutral-700" : "bg-gray-50"}`}>
                             {data.question_data.result.structure_feedback.strengths?.length > 0 && (
                               <div className="mb-3">
                                 <p className="font-bold text-green-600 mb-1">✅ 잘한 점</p>
                                 <ul className="list-disc list-inside space-y-1">
                                   {data.question_data.result.structure_feedback.strengths.map((s, idx) => (
                                      <li key={idx} className={isPlayTrack ? "text-gray-900 font-medium" : isDarkMode ? "text-gray-300 font-medium" : "text-black font-medium"}>{s}</li>
                                   ))}
                                 </ul>
                               </div>
                             )}
                             {data.question_data.result.structure_feedback.improvements?.length > 0 && (
                               <div className="mb-3">
                                 <p className="font-bold text-orange-600 mb-1">💪 개선할 점</p>
                                 <ul className="list-disc list-inside space-y-1">
                                   {data.question_data.result.structure_feedback.improvements.map((s, idx) => (
                                      <li key={idx} className={isPlayTrack ? "text-gray-900 font-medium" : isDarkMode ? "text-gray-300 font-medium" : "text-black font-medium"}>{s}</li>
                                   ))}
                                 </ul>
                               </div>
                             )}
                           </div>
                        </div>
                      )}

                      {/* 수정된 글 */}
                      {data.question_data.result.corrected_text && (
                        <div className="mt-6">
                          <h4 className={`font-bold mb-2 ${isPlayTrack ? "text-gray-800" : isDarkMode ? "text-gray-300" : "text-gray-700"}`}>✨ 수정된 글</h4>
                          <div className={`p-4 rounded-lg whitespace-pre-wrap ${isPlayTrack ? "bg-blue-50 text-gray-800" : isDarkMode ? "bg-neutral-700 text-gray-200" : "bg-gray-50 text-gray-800"}`}>
                             {data.question_data.result.corrected_text}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 결과 목록 */}
          {data.results && data.results.length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold mb-4 ${accentColor}`}>
                📊 답안 및 결과
              </h2>
              <div className="space-y-4">
                {data.results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl ${
                      isPlayTrack
                        ? "bg-gray-50 border border-gray-200"
                        : isDarkMode
                          ? "bg-neutral-800 border border-neutral-700"
                          : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-sm font-medium ${
                          result.is_correct ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {result.is_correct ? "✅ 정답" : "❌ 오답"}
                      </span>
                      {result.score !== null && (
                        <span
                          className={`text-sm font-bold ${
                            result.score >= 80
                              ? "text-green-500"
                              : result.score >= 60
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {result.score}점
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-sm mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      <strong>문제 번호:</strong> {result.question_index + 1}번 | <strong>내 답안:</strong> {result.user_answer || "-"}
                    </p>

                    {result.correct_answer && (
                      <p
                        className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                      >
                        <strong>정답:</strong> {result.correct_answer}
                      </p>
                    )}

                    {/* 상세 피드백 */}
                    {result.result_data && result.result_data.feedback && (
                      <div
                        className={`mt-3 p-3 rounded-lg ${
                          isPlayTrack
                            ? "bg-purple-50"
                            : isDarkMode
                              ? "bg-neutral-700"
                              : "bg-blue-50"
                        }`}
                      >
                        <p
                          className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                        >
                          {result.result_data.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 결과가 없는 경우 */}
          {data.practice_type !== "writing" && (!data.results || data.results.length === 0) && (
            <div
              className={`text-center py-8 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              아직 제출된 답안이 없습니다.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
