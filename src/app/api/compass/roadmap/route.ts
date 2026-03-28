import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RoadmapRequestSchema, RoadmapResponseSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const systemPrompt = `
あなたは「Life Reverse-Engineering Engine」です。
ユーザーの最終ゴールと期間を受け取り、そこから逆算したロードマップ（マイルストーン）を生成してください。

## 出力形式
必ず以下のJSON形式で回答してください。マークダウン装飾は不要です。

{
  "goal": "ユーザーの最終ゴール",
  "timeframe": "達成期間",
  "milestones": [
    {
      "period": "タイムライン上の時期（必ず「〇年後」「〇ヶ月後」「今月」のいずれかの形式で記載すること。「今週」「来月」「第1フェーズ」などの表記は使わない）",
      "title": "マイルストーンのタイトル",
      "description": "具体的に何を達成するか（2-3文）",
      "keyActions": ["そのために今すぐ始められるアクション1", "アクション2"]
    }
  ]
}

## ルール
- マイルストーンは**最終ゴールから逆算**して、5〜7つ程度生成してください。
- 最も遠い未来から現在に向かって並べてください。
- 最後のマイルストーンは必ず「今月」にし、すぐに着手できる具体的なアクションを含めてください。
- 各マイルストーンは前のマイルストーンの達成を前提とした、論理的なステップにしてください。
- 日本語で回答してください。
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = RoadmapRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { goal, timeframe } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(
      `## ユーザーの目標\nゴール: ${goal.trim()}\n達成期間: ${timeframe.trim()}`
    );
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const roadmap = RoadmapResponseSchema.parse(JSON.parse(jsonString));
      return NextResponse.json(roadmap);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Error in roadmap generation API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 });
  }
}
