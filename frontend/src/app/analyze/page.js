"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// 공통 api 모듈에서 필요한 함수들을 가져옵니다.
import { analyzeText, analyzeImage, getMyInfo } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useTrack } from "@/contexts/TrackContext";

export default function AnalyzePage() {
  useAuth();
  const { track, isDarkMode, getDefaultGrade, isLoaded } = useTrack();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  // 학년 - TrackContext의 getDefaultGrade() 사용
  const grade = getDefaultGrade();

  // 1. 페이지 로드 시 유저 정보(남은 횟수 확인용) 가져오기
  const fetchUserInfo = async () => {
    try {
      const data = await getMyInfo();
      setUserInfo(data.data);
    } catch (err) {
      console.error("유저 정보 로드 실패", err);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 2. 텍스트 분석 함수
  const handleAnalyze = async () => {
    if (userInfo && !userInfo.is_premium && userInfo.remaining_count <= 0) {
      alert(
        "오늘 무료 분석 횟수를 모두 사용하셨습니다. 프리미엄 구독 시 무제한 이용이 가능합니다!",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await analyzeText({
        body_text: text,
        mode: grade,
        title: "텍스트 분석",
        author: "사용자",
      });

      setResult(data.ai_analysis);
      fetchUserInfo();
    } catch (err) {
      setError(err.message || "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3. 📷 이미지 분석 함수
  const handleImageAnalyze = async () => {
    if (userInfo && !userInfo.is_premium && userInfo.remaining_count <= 0) {
      alert(
        "오늘 무료 분석 횟수를 모두 사용하셨습니다. 프리미엄 구독 시 무제한 이용이 가능합니다!",
      );
      return;
    }

    if (!file) return alert("이미지 파일을 선택해주세요.");

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", "이미지 분석");
    formData.append("author", "사용자");
    formData.append("mode", grade);

    try {
      const data = await analyzeImage(formData);
      setResult(data.ai_analysis);
      fetchUserInfo();
    } catch (err) {
      setError(err.message || "이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isPlayTrack = track === "play";

  // ========================================
  // Play Track UI (초등학생용)
  // ========================================
  if (isPlayTrack) {
    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          {/* 뒤로가기 버튼 */}
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 mb-4 text-purple-500 hover:text-pink-500 font-bold transition-colors"
          >
            ← 학습 선택으로
          </Link>

          {/* 헤더 */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-pink-500 mb-1 animate-bounce">
              ✨ AI 국어 친구 ✨
            </h1>
            <p className="text-purple-500 text-sm font-bold">
              궁금한 글을 분석해볼까요? 🎯
            </p>
          </div>

          {/* 상단 사용량 안내 - 귀여운 스타일 */}
          {userInfo && (
            <div className="mb-4 p-3 bg-white rounded-2xl shadow-lg border-2 border-pink-200 flex justify-between items-center">
              <span className="text-purple-600 font-bold text-sm">
                {userInfo.is_premium ? "💎 VIP 친구!" : "🌟 우리 친구"}
              </span>
              {!userInfo.is_premium && (
                <div className="flex items-center gap-2">
                  <span className="text-pink-500 text-sm">오늘 남은 찬스:</span>
                  <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-3 py-1 rounded-full font-bold text-sm">
                    {userInfo.remaining_count} / {userInfo.max_count}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Play Track은 초등학생 고정 (학년 선택 불필요) */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* 텍스트 입력 카드 */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-pink-200 flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-purple-600 flex items-center gap-2">
                ✍️ 글 분석하기
              </h2>
              <textarea
                className="w-full flex-1 min-h-[150px] p-4 border-2 border-pink-300 rounded-2xl focus:border-pink-400 outline-none text-base resize-none bg-white text-gray-800 placeholder-purple-500 font-bold"
                placeholder="분석하고 싶은 글을 여기에 써보세요! 📝"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                onClick={handleAnalyze}
                disabled={
                  loading ||
                  !text ||
                  (userInfo &&
                    !userInfo.is_premium &&
                    userInfo.remaining_count <= 0)
                }
                className={`w-full mt-6 py-3 rounded-xl font-bold text-base transition-all shadow-md ${
                  !loading &&
                  text &&
                  !(
                    userInfo &&
                    !userInfo.is_premium &&
                    userInfo.remaining_count <= 0
                  )
                    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500"
                    : "bg-white border-2 border-pink-300 text-pink-600"
                }`}
              >
                {loading ? "🔍 분석 중..." : "🚀 분석 시작!"}
              </button>
            </div>

            {/* 이미지 업로드 카드 */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-pink-200 flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-purple-600 flex items-center gap-2">
                📷 사진 분석하기
              </h2>
              <div className="flex-1 flex flex-col justify-center bg-white rounded-2xl p-4 border-2 border-pink-300">
                <p className="text-purple-500 mb-3 text-sm font-bold">
                  책이나 글을 사진 찍어서 올려보세요! 📚
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="block w-full text-sm text-purple-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-bold file:bg-pink-200 file:text-pink-700 hover:file:bg-pink-300"
                />
              </div>
              <button
                onClick={handleImageAnalyze}
                disabled={
                  loading ||
                  !file ||
                  (userInfo &&
                    !userInfo.is_premium &&
                    userInfo.remaining_count <= 0)
                }
                className={`w-full mt-6 py-3 rounded-xl font-bold text-base transition-all shadow-md ${
                  !loading &&
                  file &&
                  !(
                    userInfo &&
                    !userInfo.is_premium &&
                    userInfo.remaining_count <= 0
                  )
                    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500"
                    : "bg-white border-2 border-pink-300 text-pink-600"
                }`}
              >
                {loading ? "🔍 읽는 중..." : "📸 사진 분석!"}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 mb-4 bg-red-100 border-2 border-red-200 text-red-500 rounded-xl text-sm font-bold text-center">
              😢 {error}
            </div>
          )}

          {/* 결과 표시 - 귀여운 스타일 */}
          {result && (
            <div className="bg-white p-5 rounded-2xl shadow-xl border-2 border-purple-200">
              <h2 className="text-xl font-bold mb-4 text-purple-600 text-center">
                🎉 분석 완료!
              </h2>
              <div className="space-y-4">
                {/* 작품 정보 표시 */}
                {(result.detected_title || result.detected_author) && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl border border-blue-200">
                    <p className="font-bold text-blue-600 text-sm mb-1">
                      📚 작품 정보
                    </p>
                    <p className="text-gray-700 text-sm">
                      <span className="font-medium">제목:</span>{" "}
                      {result.detected_title || "제목 미상"} ・
                      <span className="font-medium ml-1">작가:</span>{" "}
                      {result.detected_author || "작가 미상"}
                      {result.detected_genre &&
                        result.detected_genre !== "기타" && (
                          <span className="ml-1">
                            ・ <span className="font-medium">장르:</span>{" "}
                            {result.detected_genre}
                          </span>
                        )}
                    </p>
                  </div>
                )}
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-xl border border-pink-100">
                  <h3 className="text-base font-bold text-pink-500 mb-2 flex items-center gap-2">
                    💡 AI 선생님의 설명
                  </h3>
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {result.explanation}
                  </div>
                </div>
                {result.mbti && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
                      <p className="font-bold text-purple-600 text-sm">
                        🧠 주인공의 성격!
                      </p>
                      <p className="text-purple-500 mt-1 text-base">
                        {result.mbti}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl border border-orange-200">
                      <p className="font-bold text-orange-500 text-sm">
                        💬 카톡 스타일!
                      </p>
                      <p className="text-orange-600 mt-1 text-sm">
                        {result.chat_version}
                      </p>
                    </div>
                  </div>
                )}
                {result.summary && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 mt-4">
                    <p className="font-bold text-blue-600 text-sm mb-1 flex items-center gap-2">
                      📝 핵심 요약
                    </p>
                    <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ========================================
  // Pro Track UI (중/고등학생용)
  // ========================================
  const bgClass = isDarkMode ? "bg-neutral-950" : "bg-gray-50";
  const textClass = isDarkMode ? "text-gray-100" : "text-black";
  const cardClass = isDarkMode
    ? "bg-neutral-900 border-neutral-800"
    : "bg-white border-gray-100";
  const inputClass = isDarkMode
    ? "bg-neutral-800 border-neutral-700 text-gray-100 placeholder-gray-500"
    : "border-gray-300 text-black";

  return (
    <main className={`min-h-screen p-8 ${bgClass} ${textClass}`}>
      <div className="max-w-4xl mx-auto">
        {/* 뒤로가기 버튼 */}
        <Link
          href="/learn"
          className={`inline-flex items-center gap-2 mb-4 font-medium transition-colors ${
            isDarkMode
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ← 학습 선택으로
        </Link>

        <h1
          className={`text-3xl font-bold mb-8 ${
            isDarkMode ? "text-blue-400" : "text-blue-600"
          }`}
        >
          📝 AI 국어 분석
        </h1>

        {/* 상단 실시간 사용량 안내바 */}
        {userInfo && (
          <div
            className={`mb-6 p-4 rounded-xl shadow-sm border flex justify-between items-center ${cardClass}`}
          >
            <span
              className={`font-medium ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {userInfo.is_premium
                ? "💎 프리미엄 무제한 이용 중"
                : "🆓 일반 회원 이용 중"}
            </span>
            {!userInfo.is_premium && (
              <span className="text-sm">
                오늘 남은 횟수:{" "}
                <span
                  className={`font-bold ${
                    isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  {userInfo.remaining_count}
                </span>{" "}
                / {userInfo.max_count}회
              </span>
            )}
          </div>
        )}

        {/* 학년 선택은 마이페이지에서 설정 */}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* 왼쪽: 텍스트 입력창 */}
          <div className={`p-6 rounded-xl shadow-md border ${cardClass}`}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              ✍️ 작품 텍스트 분석
            </h2>
            <textarea
              className={`w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none ${inputClass}`}
              placeholder="분석할 문장을 입력하세요..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              onClick={handleAnalyze}
              disabled={
                loading ||
                !text ||
                (userInfo &&
                  !userInfo.is_premium &&
                  userInfo.remaining_count <= 0)
              }
              className="w-full mt-4 bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {loading
                ? "분석 중..."
                : userInfo?.remaining_count === 0 && !userInfo?.is_premium
                  ? "무료 횟수 소진"
                  : "텍스트 분석하기"}
            </button>
          </div>

          {/* 오른쪽: 이미지 업로드 */}
          <div
            className={`p-6 rounded-xl shadow-md border ${cardClass} flex flex-col justify-between`}
          >
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                📷 작품 이미지 분석
              </h2>
              <p
                className={`text-sm mb-4 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                시나 소설 본문을 사진 찍어서 올려보세요.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${
                  isDarkMode
                    ? "text-gray-400 file:bg-slate-700 file:text-blue-400 hover:file:bg-slate-600"
                    : "text-gray-500 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                }`}
              />
            </div>
            <button
              onClick={handleImageAnalyze}
              disabled={
                loading ||
                !file ||
                (userInfo &&
                  !userInfo.is_premium &&
                  userInfo.remaining_count <= 0)
              }
              className="w-full mt-4 bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 disabled:bg-gray-400 transition-colors"
            >
              {loading
                ? "글자를 읽고 있습니다..."
                : userInfo?.remaining_count === 0 && !userInfo?.is_premium
                  ? "무료 횟수 소진"
                  : "이미지 분석하기"}
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div
            className={`p-4 mb-8 rounded-lg border ${
              isDarkMode
                ? "bg-red-900/30 border-red-800 text-red-400"
                : "bg-red-50 border-red-200 text-red-600"
            }`}
          >
            {error}
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <div
            className={`p-8 rounded-2xl shadow-lg border-t-8 border-blue-500 ${cardClass}`}
          >
            <h2
              className={`text-2xl font-bold mb-6 flex items-center gap-2 ${
                isDarkMode ? "text-gray-100" : "text-gray-800"
              }`}
            >
              📊 분석 결과
            </h2>
            <div className="space-y-6">
              {/* 작품 정보 표시 */}
              {(result.detected_title || result.detected_author) && (
                <div
                  className={`p-4 rounded-xl border ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <p
                    className={`font-bold text-sm mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    📚 작품 정보
                  </p>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <span className="font-medium">제목:</span>{" "}
                    {result.detected_title || "제목 미상"} |{" "}
                    <span className="font-medium">작가:</span>{" "}
                    {result.detected_author || "작가 미상"}
                    {result.detected_genre &&
                      result.detected_genre !== "기타" && (
                        <>
                          {" "}
                          | <span className="font-medium">장르:</span>{" "}
                          {result.detected_genre}
                        </>
                      )}
                  </p>
                </div>
              )}
              <div>
                <h3
                  className={`text-lg font-bold mb-2 ${
                    isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  💡 AI 해설
                </h3>
                <div
                  className={`p-5 rounded-xl leading-relaxed whitespace-pre-wrap border ${
                    isDarkMode
                      ? "bg-slate-700 text-gray-200 border-slate-600"
                      : "bg-blue-50 text-gray-700 border-blue-100"
                  }`}
                >
                  {result.explanation}
                </div>
              </div>
              {result.mbti && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-xl border ${
                      isDarkMode
                        ? "bg-purple-900/30 border-purple-800"
                        : "bg-purple-50 border-purple-100"
                    }`}
                  >
                    <p
                      className={`font-bold ${
                        isDarkMode ? "text-purple-300" : "text-purple-800"
                      }`}
                    >
                      🧠 화자(주인공)의 예상 MBTI
                    </p>
                    <p
                      className={`mt-1 ${
                        isDarkMode ? "text-purple-200" : "text-purple-700"
                      }`}
                    >
                      {result.mbti}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-xl border ${
                      isDarkMode
                        ? "bg-orange-900/30 border-orange-800"
                        : "bg-orange-50 border-orange-100"
                    }`}
                  >
                    <p
                      className={`font-bold ${
                        isDarkMode ? "text-orange-300" : "text-orange-800"
                      }`}
                    >
                      💬 카톡 답장 스타일
                    </p>
                    <p
                      className={`mt-1 ${
                        isDarkMode ? "text-orange-200" : "text-orange-700"
                      }`}
                    >
                      {result.chat_version}
                    </p>
                  </div>
                </div>
              )}
              {result.summary && (
                <div
                  className={`p-5 rounded-xl border mt-6 ${
                    isDarkMode
                      ? "bg-blue-900/30 border-blue-800"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <p
                    className={`font-bold mb-2 flex items-center gap-2 ${
                      isDarkMode ? "text-blue-300" : "text-blue-800"
                    }`}
                  >
                    📝 핵심 요약
                  </p>
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      isDarkMode ? "text-blue-100" : "text-blue-900"
                    }`}
                  >
                    {result.summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
