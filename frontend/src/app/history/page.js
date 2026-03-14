"use client";

import { useState, useEffect } from "react";
import {
  getAllRecords,
  deleteContent,
  deletePracticeSession,
} from "@/utils/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function HistoryPage() {
  useAuth();
  const { track, isDarkMode, isLoaded } = useTrack();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all, analysis, multiple_choice, essay, writing

  // 필터 탭 정의
  const filterTabs = [
    { key: "all", label: "전체", emoji: "📋" },
    { key: "analysis", label: "분석", emoji: "📊" },
    { key: "multiple_choice", label: "객관식", emoji: "📝" },
    { key: "essay", label: "서술형", emoji: "📖" },
    { key: "writing", label: "글쓰기", emoji: "✍️" },
  ];

  // 기록 유형별 정보
  const recordTypeInfo = {
    analysis: { label: "작품 분석", emoji: "📊", color: "blue" },
    multiple_choice: { label: "객관식", emoji: "📝", color: "emerald" },
    essay: { label: "서술형", emoji: "📖", color: "violet" },
    writing: { label: "글쓰기", emoji: "✍️", color: "orange" },
  };

  const fetchList = async (filter = "all") => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      setLoading(true);
      const recordType = filter === "all" ? null : filter;
      const response = await getAllRecords(recordType, 50);
      setList(response.data || []);
    } catch (err) {
      console.error("기록 조회 에러:", err);
      setError("목록을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(activeFilter);
  }, [activeFilter]);

  const handleDelete = async (e, record) => {
    e.preventDefault();
    if (!confirm("정말 이 기록을 삭제하시겠습니까?")) return;

    try {
      if (record.record_type === "analysis") {
        // 분석 기록 삭제
        await deleteContent(record.id);
      } else {
        // 연습 기록 삭제
        await deletePracticeSession(record.id);
      }
      alert("삭제되었습니다.");
      fetchList(activeFilter);
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    }
  };

  const getDetailLink = (record) => {
    if (record.record_type === "analysis") {
      return `/history/${record.id}`;
    }
    // 연습 기록은 별도 상세 페이지 필요 (추후 구현)
    return `/history/practice/${record.id}`;
  };

  const getScoreDisplay = (record) => {
    if (record.score === null || record.score === undefined) return null;

    const score = Math.round(record.score);
    let colorClass = "text-green-500";
    if (score < 60) colorClass = "text-red-500";
    else if (score < 80) colorClass = "text-yellow-500";

    return <span className={`font-bold ${colorClass}`}>{score}점</span>;
  };

  if ((loading && list.length === 0) || !isLoaded)
    return <div className="p-8 text-center">로딩 중...</div>;

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

  const titleClass = isPlayTrack
    ? "text-pink-500"
    : isDarkMode
      ? "text-white"
      : "text-gray-900";

  const cardClass = isPlayTrack
    ? "bg-white border-2 border-pink-200 rounded-2xl"
    : isDarkMode
      ? "bg-neutral-900 border border-neutral-800 rounded-xl"
      : "bg-white border border-gray-200 rounded-xl";

  const buttonClass = isPlayTrack
    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500"
    : isDarkMode
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-blue-500 text-white hover:bg-blue-600";

  const linkClass = isPlayTrack
    ? "text-purple-500 hover:text-pink-500"
    : isDarkMode
      ? "text-blue-400 hover:text-blue-300"
      : "text-blue-600 hover:text-blue-700";

  return (
    <main className={`min-h-screen p-8 ${bgClass} ${textClass}`}>
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-bold ${titleClass}`}>
            {isPlayTrack ? "📋 나의 학습 기록" : "📚 나의 학습 기록"}
          </h1>
          <Link
            href="/learn"
            className={`px-4 py-2 rounded-lg font-bold transition ${buttonClass}`}
          >
            {isPlayTrack ? "✨ 새로 학습하기" : "새로 학습하기"}
          </Link>
        </div>

        {/* 필터 탭 */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  activeFilter === tab.key
                    ? isPlayTrack
                      ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white"
                      : isDarkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-500 text-white"
                    : isPlayTrack
                      ? "bg-white/80 text-purple-600 hover:bg-pink-100 border border-pink-200"
                      : isDarkMode
                        ? "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {list.length === 0 ? (
          <div className={`text-center py-20 rounded-xl shadow ${cardClass}`}>
            <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              {activeFilter === "all"
                ? "아직 학습 기록이 없습니다."
                : `${filterTabs.find((t) => t.key === activeFilter)?.label} 기록이 없습니다.`}
            </p>
            <Link
              href="/learn"
              className={`inline-block mt-4 px-6 py-2 rounded-lg font-bold ${buttonClass}`}
            >
              학습 시작하기
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {list.map((record, index) => {
              const typeInfo = recordTypeInfo[record.record_type] || {
                label: "기록",
                emoji: "📋",
                color: "gray",
              };

              return (
                <div
                  key={`${record.record_type}-${record.id}-${index}`}
                  className={`p-6 shadow-sm hover:shadow-md transition flex justify-between items-center ${cardClass}`}
                >
                  <Link href={getDetailLink(record)} className="flex-1">
                    {/* 유형 뱃지 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          isPlayTrack
                            ? "bg-pink-400 text-white"
                            : isDarkMode
                              ? `bg-${typeInfo.color}-900 text-${typeInfo.color}-300`
                              : `bg-${typeInfo.color}-100 text-${typeInfo.color}-600`
                        }`}
                        style={{
                          backgroundColor: isPlayTrack
                            ? undefined
                            : isDarkMode
                              ? `var(--${typeInfo.color}-900, #1e3a5f)`
                              : `var(--${typeInfo.color}-100, #e0f2fe)`,
                        }}
                      >
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                      {getScoreDisplay(record)}
                      {record.question_count && (
                        <span
                          className={`text-xs ${
                            isDarkMode ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          {record.question_count}문제
                        </span>
                      )}
                    </div>

                    {/* 제목 */}
                    <h2
                      className={`text-xl font-bold mb-1 ${
                        isPlayTrack ? "text-purple-700" : ""
                      }`}
                    >
                      {record.work_title || "제목 없음"}
                    </h2>

                    {/* 작가 및 학년 */}
                    <p
                      className={`text-sm ${
                        isPlayTrack
                          ? "text-gray-600"
                          : isDarkMode
                            ? "text-gray-400"
                            : "text-gray-600"
                      }`}
                    >
                      작가: {record.work_author || "미상"} | 학년:{" "}
                      {record.grade || "-"}
                    </p>

                    {/* 날짜 */}
                    <p
                      className={`text-xs mt-1 ${
                        isPlayTrack
                          ? "text-gray-500"
                          : isDarkMode
                            ? "text-gray-500"
                            : "text-gray-400"
                      }`}
                    >
                      {record.created_at}
                    </p>
                  </Link>

                  <div className="flex items-center gap-4">
                    <Link
                      href={getDetailLink(record)}
                      className={`font-medium hover:underline ${linkClass}`}
                    >
                      자세히 보기
                    </Link>
                    <button
                      onClick={(e) => handleDelete(e, record)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
