"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTrack } from "@/contexts/TrackContext";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { track, isDarkMode, toggleDarkMode, isLoaded } = useTrack();

  useEffect(() => {
    setMounted(true);
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
  }, [pathname]);

  useEffect(() => {
    const refreshLoginState = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("token")));
    };

    window.addEventListener("focus", refreshLoginState);
    window.addEventListener("storage", refreshLoginState);
    return () => {
      window.removeEventListener("focus", refreshLoginState);
      window.removeEventListener("storage", refreshLoginState);
    };
  }, []);

  const handleLogout = () => {
    if (!confirm("로그아웃하시겠습니까?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    setIsLoggedIn(false);
    router.push("/");
  };

  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/select-track"
  ) {
    return null;
  }

  const isPlayTrack = track === "play";
  const navClass = isPlayTrack
    ? "navbar sticky top-0 z-50 bg-white border-b border-pink-200"
    : isDarkMode
      ? "navbar sticky top-0 z-50 bg-neutral-950 border-b border-neutral-800"
      : "navbar sticky top-0 z-50 bg-white border-b border-gray-200";

  const linkClass = isPlayTrack
    ? "text-purple-700 hover:text-pink-600 font-bold"
    : isDarkMode
      ? "text-gray-300 hover:text-white font-medium"
      : "text-gray-800 hover:text-blue-600 font-medium";

  if (!mounted || !isLoaded) {
    return (
      <nav className="navbar sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="text-xl font-bold text-blue-600">Duru Korean</div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={navClass}>
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href={isLoggedIn ? "/history" : "/"}
          className={isDarkMode ? "text-xl font-bold text-white" : "text-xl font-bold text-gray-900"}
        >
          Duru Korean
        </Link>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link href="/learn" className={linkClass}>
                학습
              </Link>
              <Link href="/history" className={linkClass}>
                기록
              </Link>
              <Link href="/mypage" className={linkClass}>
                마이페이지
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-red-500 hover:text-red-600"
              >
                로그아웃
              </button>
              {!isPlayTrack && (
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`rounded-md px-3 py-2 text-sm font-bold ${
                    isDarkMode
                      ? "bg-neutral-800 text-yellow-300"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  title={isDarkMode ? "라이트 모드" : "다크 모드"}
                >
                  {isDarkMode ? "Light" : "Dark"}
                </button>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
