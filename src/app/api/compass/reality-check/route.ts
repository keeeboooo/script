import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RealityCheckRequestSchema, RealityCheckResponseSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const systemPrompt = `
あなたは「Reality Check Engine」です。
ユーザーのロードマップ（ゴール・期間・マイルストーン）と各マイルストーンの進捗状況を受け取り、
現状を客観的に分析して進捗レビューと改善提案を行ってください。

## 出力形式
必ず以下のJSON形式で回答してください。マークダウン装飾は不要です。

{
  "overallStatus": "on_track" | "at_risk" | "behind" | "ahead",
  "progressSummary": "全体の進捗を2〜3文で要約",
  "issues": ["課題1", "課題2"],
  "pivotSuggestions": ["改善・ピボット提案1", "提案2"]
}

## overallStatus の判定基準
- "ahead": 期待以上の進捗（完了済みマイルストーンが多い）
- "on_track": 順調に進んでいる
- "at_risk": このまま続けると遅延リスクがある
- "behind": 明らかに遅延している（またはほとんど着手できていない）

## ルール
- issues は最大3つ、pivotSuggestions は最大3つに絞ること。
- "isCompleted: true" のマイルストーンは達成済み、"isImported: true" は着手済みの代替として扱う。
- 課題と提案は具体的かつ実行可能な内容にすること。
- 日本語で回答してください。
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = RealityCheckRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", errorCode: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    }

    const { goal, timeframe, milestones } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured", errorCode: "API_KEY_MISSING" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    const milestoneList = milestones
      .map((m, i) => {
        const status = m.isCompleted ? "✅ 完了" : m.isImported ? "🔄 着手済み" : "⬜ 未着手";
        return `${i + 1}. [${status}] ${m.period}: ${m.title}\n   ${m.description}`;
      })
      .join("\n");

    const result = await model.generateContent(
      `## ロードマップ\nゴール: ${goal.trim()}\n期間: ${timeframe.trim()}\n\n## マイルストーンの進捗\n${milestoneList}`
    );
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const realityCheck = RealityCheckResponseSchema.parse(JSON.parse(jsonString));
      return NextResponse.json(realityCheck);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", errorCode: "AI_PARSE_FAILURE" }, { status: 502 });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", errorCode: "VALIDATION_ERROR" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) {
      return NextResponse.json({ error: "Rate limited", errorCode: "RATE_LIMIT" }, { status: 429 });
    }
    console.error("Error in reality-check API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to run reality check", errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
