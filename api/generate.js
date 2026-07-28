// api/generate.js
// Vercel 서버리스 함수 (Node.js runtime)
// 프론트엔드(index.html)에서 { problem, intensity } 를 POST로 받아
// Gemini API를 호출한 뒤, 숏폼 제한 설정 + 예상 절약 시간을 JSON으로 반환합니다.
//
// 필요한 환경변수:
//   GEMINI_API_KEY  - Google AI Studio에서 발급받은 Gemini API 키

const GEMINI_MODEL = "gemini-2.0-flash";

const INTENSITY_LABELS = {
  low: "약한 제한 (부드럽게 습관을 개선하는 단계)",
  medium: "보통 제한 (일상과 절제의 균형을 맞추는 단계)",
  high: "강한 제한 (사용을 강력하게 차단하는 단계)",
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    intensity_label: {
      type: "STRING",
      description: "적용된 제한 강도를 설명하는 한국어 라벨",
    },
    daily_limit_minutes: {
      type: "INTEGER",
      description: "하루 숏폼 사용 제한 시간(분)",
    },
    grayscale_enabled: {
      type: "BOOLEAN",
      description: "제한 시간 도달 시 화면을 흑백으로 전환할지 여부",
    },
    block_message: {
      type: "STRING",
      description: "제한 도달 시 사용자에게 보여줄 메시지 (한 문장, 한국어)",
    },
    estimated_saved_minutes_per_day: {
      type: "INTEGER",
      description: "이 설정으로 절약될 것으로 예상되는 하루 시간(분)",
    },
    estimated_saved_hours_per_month: {
      type: "NUMBER",
      description: "이 설정으로 절약될 것으로 예상되는 한 달 시간(시간 단위, 소수점 가능)",
    },
    tips: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "사용자의 문제 상황에 맞춘 실천 팁 3가지 (한국어, 각 1문장)",
    },
    summary: {
      type: "STRING",
      description: "사용자의 상황을 짚어주는 2~3문장 요약 및 공감 코멘트 (한국어)",
    },
  },
  required: [
    "intensity_label",
    "daily_limit_minutes",
    "grayscale_enabled",
    "block_message",
    "estimated_saved_minutes_per_day",
    "estimated_saved_hours_per_month",
    "tips",
    "summary",
  ],
};

function buildSystemPrompt(intensityLabel) {
  return [
    "당신은 사용자의 숏폼(쇼츠·릴스·틱톡 등) 사용 습관을 진단하고 디지털 웰빙 코치입니다.",
    "사용자가 설명하는 문제 상황을 분석해서, 선택된 제한 강도에 맞는 구체적이고 현실적인 앱 제한 설정을 설계하세요.",
    `이번 요청의 제한 강도는 "${intensityLabel}" 입니다.`,
    "규칙:",
    "- daily_limit_minutes는 강도가 약할수록 넉넉하게(예: 40~60분), 강할수록 짧게(예: 10~20분) 설정하세요.",
    "- grayscale_enabled는 강도가 '보통' 이상일 때 true로 설정하는 것을 기본으로 하되, 상황에 맞게 판단하세요.",
    "- block_message는 사용자를 다그치지 않고 담담하게 행동을 유도하는 한 문장으로 작성하세요.",
    "- estimated_saved_minutes_per_day와 estimated_saved_hours_per_month는 사용자가 설명한 현재 사용 패턴을 근거로 현실적으로 추정하세요.",
    "- tips는 사용자가 말한 구체적인 상황(예: 자기 전, 식사 중 등)에 맞춰 실천 가능한 팁으로 작성하세요.",
    "- 반드시 지정된 JSON 스키마 형식으로만, 한국어로 응답하세요.",
  ].join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { problem, intensity } = body;

    if (!problem || typeof problem !== "string" || !problem.trim()) {
      return res.status(400).json({ error: "숏폼 사용 문제 상황을 입력해주세요." });
    }
    if (problem.length > 2000) {
      return res.status(400).json({ error: "입력이 너무 깁니다. 2000자 이내로 작성해주세요." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "서버에 GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다.",
      });
    }

    const intensityLabel = INTENSITY_LABELS[intensity] || INTENSITY_LABELS.medium;
    const systemPrompt = buildSystemPrompt(intensityLabel);
    const userPrompt = `사용자가 겪는 숏폼 사용 문제:\n"""\n${problem.trim()}\n"""`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.7,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return res.status(502).json({
        error: "AI 응답을 받아오지 못했습니다. 잠시 후 다시 시도해주세요.",
      });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Unexpected Gemini response shape:", JSON.stringify(data));
      return res.status(502).json({ error: "AI 응답 형식을 해석할 수 없습니다." });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, text);
      return res.status(502).json({ error: "AI 응답을 처리하는 중 오류가 발생했습니다." });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Unhandled error in /api/generate:", err);
    return res.status(500).json({ error: "알 수 없는 서버 오류가 발생했습니다." });
  }
};
