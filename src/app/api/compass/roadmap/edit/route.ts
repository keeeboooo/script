import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MilestoneSchema, RoadmapResponseSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const EditRoadmapRequestSchema = z.object({
  goal: z.string().min(1),
  timeframe: z.string().min(1),
  currentMilestones: z.array(MilestoneSchema),
  instruction: z.string().min(1),
});

const systemPrompt = `
あなたは「Life Reverse-Engineering Engine」です。
ユーザーの最終ゴール、達成期間、現在のロードマップ（マイルストーン一覧）、および修正指示を受け取ります。
修正指示に従って、ロードマップを再構成してください。
修正対象でないマイルストーンは可能な限りそのまま維持してください。

## 出力形式
必ず以下のJSON形式で回答してください。マークダウン装飾は不要です。

{
  "goal": "ユーザーの最終ゴール",
  "timeframe": "達成期間",
  "milestones": [
    {
      "period": "タイムライン上の時期（必ず「〇年後」「〇ヶ月後」「今月」のいずれかの形式で記載すること）",
      "title": "マイルストーンのタイトル",
      "description": "具体的に何を達成するか（2-3文）",
      "keyActions": ["そのために今すぐ始められるアクション1", "アクション2"]
    }
  ]
}

## ルール
- マイルストーンは最終ゴールから逆算して、5〜7つ程度生成してください。
- 最も遠い未来から現在に向かって並べてください。
- 最後のマイルストーンは必ず「今月」にし、すぐに着手できる具体的なアクションを含めてください。
- 日本語で回答してください。
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = EditRoadmapRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", errorCode: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    }

    const { goal, timeframe, currentMilestones, instruction } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured", errorCode: "API_KEY_MISSING" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    const currentMilestonesText = currentMilestones
      .map((m, i) => `${i + 1}. [${m.period}] ${m.title}: ${m.description}`)
      .join("\n");

    const userContent = `## ゴール
ゴール: ${goal.trim()}
達成期間: ${timeframe.trim()}

## 現在のロードマップ
${currentMilestonesText}

## 修正指示
${instruction.trim()}`;

    const result = await model.generateContent(userContent);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const roadmap = RoadmapResponseSchema.parse(JSON.parse(jsonString));
      return NextResponse.json(roadmap);
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
    console.error("Error in roadmap edit API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to edit roadmap", errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
