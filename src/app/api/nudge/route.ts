import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getErrorMessage } from "@/lib/utils";

const NudgeRequestTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  estimatedMinutes: z.number().optional(),
  parentTitle: z.string().optional(),
  linkedGoal: z.string().optional(),
});

const NudgeRequestSchema = z.object({
  tasks: z.array(NudgeRequestTaskSchema).min(1),
});

const NudgeSuggestionSchema = z.object({
  taskId: z.string(),
  reason: z.string().max(40),
});

const NudgeResponseSchema = z.object({
  suggestions: z.array(NudgeSuggestionSchema).max(3),
});

const systemPrompt = `
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

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = NudgeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", errorCode: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { tasks } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured", errorCode: "API_KEY_MISSING" }, { status: 500 });
    }

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
