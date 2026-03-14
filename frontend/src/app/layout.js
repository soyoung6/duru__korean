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
  title: "두루국어 - AI 국어 분석",
  description: "AI로 분석하는 국어의 모든 것",
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
