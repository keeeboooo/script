import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getErrorMessage } from "@/lib/utils";
import { NudgeResponseSchema, NudgeRequestSchema } from "@/lib/schemas";

const baseSystemPrompt = `
You are a smart task prioritization assistant ("Smart Nudge").
Given a list of incomplete tasks, select the 3 most actionable tasks for the user to focus on right now.

SELECTION CRITERIA (in priority order):
1. Tasks with estimatedMinutes <= 15 (quick wins) — always prioritize these.
2. Tasks with a concrete actionLink or specific tool/service mentioned.
3. Tasks that have momentum (part of an in-progress project).
4. Tasks linked to long-term goals (linkedGoal present).

For each selected task, write a short Japanese reason (max 40 chars) explaining WHY it was chosen.
Example reasons: "今すぐ15分で終わる", "目標達成への第一歩", "手が止まっているプロジェクトを再始動"

CRITICAL: Respond only in JSON. No markdown. Select at most 3 tasks. Respond in this exact format:
{
  "suggestions": [
    { "taskId": "<id>", "reason": "<理由（日本語40文字以内）>" },
    { "taskId": "<id>", "reason": "<理由（日本語40文字以内）>" },
    { "taskId": "<id>", "reason": "<理由（日本語40文字以内）>" }
  ]
}
`;

const philosophySystemPrompt = (valuesText: string) => `
You are a smart task prioritization assistant ("Smart Nudge") operating in philosophy-alignment mode.
The user has defined their core values (軸) below. Prioritize tasks that align most strongly with these values.

USER'S CORE VALUES:
${valuesText}

SELECTION CRITERIA (in priority order):
1. Tasks that directly align with one of the user's core values — always prioritize these.
2. Tasks with estimatedMinutes <= 15 (quick wins aligned with values).
3. Tasks linked to long-term goals (linkedGoal present).
4. Tasks that have momentum (part of an in-progress project).

For each selected task:
- Write a short Japanese reason (max 40 chars) explaining WHY it aligns with a value.
- Set "alignedValue" to the name of the matching core value (use the exact name from the values list).
  If no clear match, omit "alignedValue".

Example reasons: "『創造』の価値観と直結", "自己成長への具体的な一歩", "『挑戦』を体現するアクション"

CRITICAL: Respond only in JSON. No markdown. Select at most 3 tasks. Respond in this exact format:
{
  "suggestions": [
    { "taskId": "<id>", "reason": "<理由（日本語40文字以内）>", "alignedValue": "<価値観名>" },
    { "taskId": "<id>", "reason": "<理由（日本語40文字以内）>" },
    { "taskId": "<id>", "reason": "<理由（日本語40文字以内）>", "alignedValue": "<価値観名>" }
  ]
}
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = NudgeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", errorCode: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { tasks, philosophyValues } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured", errorCode: "API_KEY_MISSING" }, { status: 500 });
    }

    const systemPrompt =
      philosophyValues && philosophyValues.length > 0
        ? philosophySystemPrompt(
            philosophyValues.map((v) => `- ${v.name}: ${v.description}`).join("\n")
          )
        : baseSystemPrompt;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    const taskList = tasks
      .map((t) => {
        const parts = [`id: ${t.id}`, `title: ${t.title}`];
        if (t.estimatedMinutes !== undefined) parts.push(`estimatedMinutes: ${t.estimatedMinutes}`);
        if (t.parentTitle) parts.push(`parentProject: ${t.parentTitle}`);
        if (t.linkedGoal) parts.push(`linkedGoal: ${t.linkedGoal}`);
        return `{ ${parts.join(", ")} }`;
      })
      .join("\n");

    const result = await model.generateContent(`Tasks:\n${taskList}`);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ?? text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const nudge = NudgeResponseSchema.parse(JSON.parse(jsonString));
      return NextResponse.json(nudge);
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
    console.error("Error in nudge API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to process request", errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
