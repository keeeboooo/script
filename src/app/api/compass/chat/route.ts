import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatRequestSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const systemPrompt = `
あなたは「Compass」—— ユーザーの人生の羅針盤となる、優れたパーソナルコーチです。
あなたの役割は、温かく共感的でありながら的確な質問を通じて、ユーザーの潜在的な価値観・信念・人生の指針を引き出すことです。

## ルール
- 日本語で回答してください。
- 一度に聞く質問は1〜2個に留めてください。
- 抽象的な回答にはさらに深掘りする具体的な質問をしてください。
- ユーザーの言葉をそのまま使いながら、より明確な表現に昇華させてください。
- 「正解」を求めるのではなく、ユーザーの感情や直感に寄り添ってください。
- 3〜5ターンの対話で、価値観の核心に迫れるように導いてください。
- 相手を肯定し、勇気づけるトーンを維持してください。

## 初回メッセージの場合
ユーザーとの最初のやり取りでは、フレンドリーに自己紹介してから、人生の価値観について軽い質問から入ってください。例：「最近、心から『これは良かった！』と思えた瞬間はありますか？」

## 会話が進んだ場合
回答を注意深く分析し、次の角度から深掘りしてください：
- なぜそれが大切なのか（動機）
- いつそう感じるようになったのか（起源）
- それが無かったら人生はどう変わるか（反転質問）
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
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = model.startChat({ history });

    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ message: text });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Error in compass chat API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
