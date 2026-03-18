import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatRequestSchema, PhilosophySchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const systemPrompt = `
あなたは「Philosophy Generator」です。ユーザーとAIコーチの対話履歴を受け取り、
その内容から「My Philosophy（私の哲学）」ドキュメントを生成してください。

## 出力形式
必ず以下のJSON形式で回答してください。マークダウン装飾は不要です。

{
  "title": "私の哲学",
  "values": [
    {
      "name": "価値観の名前（例：自由と冒険）",
      "description": "この価値観の説明（2-3文）",
      "origin": "この価値観がどこから来たか（1文）"
    }
  ],
  "beliefs": [
    "信念1（例：人は常に成長できる）",
    "信念2"
  ],
  "actionPrinciples": [
    "行動指針1（例：迷ったら新しい方を選ぶ）",
    "行動指針2"
  ],
  "lifeStatement": "一文で表す人生のステートメント（例：自由に創造し、人のつながりの中で成長し続ける人生を送る）"
}

## ルール
- 対話から読み取れる範囲で、3〜5つの価値観を抽出してください。
- ユーザーの言葉をできるだけ使い、本人が「これは自分だ」と感じる表現にしてください。
- 推測が必要な場合は、対話の文脈に忠実に行ってください。
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { messages } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const conversationText = messages
      .map((m) => `${m.role === "user" ? "ユーザー" : "コーチ"}: ${m.content}`)
      .join("\n\n");

    const result = await model.generateContent(`## 対話履歴\n${conversationText}`);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const philosophy = PhilosophySchema.parse(JSON.parse(jsonString));
      return NextResponse.json(philosophy);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Error in philosophy generation API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to generate philosophy" }, { status: 500 });
  }
}
