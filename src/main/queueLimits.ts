// queueLimits.ts
export const QUEUE_LIMITS = {
  free: 25,
  pro: 250, // example
  unlimited: Infinity,
} as const;

export type PlanTier = keyof typeof QUEUE_LIMITS;
