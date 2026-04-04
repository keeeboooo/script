import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BreakdownTaskSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const SingleEditRequestSchema = z.object({
  parentPrompt: z.string().min(1),
  targetTask: BreakdownTaskSchema,
  allCurrentTasks: z.array(
    BreakdownTaskSchema.extend({ isTarget: z.boolean() })
  ),
  instruction: z.string().min(1),
});

const SingleEditResponseSchema = z.object({
  task: BreakdownTaskSchema,
});

const systemPrompt = `
You are an expert AI task breakdown engine ("Magic Breakdown").
The user has an existing task breakdown and wants to modify ONE specific sub-task.
You will receive:
- The original parent goal
- All current sub-tasks (with one marked as the target)
- An edit instruction for the target sub-task

Rewrite ONLY the target sub-task according to the instruction.
Take into account the other sub-tasks so the revised task does not duplicate or conflict with them.

CRITICAL REQUIREMENT: YOU MUST RESPOND ENTIRELY IN JAPANESE (日本語).

Respond STRICTLY with a JSON object, without markdown formatting:
{
  "task": {
    "title": "動詞で始まる具体的で行動可能なステップ（日本語）",
    "estimatedTime": "15分",
    "actionLink": "https://example.com/useful-link"
  }
}

Instructions for actionLink:
- If a task involves buying something, provide an Amazon or specific store search link.
- If it involves research, provide a Google search link or Wikipedia.
- ONLY provide an actionLink if it's genuinely useful. Otherwise, omit it.
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = SingleEditRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { parentPrompt, targetTask, allCurrentTasks, instruction } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    const tasksText = allCurrentTasks
      .map((t, i) => {
        const marker = t.isTarget ? " ← 修正対象" : "";
        return `${i + 1}. ${t.title}${t.estimatedTime ? ` (${t.estimatedTime})` : ""}${marker}`;
      })
      .join("\n");

    const userContent = `元のゴール: ${parentPrompt.trim()}

現在のサブタスク一覧:
${tasksText}

修正対象タスク: ${targetTask.title}

修正指示: ${instruction.trim()}`;

    const result = await model.generateContent(userContent);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const response = SingleEditResponseSchema.parse(JSON.parse(jsonString));
      return NextResponse.json(response);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Error in single subtask edit API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to edit subtask" }, { status: 500 });
  }
}
