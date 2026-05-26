import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RealityCheckRequestSchema, RealityCheckResponseSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const systemPrompt = `
あなたは「Reality Check Engine」です。
ユーザーのロードマップ（目標・期間・マイルストーン）を受け取り、現状の進捗を分析して率直なフィードバックを提供してください。

## 出力形式
必ず以下のJSON形式で回答してください。マークダウン装飾は不要です。

{
  "progressSummary": "現在の進捗状況の概要（2〜3文。インポート済みのマイルストーン数などを踏まえて具体的に）",
  "issues": ["問題点・懸念事項1", "問題点・懸念事項2"],
  "pivotSuggestions": ["軌道修正の提案1", "軌道修正の提案2"],
  "overallStatus": "on-track または at-risk または off-track のいずれか"
}

## overallStatusの判断基準
- "on-track": 計画通りに進んでいる。インポート済みマイルストーンの割合が高い、または着実にステップを踏んでいる。
- "at-risk": やや遅れ気味、または一部のマイルストーンが未着手。軌道修正すれば達成可能。
- "off-track": 大幅に遅れているか、根本的な見直しが必要な状況。

## ルール
- インポート済み（isImported: true）のマイルストーンは「着手済み」として扱ってください。
- 全マイルストーンが未インポートの場合は、まだ動き出していない状態として評価してください。
- issuesとpivotSuggestionsはそれぞれ1〜3項目を目安に、具体的な内容を記載してください。
- 日本語で回答してください。
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = RealityCheckRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", errorCode: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
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

    const milestoneLines = milestones
      .map((m, i) => `${i + 1}. [${m.isImported ? "着手済み" : "未着手"}] ${m.period}: ${m.title}（Key Actions: ${m.keyActions.join(", ") || "なし"}）`)
      .join("\n");

    const prompt = `## ロードマップ情報\n目標: ${goal}\n期間: ${timeframe}\n\n## マイルストーン一覧\n${milestoneLines}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const data = RealityCheckResponseSchema.parse(JSON.parse(jsonString));
      return NextResponse.json(data);
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
