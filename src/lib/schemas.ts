import { z } from "zod";

// ─── Task ────────────────────────────────────────────────────────────────────

export const TaskStatusSchema = z.enum(["todo", "in_progress", "done", "canceled"]);

export const RawTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: TaskStatusSchema.default("todo"),
  isCompleted: z.boolean().optional(),
  estimatedTime: z.string().optional(),
  actionLink: z.string().optional(),
  parentId: z.string().optional(),
  linkedGoal: z.string().optional(),
  linkedRoadmapId: z.string().optional(),
  linkedMilestoneId: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  firstStep: z.string().optional(),
  // [The Thread - Phase 3設計メモ]
  // タスクとCompassの哲学・価値観を紐付けるフィールド。
  // Philosophy.values[n].name をIDとして使うか、別途 philosophyValueId を持つかは要検討。
  // 候補: linkedPhilosophyValueId?: string
  //   → タスクが「どの価値観に基づいているか」を可視化し、
  //     Engineモードで「なぜこの作業をしているか」を一瞬で想起できるようにする。
  // UI案: タスク行の右端に小さな羅針盤アイコン（🧭）を表示し、
  //        ホバー/タップで紐付き哲学・価値観をポップオーバーで表示。
});

export const BreakdownTaskSchema = z.object({
  title: z.string(),
  estimatedTime: z.string().optional(),
  actionLink: z.string().optional(),
});

export const BreakdownResponseSchema = z.object({
  tasks: z.array(BreakdownTaskSchema),
  firstStep: z.string().optional(),
});

// ─── Compass: Chat ────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
});

export const ChatResponseSchema = z.object({
  message: z.string(),
});

// ─── Compass: Philosophy ──────────────────────────────────────────────────────

export const PhilosophyValueSchema = z.object({
  name: z.string(),
  description: z.string(),
  origin: z.string(),
});

export const PhilosophySchema = z.object({
  title: z.string(),
  values: z.array(PhilosophyValueSchema),
  beliefs: z.array(z.string()),
  actionPrinciples: z.array(z.string()),
  lifeStatement: z.string(),
});

export const PhilosophyWithMetaSchema = PhilosophySchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── Compass: Roadmap ─────────────────────────────────────────────────────────

export const MilestoneSchema = z.object({
  period: z.string(),
  title: z.string(),
  description: z.string(),
  keyActions: z.array(z.string()),
});

export const RoadmapResponseSchema = z.object({
  goal: z.string().optional(),
  timeframe: z.string().optional(),
  milestones: z.array(MilestoneSchema),
});

export const RoadmapRequestSchema = z.object({
  goal: z.string().min(1),
  timeframe: z.string().min(1),
  philosophy: z.object({
    lifeStatement: z.string(),
    values: z.array(z.object({ name: z.string(), description: z.string() })),
  }).optional(),
});

// ─── User ─────────────────────────────────────────────────────────────────────

export const DisplayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: "表示名を入力してください" })
    .max(30, { message: "表示名は30文字以内で入力してください" }),
});

// ─── localStorage ─────────────────────────────────────────────────────────────

export const StoredChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const StoredMilestoneSchema = MilestoneSchema.extend({
  id: z.string(),
  isImported: z.boolean().optional(),
});

export const StoredRoadmapSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  title: z.string().optional(),
  goal: z.string(),
  timeframe: z.string(),
  milestones: z.array(StoredMilestoneSchema),
});
