export type QueueLimitError = {
  code: "QUEUE_LIMIT";
  message: string;
  limit: number;
  current: number;
};

export function makeQueueLimitError(
  limit: number,
  current: number,
): QueueLimitError {
  return {
    code: "QUEUE_LIMIT",
    message: `Queue limit reached (${limit}). Upgrade to add more downloads`,
    limit,
    current,
  };
}
