"use client";

import { useRouter } from "next/navigation";
import { useTrack } from "@/contexts/TrackContext";
import { useEffect, useState } from "react";

export default function SelectTrackPage() {
  const router = useRouter();
  const { setTrack } = useTrack();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }
    setIsLoggedIn(true);
  }, [router]);

  const handleSelectTrack = (selectedTrack) => {
    setTrack(selectedTrack);
    router.push("/learn");
  };

  if (!mounted || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📚 두루국어에 오신 것을 환영합니다!
          </h1>
          <p className="text-lg text-gray-600">
            나에게 맞는 학습 모드를 선택해주세요
          </p>
        </div>

        {/* 트랙 선택 카드 */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Play Track - 초등 */}
          <button
            onClick={() => handleSelectTrack("play")}
            className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-4 border-transparent hover:border-pink-300 text-left"
          >
            {/* 배경 그라데이션 */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 opacity-50"></div>

            <div className="relative">
              {/* 이모지 아이콘 */}
              <div className="text-6xl mb-4 group-hover:animate-bounce">🎮</div>

              {/* 타이틀 */}
              <h2 className="text-2xl font-bold text-pink-600 mb-2">
                Play Track
              </h2>
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                초등학생 모드
              </h3>

              {/* 설명 */}
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-pink-500">🎨</span>
                  파스텔 색상과 귀여운 캐릭터
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-500">🔊</span>
                  아이콘 & 음성 안내 중심
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-500">⭐</span>
                  스티커 보상 시스템
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-500">📖</span>
                  동화풍 AI 삽화
                </li>
              </ul>

              {/* 선택 버튼 */}
              <div className="mt-6 bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 px-6 rounded-full text-center font-bold group-hover:from-pink-500 group-hover:to-purple-500 transition-all">
                선택하기 ✨
              </div>
            </div>
          </button>

          {/* Pro Track - 중/고등 */}
          <button
            onClick={() => handleSelectTrack("pro")}
            className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-4 border-transparent hover:border-blue-300 text-left"
          >
            {/* 배경 그라데이션 */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100 via-slate-50 to-indigo-100 opacity-50"></div>

            <div className="relative">
              {/* 이모지 아이콘 */}
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🎯
              </div>

              {/* 타이틀 */}
              <h2 className="text-2xl font-bold text-blue-600 mb-2">
                Pro Track
              </h2>
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                중/고등학생 모드
              </h3>

              {/* 설명 */}
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">🌙</span>
                  라이트/다크 모드 선택
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">📝</span>
                  지문 가독성 최적화
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">⚡</span>
                  학습 효율 중심 설계
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">📊</span>
                  수능/EBS 분석 기능
                </li>
              </ul>

              {/* 선택 버튼 */}
              <div className="mt-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-full text-center font-bold group-hover:from-blue-600 group-hover:to-indigo-600 transition-all">
                선택하기 🚀
              </div>
            </div>
          </button>
        </div>

        {/* 하단 안내 */}
        <p className="text-center text-gray-500 mt-8 text-sm">
          💡 언제든지 마이페이지에서 모드를 변경할 수 있어요!
        </p>
      </div>
    </main>
  );
}
