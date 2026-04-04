import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BreakdownTaskSchema, BreakdownResponseSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

const EditBreakdownRequestSchema = z.object({
  parentPrompt: z.string().min(1),
  currentTasks: z.array(BreakdownTaskSchema),
  instruction: z.string().min(1),
});

const systemPrompt = `
You are an expert AI task breakdown engine ("Magic Breakdown").
The user has an existing task breakdown and wants to modify it based on their instruction.
You will receive the original goal, the current subtasks, and an edit instruction.
Apply the edit instruction to produce an updated list of 3 to 7 highly actionable, specific sub-tasks.
Keep tasks not affected by the instruction as they are.

CRITICAL REQUIREMENT: YOU MUST RESPOND ENTIRELY IN JAPANESE (日本語).
The task titles and any generated text must be in natural Japanese.

Respond STRICTLY with a JSON object matching this schema, without markdown formatting:
{
  "tasks": [
    {
      "title": "動詞で始まる具体的で行動可能なステップ（日本語）",
      "estimatedTime": "15分",
      "actionLink": "https://example.com/useful-link"
    }
  ]
}

Instructions for actionLink:
- If a task involves buying something, provide an Amazon or specific store search link.
- If it involves research, provide a Google specific search link or Wikipedia.
- ONLY provide an actionLink if it's genuinely useful for immediate execution. Otherwise, omit it.
`;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = EditBreakdownRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { parentPrompt, currentTasks, instruction } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    });

    const currentTasksText = currentTasks
      .map((t, i) => `${i + 1}. ${t.title}${t.estimatedTime ? ` (${t.estimatedTime})` : ""}`)
      .join("\n");

    const userContent = `元のゴール: ${parentPrompt.trim()}

現在のサブタスク:
${currentTasksText}

修正指示: ${instruction.trim()}`;

    const result = await model.generateContent(userContent);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    try {
      const breakdown = BreakdownResponseSchema.parse(JSON.parse(jsonString));
      return NextResponse.json(breakdown);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Error in breakdown edit API:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to edit breakdown" }, { status: 500 });
  }
}
