"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getContentDetail } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function DetailPage() {
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
        const response = await getContentDetail(id);

        if (response.status === "success") {
          setData(response.data);
        } else {
          alert("데이터를 가져오지 못했습니다.");
          router.push("/history");
        }
      } catch (err) {
        console.error("데이터 로드 실패:", err);
        alert("오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading || !isLoaded)
    return <div className="p-8 text-center">분석 내용 불러오는 중...</div>;
  if (!data)
    return <div className="p-8 text-center">데이터를 찾을 수 없습니다.</div>;

  const interpretation = typeof data.modern_interpretation === "string" 
    ? JSON.parse(data.modern_interpretation || "{}") 
    : (data.modern_interpretation || {});
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

  const sectionBgClass = isPlayTrack
    ? "bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100"
    : isDarkMode
      ? "bg-neutral-800 border border-neutral-700"
      : "bg-blue-50 border border-blue-100";

  const mbtiBgClass = isPlayTrack
    ? "bg-purple-50 border border-purple-200"
    : isDarkMode
      ? "bg-neutral-800 border border-neutral-700"
      : "bg-gray-50 border border-gray-100";

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
          <div className="mb-8 border-b pb-6">
            <h1
              className={`text-3xl font-bold mb-2 ${
                isPlayTrack ? "text-purple-700" : ""
              }`}
            >
              {data.title}
            </h1>
            <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              저자: {data.author} | 분석 일시: {data.created_at}
            </p>
          </div>

          <div className="mb-10">
            <h2 className={`text-lg font-semibold mb-4 ${accentColor}`}>
              {isPlayTrack ? "📖 원문 내용" : "📜 원문 내용"}
            </h2>
            <div
              className={`p-6 rounded-xl whitespace-pre-wrap leading-relaxed ${
                isPlayTrack
                  ? "bg-pink-50 text-gray-800 border-2 border-pink-100"
                  : isDarkMode
                    ? "bg-neutral-800 text-gray-200"
                    : "bg-gray-50 text-gray-800"
              }`}
            >
              {data.body_text}
            </div>
          </div>

          <div className="space-y-6">
            <h2
              className={`text-lg font-semibold border-l-4 pl-3 ${
                isPlayTrack
                  ? "text-pink-500 border-pink-400"
                  : isDarkMode
                    ? "text-blue-400 border-blue-400"
                    : "text-blue-600 border-blue-500"
              }`}
            >
              {isPlayTrack ? "🌟 AI 분석 결과" : "💡 AI 분석 결과"}
            </h2>

            <div className={`p-6 rounded-xl ${sectionBgClass}`}>
              <h3
                className={`font-bold mb-2 ${
                  isPlayTrack
                    ? "text-purple-600"
                    : isDarkMode
                      ? "text-blue-300"
                      : "text-blue-800"
                }`}
              >
                핵심 해설
              </h3>
              <p
                className={`whitespace-pre-wrap ${
                  isPlayTrack
                    ? "text-gray-700"
                    : isDarkMode
                      ? "text-gray-300"
                      : "text-gray-700"
                }`}
              >
                {data.ai_explanation}
              </p>
            </div>

            {interpretation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {interpretation.mbti && (
                  <div
                    className={`p-4 rounded-xl border ${
                      isPlayTrack
                        ? "bg-purple-50 border-purple-200"
                        : isDarkMode
                        ? "bg-purple-900/30 border-purple-800"
                        : "bg-purple-50 border-purple-100"
                    }`}
                  >
                    <p
                      className={`font-bold ${
                        isPlayTrack
                          ? "text-purple-600"
                          : isDarkMode
                          ? "text-purple-300"
                          : "text-purple-800"
                      }`}
                    >
                      🧠 화자(주인공)의 예상 MBTI
                    </p>
                    <p
                      className={`mt-1 ${
                        isPlayTrack
                          ? "text-purple-500"
                          : isDarkMode
                          ? "text-purple-200"
                          : "text-purple-700"
                      }`}
                    >
                      {interpretation.mbti}
                    </p>
                  </div>
                )}
                {interpretation.chat_version && (
                  <div
                    className={`p-4 rounded-xl border ${
                      isPlayTrack
                        ? "bg-orange-50 border-orange-200"
                        : isDarkMode
                        ? "bg-orange-900/30 border-orange-800"
                        : "bg-orange-50 border-orange-100"
                    }`}
                  >
                    <p
                      className={`font-bold ${
                        isPlayTrack
                          ? "text-orange-500"
                          : isDarkMode
                          ? "text-orange-300"
                          : "text-orange-800"
                      }`}
                    >
                      💬 카톡 답장 스타일
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        isPlayTrack
                          ? "text-orange-600"
                          : isDarkMode
                          ? "text-orange-200"
                          : "text-orange-700"
                      }`}
                    >
                      {interpretation.chat_version}
                    </p>
                  </div>
                )}
                {interpretation.summary && (
                  <div
                    className={`p-4 rounded-xl border md:col-span-2 ${
                      isPlayTrack
                        ? "bg-blue-50 border-blue-200"
                        : isDarkMode
                        ? "bg-blue-900/30 border-blue-800"
                        : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    <p
                      className={`font-bold ${
                        isPlayTrack
                          ? "text-blue-600"
                          : isDarkMode
                          ? "text-blue-300"
                          : "text-blue-800"
                      }`}
                    >
                      📝 핵심 요약
                    </p>
                    <p
                      className={`mt-1 text-sm leading-relaxed ${
                        isPlayTrack
                          ? "text-blue-800"
                          : isDarkMode
                          ? "text-blue-200"
                          : "text-blue-900"
                      }`}
                    >
                      {interpretation.summary}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
