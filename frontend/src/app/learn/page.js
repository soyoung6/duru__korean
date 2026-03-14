"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function LearnPage() {
  useAuth();
  const { track, isDarkMode, isLoaded } = useTrack();

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

  const titleClass = isPlayTrack
    ? "text-pink-500"
    : isDarkMode
      ? "text-white"
      : "text-gray-900";

  // 4개 기능 카드 정의
  const learnItems = [
    {
      title: isPlayTrack ? "작품 해설" : "작품 분석",
      description: isPlayTrack
        ? "시나 소설을 쉽게 이해해보세요!"
        : "AI가 작품을 분석하고 해설해드립니다",
      href: "/analyze",
      emoji: "📊",
      color: isPlayTrack
        ? "from-pink-400 to-rose-400"
        : "from-blue-500 to-cyan-500",
      bgColor: isPlayTrack
        ? "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 hover:border-pink-400"
        : isDarkMode
          ? "bg-gradient-to-br from-blue-950 to-cyan-950 border-blue-800 hover:border-blue-600"
          : "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-400",
    },
    {
      title: isPlayTrack ? "퀴즈 풀기" : "객관식 문제",
      description: isPlayTrack
        ? "재미있는 퀴즈를 풀어보세요!"
        : "작품 기반 객관식 문제를 풀어보세요",
      href: "/practice/multiple-choice",
      emoji: "📝",
      color: isPlayTrack
        ? "from-purple-400 to-violet-400"
        : "from-emerald-500 to-teal-500",
      bgColor: isPlayTrack
        ? "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:border-purple-400"
        : isDarkMode
          ? "bg-gradient-to-br from-emerald-950 to-teal-950 border-emerald-800 hover:border-emerald-600"
          : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400",
    },
    {
      title: isPlayTrack ? "글쓰기 도우미" : "글쓰기 첨삭",
      description: isPlayTrack
        ? "글쓰기를 도와줄게요!"
        : "AI가 글쓰기를 첨삭해드립니다",
      href: "/practice/writing",
      emoji: "✍️",
      color: isPlayTrack
        ? "from-orange-400 to-amber-400"
        : "from-orange-500 to-amber-500",
      bgColor: isPlayTrack
        ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:border-orange-400"
        : isDarkMode
          ? "bg-gradient-to-br from-orange-950 to-amber-950 border-orange-800 hover:border-orange-600"
          : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:border-orange-400",
    },
    {
      title: isPlayTrack ? "긴 글쓰기" : "서술형/논술형",
      description: isPlayTrack
        ? "긴 글쓰기 연습을 해봐요!"
        : "서술형/논술형 문제를 연습하세요",
      href: "/practice/essay",
      emoji: "📖",
      color: isPlayTrack
        ? "from-cyan-400 to-sky-400"
        : "from-violet-500 to-purple-500",
      bgColor: isPlayTrack
        ? "bg-gradient-to-br from-cyan-50 to-sky-50 border-cyan-200 hover:border-cyan-400"
        : isDarkMode
          ? "bg-gradient-to-br from-violet-950 to-purple-950 border-violet-800 hover:border-violet-600"
          : "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400",
    },
  ];

  return (
    <main className={`min-h-screen p-8 ${bgClass} ${textClass}`}>
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className={`text-3xl font-bold mb-3 ${titleClass}`}>
            {isPlayTrack ? "🎮 오늘 뭐 할까?" : "📚 학습 시작하기"}
          </h1>
          <p
            className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            {isPlayTrack
              ? "하고 싶은 거 골라봐!"
              : "원하는 학습 유형을 선택하세요"}
          </p>
        </div>

        {/* 2x2 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {learnItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`group p-5 rounded-2xl border-2 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl ${item.bgColor}`}
            >
              {/* 이모지 */}
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                {item.emoji}
              </div>

              {/* 제목 */}
              <h2
                className={`text-xl font-bold mb-2 ${
                  isPlayTrack
                    ? "text-purple-700"
                    : isDarkMode
                      ? "text-white"
                      : "text-gray-800"
                }`}
              >
                {item.title}
              </h2>

              {/* 설명 */}
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {item.description}
              </p>

              {/* 화살표 */}
              <div
                className={`mt-4 text-sm font-medium flex items-center gap-1 ${
                  isPlayTrack
                    ? "text-pink-500"
                    : isDarkMode
                      ? "text-blue-400"
                      : "text-blue-600"
                }`}
              >
                시작하기
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* 기록 보기 링크 */}
        <div className="mt-10 text-center">
          <Link
            href="/history"
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
              isPlayTrack
                ? "bg-white/80 text-purple-600 hover:bg-white border-2 border-purple-200"
                : isDarkMode
                  ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            📋 내 학습 기록 보기
          </Link>
        </div>
      </div>
    </main>
  );
}
