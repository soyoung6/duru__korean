// src/components/Navbar.js
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTrack } from "@/contexts/TrackContext";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 트랙 컨텍스트 사용
  const { track, isDarkMode, toggleDarkMode, isLoaded } = useTrack();

  // 토큰 체크 함수 분리
  const checkToken = () => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  };

  // 마운트 시 & pathname 변경 시 토큰 체크
  useEffect(() => {
    setMounted(true);
    checkToken();
  }, [pathname]);

  // 브라우저 이벤트 리스너 (한 번만 등록)
  useEffect(() => {
    const handleFocus = () => {
      checkToken();
    };

    const handleStorage = (e) => {
      if (e.key === "token") {
        checkToken();
      }
    };

    const handlePopState = () => {
      checkToken();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleLogout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_id");
      setIsLoggedIn(false);
      router.push("/");
    }
  };

  if (
    pathname === "/" ||
    pathname === "/signup" ||
    pathname === "/select-track"
  ) {
    return null;
  }

  if (!mounted || !isLoaded) {
    return (
      <nav className="navbar bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="text-xl font-bold text-blue-600">📚 두루국어</div>
        </div>
      </nav>
    );
  }

  // 트랙별 스타일
  const isPlayTrack = track === "play";

  const navClass = isPlayTrack
    ? "navbar sticky top-0 z-50 bg-gradient-to-r from-pink-100 via-purple-50 to-blue-100 border-b-4 border-pink-200"
    : isDarkMode
      ? "navbar sticky top-0 z-50 bg-neutral-950 border-b border-neutral-800"
      : "navbar sticky top-0 z-50 bg-white border-b border-gray-200";

  const logoClass = isPlayTrack
    ? "text-xl font-bold text-pink-500 flex items-center gap-2"
    : isDarkMode
      ? "text-xl font-bold text-white flex items-center gap-2"
      : "text-xl font-bold text-gray-900 flex items-center gap-2";

  const linkClass = isPlayTrack
    ? "text-purple-600 hover:text-pink-500 font-bold px-3 py-2 rounded-full hover:bg-pink-100 transition-all"
    : isDarkMode
      ? "text-gray-300 hover:text-white font-medium transition-colors"
      : "text-gray-800 hover:text-blue-600 font-medium transition-colors";

  return (
    <nav className={navClass}>
      <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
        <Link href={isLoggedIn ? "/history" : "/"} className={logoClass}>
          {isPlayTrack ? "🌈" : "📚"} 두루국어
        </Link>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link href="/learn" className={linkClass}>
                {isPlayTrack ? "✨ 학습" : "학습"}
              </Link>
              <Link href="/history" className={linkClass}>
                {isPlayTrack ? "📖 내 기록" : "내 기록"}
              </Link>
              <Link href="/mypage" className={linkClass}>
                {isPlayTrack ? "👤 마이페이지" : "마이페이지"}
              </Link>

              <button
                onClick={handleLogout}
                className={
                  isPlayTrack
                    ? "text-pink-400 hover:text-pink-600 text-sm font-medium"
                    : isDarkMode
                      ? "text-red-400 hover:text-red-300 text-sm font-medium"
                      : "text-red-500 hover:text-red-600 text-sm font-medium"
                }
              >
                로그아웃
              </button>

              {/* Pro Track에서만 다크모드 토글 표시 - 로그아웃 옆 */}
              {!isPlayTrack && (
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-neutral-800 text-yellow-400 hover:bg-neutral-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title={isDarkMode ? "라이트 모드" : "다크 모드"}
                >
                  {isDarkMode ? "☀️" : "🌙"}
                </button>
              )}
            </>
          ) : (
            <Link
              href="/"
              className={
                isPlayTrack
                  ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white px-5 py-2 rounded-full font-bold hover:from-pink-500 hover:to-purple-500 transition shadow-lg"
                  : "bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition"
              }
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
