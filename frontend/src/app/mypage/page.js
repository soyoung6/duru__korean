"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";
// ⭐ 공통 API 인스턴스와 내 정보 가져오기 함수를 임포트합니다.
import api, { getMyInfo } from "@/utils/api";

export default function MyPage() {
  useAuth();
  const {
    track,
    setTrack,
    isDarkMode,
    toggleDarkMode,
    isLoaded,
    grade,
    setGrade,
  } = useTrack();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. 유저 정보 및 사용량 로드
  const fetchUserInfo = async () => {
    try {
      const data = await getMyInfo();
      setUserInfo(data.data);
    } catch (err) {
      console.error("사용자 정보 로드 실패:", err);
      alert("사용자 정보를 불러올 수 없습니다.");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 2. 결제 준비 (카카오페이)
  const handlePayment = async () => {
    try {
      const response = await api.post("/payment/ready");

      if (response.data.next_redirect_pc_url) {
        window.location.href = response.data.next_redirect_pc_url;
      } else {
        alert("결제 준비 실패");
      }
    } catch (err) {
      alert("결제 준비 중 오류가 발생했습니다.");
    }
  };

  // 3. 구독 해지 처리
  const handleUnsubscribe = async () => {
    if (
      !confirm(
        "정말 정기 구독을 해지하시겠습니까? 해지 시 즉시 일반 회원으로 전환됩니다.",
      )
    )
      return;

    try {
      const response = await api.post("/payment/unsubscribe");

      if (response.data.status === "success") {
        alert(response.data.message || "구독이 정상적으로 해지되었습니다.");
        fetchUserInfo();
      } else {
        alert("해지 처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      alert(err.response?.data?.detail || "서버 통신 오류가 발생했습니다.");
    }
  };

  if (loading || !isLoaded)
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
      : "text-black";

  const cardClass = isPlayTrack
    ? "bg-white border-4 border-pink-200 rounded-3xl"
    : isDarkMode
      ? "bg-neutral-900 border-neutral-800 rounded-xl"
      : "bg-white rounded-xl border border-gray-200";

  const titleClass = isPlayTrack
    ? "text-pink-500"
    : isDarkMode
      ? "text-blue-400"
      : "text-blue-600";

  return (
    <main className={`min-h-screen p-8 ${bgClass} ${textClass}`}>
      <div className="max-w-3xl mx-auto">
        <h1 className={`text-3xl font-bold mb-8 ${titleClass}`}>
          {isPlayTrack ? "🌟 마이페이지" : "👤 마이페이지"}
        </h1>

        <div className={`p-8 shadow-md space-y-6 ${cardClass}`}>
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold mb-4">내 정보</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span
                  className={`${
                    isPlayTrack
                      ? "text-gray-600"
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  아이디
                </span>
                <span className="font-medium">{userInfo?.username}</span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`${
                    isPlayTrack
                      ? "text-gray-600"
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  닉네임
                </span>
                <span className="font-medium">{userInfo?.nickname}</span>
              </div>

              {/* 회원 등급 표시 */}
              <div className="flex justify-between">
                <span
                  className={`${
                    isPlayTrack
                      ? "text-gray-600"
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  회원 등급
                </span>
                <span
                  className={`font-bold ${
                    userInfo?.is_premium
                      ? "text-yellow-500"
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  {userInfo?.is_premium
                    ? "✨ 프리미엄 (정기구독 중)"
                    : "🆓 무료 일반회원"}
                </span>
              </div>

              {/* 이용 횟수 표시 */}
              <div className="flex justify-between border-t pt-3">
                <span
                  className={`${
                    isPlayTrack
                      ? "text-gray-600"
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  오늘 이용 횟수
                </span>
                <span className={`font-medium ${titleClass}`}>
                  {userInfo?.is_premium
                    ? "무제한"
                    : `${userInfo?.daily_count} / ${userInfo?.max_count}회`}
                </span>
              </div>

              {!userInfo?.is_premium && (
                <div
                  className={`mt-2 p-3 rounded-lg text-sm text-center ${
                    isPlayTrack
                      ? "bg-pink-50 text-pink-600"
                      : isDarkMode
                        ? "bg-neutral-800 text-gray-400"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  오늘 분석 가능한 횟수가{" "}
                  <span className="font-bold text-red-500">
                    {userInfo?.remaining_count}회
                  </span>{" "}
                  남았습니다.
                </div>
              )}

              <div className="flex justify-between border-t pt-3">
                <span
                  className={`${
                    isPlayTrack
                      ? "text-gray-600"
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  가입일
                </span>
                <span className="font-medium">{userInfo?.created_at}</span>
              </div>
            </div>
          </div>

          {/* 트랙 설정 섹션 */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-bold mb-4">
              {isPlayTrack ? "🎮 학습 모드 설정" : "⚙️ 학습 모드 설정"}
            </h2>

            {/* 트랙 선택 */}
            <div className="mb-4">
              <p
                className={`text-sm mb-3 ${
                  isPlayTrack
                    ? "text-gray-600"
                    : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-600"
                }`}
              >
                현재 모드:{" "}
                <span className="font-bold">
                  {isPlayTrack
                    ? "✨ Play Track (초등)"
                    : "🎯 Pro Track (중/고등)"}
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTrack("play")}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    isPlayTrack
                      ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg"
                      : isDarkMode
                        ? "bg-neutral-800 text-gray-400 hover:bg-neutral-700"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  🎮 Play Track
                </button>
                <button
                  onClick={() => setTrack("pro")}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    !isPlayTrack
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  🎯 Pro Track
                </button>
              </div>
            </div>

            {/* Pro Track 학년 선택 */}
            {!isPlayTrack && (
              <div className="mb-4">
                <p
                  className={`text-sm mb-3 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  학습 수준 설정
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGrade("MIDDLE")}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                      grade === "MIDDLE"
                        ? "bg-blue-600 text-white"
                        : isDarkMode
                          ? "bg-neutral-800 text-gray-400 hover:bg-neutral-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    중학생
                  </button>
                  <button
                    onClick={() => setGrade("HIGH")}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                      grade === "HIGH"
                        ? "bg-blue-600 text-white"
                        : isDarkMode
                          ? "bg-neutral-800 text-gray-400 hover:bg-neutral-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    고등학생
                  </button>
                </div>
              </div>
            )}

            {/* Pro Track 다크모드 설정 */}
            {!isPlayTrack && (
              <div
                className={`p-4 rounded-xl ${
                  isDarkMode ? "bg-neutral-800" : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">🌙 다크 모드</p>
                    <p
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      눈이 편한 어두운 화면으로 전환합니다
                    </p>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`w-14 h-8 rounded-full transition-all ${
                      isDarkMode ? "bg-blue-600" : "bg-gray-300"
                    } relative`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${
                        isDarkMode ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 하단 구독 상태 배너 */}
          {userInfo?.is_premium ? (
            <div
              className={`p-6 rounded-lg ${
                isPlayTrack
                  ? "bg-purple-50 border-2 border-purple-200"
                  : isDarkMode
                    ? "bg-blue-900/30 border border-blue-800"
                    : "bg-blue-50 border border-blue-200"
              }`}
            >
              <h3
                className={`font-bold mb-2 ${
                  isPlayTrack
                    ? "text-purple-600"
                    : isDarkMode
                      ? "text-blue-300"
                      : "text-blue-800"
                }`}
              >
                💎 멤버십 관리
              </h3>
              <p
                className={`text-sm mb-4 ${
                  isPlayTrack
                    ? "text-purple-500"
                    : isDarkMode
                      ? "text-blue-200"
                      : "text-blue-700"
                }`}
              >
                현재 모든 프리미엄 기능을 무제한으로 이용하고 계십니다.
              </p>
              <button
                onClick={handleUnsubscribe}
                className="text-sm text-gray-400 hover:text-red-500 underline transition-colors"
              >
                구독 해지하기
              </button>
            </div>
          ) : (
            <div
              className={`p-6 rounded-lg ${
                isPlayTrack
                  ? "bg-yellow-50 border-2 border-yellow-200"
                  : isDarkMode
                    ? "bg-amber-900/30 border border-amber-800"
                    : "bg-amber-50 border border-amber-200"
              }`}
            >
              <h3
                className={`font-bold mb-2 ${
                  isPlayTrack
                    ? "text-yellow-600"
                    : isDarkMode
                      ? "text-amber-300"
                      : "text-amber-800"
                }`}
              >
                🌟 프리미엄 멤버십
              </h3>
              <p
                className={`text-sm mb-4 ${
                  isPlayTrack
                    ? "text-yellow-600"
                    : isDarkMode
                      ? "text-amber-200"
                      : "text-amber-700"
                }`}
              >
                무제한 분석과 더 정교한 '예상 MBTI' 분석을 경험해 보세요!
              </p>
              <button
                onClick={handlePayment}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isPlayTrack
                    ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:from-yellow-500 hover:to-orange-500"
                    : "bg-amber-500 text-white hover:bg-amber-600"
                }`}
              >
                카카오페이로 정기구독 시작 💳
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
