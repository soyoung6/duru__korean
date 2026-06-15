import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { TrackProvider } from "@/contexts/TrackContext";
import TrackWrapper from "@/components/TrackWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Duru Korean - AI 국어 학습",
  description: "AI와 더미 응답으로 체험할 수 있는 국어 지문 분석 학습 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TrackProvider>
          <TrackWrapper>
            <Navbar />
            {children}
          </TrackWrapper>
        </TrackProvider>
      </body>
    </html>
  );
}
