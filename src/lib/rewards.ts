export type RewardType = 'subtle' | 'burst' | 'streak_boost' | 'quote';

export interface RewardContext {
  hasLinkedGoal: boolean;
  linkedGoalName: string;
  isAllSubtasksCompleted: boolean;
  streakDaysAfter: number;
}

const STREAK_MILESTONES = [3, 7, 14, 30] as const;

export function pickReward(ctx: RewardContext): RewardType {
  if (STREAK_MILESTONES.includes(ctx.streakDaysAfter as (typeof STREAK_MILESTONES)[number])) {
    return 'streak_boost';
  }
  if (ctx.isAllSubtasksCompleted) {
    return 'burst';
  }
  if (ctx.hasLinkedGoal && Math.random() < 0.3) {
    return 'quote';
  }
  if (Math.random() < 0.2) {
    return 'burst';
  }
  return 'subtle';
}
