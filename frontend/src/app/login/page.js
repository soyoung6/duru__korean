"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/utils/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("token")) {
      router.replace("/history");
    }
  }, [router]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      router.replace("/select-track");
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 py-12 text-[#1f2933]">
      <div className="w-full max-w-md rounded-lg border border-[#dad7cd] bg-white p-8 shadow-xl">
        <Link href="/" className="text-sm font-bold text-[#619b8a] hover:text-[#317163]">
          Duru Korean
        </Link>
        <h1 className="mt-4 text-3xl font-bold">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-[#52616b]">
          기존 계정으로 학습 기록, 분석 결과, 연습 문제를 이어서 사용할 수 있습니다.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#233d4d]" htmlFor="username">
              아이디
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#c8c5b9] px-3 py-3 outline-none focus:border-[#619b8a]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#233d4d]" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#c8c5b9] px-3 py-3 outline-none focus:border-[#619b8a]"
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#233d4d] px-5 py-3 font-bold text-white transition hover:bg-[#1a2f3c] disabled:bg-[#c8c5b9]"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#52616b]">
          계정이 없다면{" "}
          <Link href="/signup" className="font-bold text-[#fe7f2d] hover:text-[#d9651f]">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
