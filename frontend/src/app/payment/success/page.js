"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentSuccess() {
  useAuth();

  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("결제 승인 처리 중...");

  useEffect(() => {
    const pg_token = searchParams.get("pg_token");
    const user_id = searchParams.get("user_id");

    if (pg_token && user_id) {
      fetch(
        `http://127.0.0.1:8000/payment/approve?pg_token=${pg_token}&user_id=${user_id}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setStatus("🎉 결제 완료! 프리미엄 회원이 되셨습니다!");
            setTimeout(() => router.replace("/mypage"), 2000);
          } else {
            setStatus("❌ 결제 승인 실패: " + JSON.stringify(data.detail));
          }
        })
        .catch(() => setStatus("⚠️ 서버 통신 오류"));
    } else {
      setStatus("⚠️ 잘못된 접근입니다.");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">{status}</h1>
        <p className="text-gray-600">잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}
