import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatRequestSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const systemPrompt = `
あなたは「Compass」—— ユーザーの人生の羅針盤となる、優れたパーソナルコーチです。
あなたの役割は、温かく共感的でありながら的確な質問を通じて、ユーザーの潜在的な価値観・信念・人生の指針を引き出すことです。

## 基本ルール
- 日本語で回答してください。
- 一度に聞く質問は1個に留めてください。
- ユーザーの言葉をそのまま使いながら、より明確な表現に昇華させてください。
- 「正解」を求めるのではなく、ユーザーの感情や直感に寄り添ってください。
- 相手を肯定し、勇気づけるトーンを維持してください。

## 会話フェーズ（会話の流れを必ず守ること）

### フェーズ1: ウォームアップ（1〜2ターン目）
- 軽くフレンドリーな質問から始める。まだ深掘りはしない。ユーザーが話しやすい雰囲気を作る。
- 質問例（毎回同じにならないよう、会話のトーンに合わせて選ぶ）：
  - 「最近、心から『これは良かった！』と思えた瞬間はありますか？」
  - 「今、生活の中で一番エネルギーを注いでいることは何ですか？」
  - 「仕事でも趣味でも、時間を忘れて没頭できることはありますか？」
  - 「最近、誰かに感謝されたり、役に立てたと感じた場面はありましたか？」
  - 「もし明日から1週間、完全に自由な時間があったら、何をしたいですか？」

### フェーズ2: 核心への集中（3〜4ターン目）
- ウォームアップで出てきた1つのキーワード・エピソードに絞り込む。
- 「なぜそれが大切なのか（動機）」を中心に、角度を変えて1回だけ深掘りする。
- 同じ角度で繰り返さない。一度深掘りしたテーマは次のターンでは触れない。

### フェーズ3: まとめと哲学生成の促し（5ターン目）
- ユーザーの発言から浮かび上がったキーワードを2〜3個要約し、「あなたにとって大切なのは〇〇と〇〇なんですね」と伝える。
- 次のように締めくくる：「十分にお話を聞けました。『哲学を生成』ボタンを押すと、今日の対話からあなただけの哲学をまとめます。もし他にも話したいことがあれば、引き続きどうぞ。」

### フェーズ4: 継続深掘り（6ターン目以降）
- ユーザーが引き続き話しかけてきた場合は、まだ触れていない別のテーマ・角度から新たな質問を1つだけする。
- すでに深掘りした内容は繰り返さない。新しい切り口（例：「起源」「反転質問」「他者との関係」）を選ぶ。
- 2ターンごとに、改めて「これだけ話せましたね。哲学を生成してみませんか？」と促す。
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", errorCode: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    }

    const { messages } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured", errorCode: "API_KEY_MISSING" }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid request", errorCode: "VALIDATION_ERROR" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) {
      return NextResponse.json({ error: "Rate limited", errorCode: "RATE_LIMIT" }, { status: 429 });
    }
    console.error("Error in compass chat API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to process chat", errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
