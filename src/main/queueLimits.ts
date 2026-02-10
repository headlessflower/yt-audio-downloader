// queueLimits.ts
//
export type PlanTier = "free" | "pro" | "unlimited";
export const QUEUE_LIMITS = {
  free: 10,
  pro: 100, // example
  unlimited: Number.POSITIVE_INFINITY,
} as const;

export function getQueueLimit(tier: PlanTier) {
  return QUEUE_LIMITS[tier] ?? 10;
}
