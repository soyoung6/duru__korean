"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    nickname: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.password.length < 4) {
      setError("비밀번호는 4자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          nickname: formData.nickname,
          user_mode: "PRO",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "회원가입에 실패했습니다.");
      }

      router.push("/login");
    } catch (err) {
      setError(err.message || "서버 연결에 실패했습니다.");
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
        <h1 className="mt-4 text-3xl font-bold">회원가입</h1>
        <p className="mt-2 text-sm leading-6 text-[#52616b]">
          계정을 만들면 분석 기록과 연습 문제를 이어서 관리할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextInput
            label="아이디"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <TextInput
            label="닉네임"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            required
          />
          <TextInput
            label="비밀번호"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <TextInput
            label="비밀번호 확인"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#fe7f2d] px-5 py-3 font-bold text-white transition hover:bg-[#d9651f] disabled:bg-[#c8c5b9]"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#52616b]">
          이미 계정이 있다면{" "}
          <Link href="/login" className="font-bold text-[#233d4d] hover:text-[#111f28]">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}

function TextInput({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#233d4d]" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-md border border-[#c8c5b9] px-3 py-3 outline-none focus:border-[#619b8a]"
        required={required}
      />
    </div>
  );
}
