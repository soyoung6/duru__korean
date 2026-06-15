"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const sampleText =
  "윤동주의 '서시'는 부끄러움 없는 삶을 바라면서도 현실 속에서 흔들리는 화자의 마음을 보여 준다. 하늘과 바람, 별은 화자가 지키고 싶은 순수한 마음의 기준처럼 읽힌다.";

const demoResponse = {
  detected_title: "서시",
  detected_author: "윤동주",
  detected_genre: "현대시",
  explanation:
    "이 글의 핵심은 화자가 스스로에게 부끄럽지 않은 삶을 살고 싶어 한다는 점입니다. '하늘', '바람', '별' 같은 이미지는 맑고 바른 삶의 기준을 보여 주며, 화자의 다짐을 더 선명하게 만듭니다. 시험에서는 화자의 태도, 상징적 소재, 자기 성찰의 분위기를 함께 묶어 이해하면 좋습니다.",
  mbti: "INFJ",
  chat_version:
    "이 작품은 조용하지만 꽤 단단해. 겉으로 크게 외치지는 않지만, 자기 기준을 끝까지 지키려는 마음이 보여.",
  summary: "부끄럽지 않은 삶을 향한 화자의 자기 성찰과 다짐을 담은 시입니다.",
};

const modeLabels = {
  ELEMENTARY: "초등",
  MIDDLE: "중등",
  HIGH: "고등",
};

function makePrompt(text, mode) {
  return `You are a Korean literature tutor for ${modeLabels[mode]} students.
Return only valid JSON with these keys:
detected_title, detected_author, detected_genre, explanation, mbti, chat_version, summary.
Analyze this Korean text in Korean:
${text}`;
}

function normalizeResult(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export default function HomePage() {
  const [text, setText] = useState(sampleText);
  const [mode, setMode] = useState("MIDDLE");
  const [provider, setProvider] = useState("demo");
  const [apiKey, setApiKey] = useState("");
  const [saveKey, setSaveKey] = useState(false);
  const [result, setResult] = useState(demoResponse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedKey = localStorage.getItem("duru_gemini_api_key") || "";
    if (storedKey) {
      setApiKey(storedKey);
      setSaveKey(true);
    }
  }, []);

  const canUseGemini = useMemo(
    () => provider === "gemini" && apiKey.trim().length > 0,
    [apiKey, provider],
  );

  const handleAnalyze = async () => {
    setError("");
    setLoading(true);

    try {
      if (provider === "demo") {
        await new Promise((resolve) => setTimeout(resolve, 350));
        setResult({
          ...demoResponse,
          explanation:
            text.length > 40
              ? demoResponse.explanation
              : "짧은 지문이라도 핵심 정서와 표현을 먼저 잡으면 분석이 쉬워집니다. 이 데모 응답은 실제 API 없이 화면 흐름을 확인하기 위한 예시입니다.",
        });
        return;
      }

      if (!canUseGemini) {
        throw new Error("Gemini API 키를 입력하거나 더미 답변 모드를 선택해 주세요.");
      }

      if (saveKey) {
        localStorage.setItem("duru_gemini_api_key", apiKey.trim());
      } else {
        localStorage.removeItem("duru_gemini_api_key");
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
          apiKey.trim(),
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: makePrompt(text, mode) }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
            },
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Gemini 요청 실패: ${message}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Gemini 응답을 읽을 수 없습니다.");
      }

      setResult(normalizeResult(rawText));
    } catch (err) {
      setError(err.message || "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#1f2933]">
      <section className="border-b border-[#dad7cd] bg-[#233d4d] text-white">
        <div className="mx-auto grid min-h-[620px] max-w-6xl gap-10 px-5 py-10 md:grid-cols-[0.95fr_1.05fr] md:items-center md:px-8">
          <div className="space-y-7">
            <div className="inline-flex rounded-full border border-white/25 px-3 py-1 text-sm text-[#fcca46]">
              Duru Korean
            </div>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-6xl">
                국어 지문을 바로 읽고, 이해하고, 연습하는 AI 학습 홈
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#e7ecef] md:text-lg">
                서버 API 없이도 더미 답변으로 체험할 수 있고, 사용자가 자기 Gemini API 키를 넣으면 브라우저에서 바로 AI 분석을 실행할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="#demo"
                className="rounded-md bg-[#fcca46] px-5 py-3 font-bold text-[#233d4d] transition hover:bg-[#f9bd18]"
              >
                바로 체험하기
              </a>
              <Link
                href="/login"
                className="rounded-md bg-white px-5 py-3 font-bold text-[#233d4d] transition hover:bg-[#edf2f4]"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-white/35 px-5 py-3 font-bold text-white transition hover:bg-white/10"
              >
                계정 만들기
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-white/15 bg-white p-4 text-[#1f2933] shadow-2xl">
            <div className="grid gap-3 sm:grid-cols-3">
              {["초등 친화", "내신 대비", "수능 분석"].map((item) => (
                <div key={item} className="rounded-md bg-[#f7f7f2] p-4">
                  <p className="text-sm font-bold text-[#619b8a]">{item}</p>
                  <p className="mt-2 text-xs leading-5 text-[#4b5563]">
                    학년과 목적에 맞춰 설명 톤과 분석 깊이를 바꿉니다.
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md bg-[#1f2933] p-5 text-white">
              <p className="text-sm font-bold text-[#fcca46]">분석 예시</p>
              <p className="mt-3 leading-7">
                시적 화자의 태도, 핵심 상징, 시험 포인트를 한 번에 정리합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">AI 분석 데모</h2>
            <p className="mt-2 text-sm text-[#52616b]">
              더미 모드로 배포 화면을 확인하거나, 본인 API 키로 실제 응답을 받아볼 수 있습니다.
            </p>
          </div>
          <div className="flex rounded-md border border-[#c8c5b9] bg-white p-1">
            {["demo", "gemini"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setProvider(item)}
                className={`rounded px-4 py-2 text-sm font-bold ${
                  provider === item
                    ? "bg-[#619b8a] text-white"
                    : "text-[#52616b] hover:bg-[#f0f0e8]"
                }`}
              >
                {item === "demo" ? "더미 답변" : "내 API 키"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-[#dad7cd] bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.keys(modeLabels).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`rounded-md border px-3 py-2 text-sm font-bold ${
                    mode === key
                      ? "border-[#233d4d] bg-[#233d4d] text-white"
                      : "border-[#dad7cd] bg-white text-[#52616b]"
                  }`}
                >
                  {modeLabels[key]}
                </button>
              ))}
            </div>

            {provider === "gemini" && (
              <div className="mt-4 rounded-md border border-[#dad7cd] bg-[#f7f7f2] p-4">
                <label className="text-sm font-bold text-[#233d4d]" htmlFor="api-key">
                  Gemini API 키
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="mt-2 w-full rounded-md border border-[#c8c5b9] px-3 py-2 text-sm outline-none focus:border-[#619b8a]"
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-[#52616b]">
                  <input
                    type="checkbox"
                    checked={saveKey}
                    onChange={(e) => setSaveKey(e.target.checked)}
                  />
                  이 브라우저에만 저장
                </label>
              </div>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-4 h-56 w-full resize-none rounded-md border border-[#c8c5b9] p-4 leading-7 outline-none focus:border-[#619b8a]"
            />

            {error && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="mt-4 w-full rounded-md bg-[#fe7f2d] px-5 py-3 font-bold text-white transition hover:bg-[#e66f24] disabled:bg-[#c8c5b9]"
            >
              {loading ? "분석 중..." : "분석하기"}
            </button>
          </div>

          <div className="rounded-lg border border-[#dad7cd] bg-white p-5">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded bg-[#edf6f3] px-3 py-1 font-bold text-[#317163]">
                {result.detected_title}
              </span>
              <span className="rounded bg-[#fff5d6] px-3 py-1 font-bold text-[#8a6500]">
                {result.detected_author}
              </span>
              <span className="rounded bg-[#f0f0e8] px-3 py-1 font-bold text-[#52616b]">
                {result.detected_genre}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <ResultBlock title="핵심 해설" content={result.explanation} />
              <ResultBlock title="예상 MBTI" content={result.mbti} compact />
              <ResultBlock title="학생 말투 요약" content={result.chat_version} />
              <ResultBlock title="요약" content={result.summary} compact />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#dad7cd] bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:grid-cols-3 md:px-8">
          <InfoBlock
            title="계속 띄워두는 방법"
            body="프론트는 Vercel이나 Netlify에, 백엔드는 Render나 Railway 같은 서비스에 올리면 24시간 접근 가능한 주소를 만들 수 있습니다."
          />
          <InfoBlock
            title="API 없이 체험"
            body="더미 답변 모드는 비용 없이 UI와 학습 흐름을 보여 주는 데 적합합니다. 포트폴리오나 발표용으로 바로 사용할 수 있습니다."
          />
          <InfoBlock
            title="사용자 키 사용"
            body="사용자 API 키는 서버에 저장하지 않고 브라우저에서만 사용합니다. 공개 서비스에서는 사용량 안내와 보안 고지가 필요합니다."
          />
        </div>
      </section>
    </main>
  );
}

function ResultBlock({ title, content, compact = false }) {
  return (
    <div className="rounded-md border border-[#dad7cd] bg-[#fbfbf8] p-4">
      <h3 className="text-sm font-bold text-[#233d4d]">{title}</h3>
      <p className={`mt-2 whitespace-pre-wrap text-[#394955] ${compact ? "text-base font-bold" : "text-sm leading-7"}`}>
        {content}
      </p>
    </div>
  );
}

function InfoBlock({ title, body }) {
  return (
    <div>
      <h3 className="font-bold text-[#233d4d]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#52616b]">{body}</p>
    </div>
  );
}
