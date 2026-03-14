"use client";

import { createContext, useContext, useState, useEffect } from "react";

const TrackContext = createContext(undefined);

export function TrackProvider({ children }) {
  // 트랙 상태: "play" (초등) 또는 "pro" (중/고등)
  const [track, setTrackState] = useState("pro");
  // Pro Track 전용 다크모드
  const [isDarkMode, setIsDarkMode] = useState(false);
  // 학년 설정 (ELEMENTARY, MIDDLE, HIGH)
  const [grade, setGradeState] = useState("MIDDLE");
  const [isLoaded, setIsLoaded] = useState(false);

  // 초기 로드 시 localStorage에서 트랙 설정 불러오기
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTrack = localStorage.getItem("duru_track");
      const savedDarkMode = localStorage.getItem("duru_dark_mode");
      const savedGrade = localStorage.getItem("duru_grade");

      if (savedTrack) {
        setTrackState(savedTrack);
      }
      if (savedDarkMode) {
        setIsDarkMode(savedDarkMode === "true");
      }
      if (savedGrade) {
        setGradeState(savedGrade);
      }
      setIsLoaded(true);
    }
  }, []);

  // 트랙 변경 함수 (localStorage에도 저장)
  const setTrack = (newTrack) => {
    setTrackState(newTrack);
    if (typeof window !== "undefined") {
      localStorage.setItem("duru_track", newTrack);
    }
    // 트랙 변경 시 기본 학년으로 설정
    const newGrade = newTrack === "play" ? "ELEMENTARY" : "MIDDLE";
    setGradeState(newGrade);
    if (typeof window !== "undefined") {
      localStorage.setItem("duru_grade", newGrade);
    }
  };

  // 학년 변경 함수
  const setGrade = (newGrade) => {
    setGradeState(newGrade);
    if (typeof window !== "undefined") {
      localStorage.setItem("duru_grade", newGrade);
    }
  };

  // 다크모드 토글 함수
  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    if (typeof window !== "undefined") {
      localStorage.setItem("duru_dark_mode", String(newValue));
    }
  };

  // 학년 레벨 기본값 반환 (트랙에 따라)
  const getDefaultGrade = () => {
    return track === "play" ? "ELEMENTARY" : grade;
  };

  return (
    <TrackContext.Provider
      value={{
        track,
        setTrack,
        isDarkMode,
        toggleDarkMode,
        isLoaded,
        grade,
        setGrade,
        getDefaultGrade,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
}

// 커스텀 훅: 컨텍스트 사용
export function useTrack() {
  const context = useContext(TrackContext);
  if (context === undefined) {
    throw new Error("useTrack must be used within a TrackProvider");
  }
  return context;
}
