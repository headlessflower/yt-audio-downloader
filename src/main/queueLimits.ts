// queueLimits.ts
export const QUEUE_LIMITS = {
  free: 15,
  pro: 100, // example
  unlimited: Infinity,
} as const;

export type PlanTier = keyof typeof QUEUE_LIMITS;
