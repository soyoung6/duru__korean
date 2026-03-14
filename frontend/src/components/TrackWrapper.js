"use client";

import { useTrack } from "@/contexts/TrackContext";

export default function TrackWrapper({ children }) {
  const { track, isDarkMode, isLoaded } = useTrack();

  // 클래스 결정
  const trackClass = track === "play" ? "track-play" : "track-pro";
  const darkClass = track === "pro" && isDarkMode ? "dark" : "";

  // 로딩 전에는 기본 스타일로 렌더링
  if (!isLoaded) {
    return <div className="track-pro">{children}</div>;
  }

  return <div className={`${trackClass} ${darkClass}`.trim()}>{children}</div>;
}
