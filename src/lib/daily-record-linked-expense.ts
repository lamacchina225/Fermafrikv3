const DAILY_RECORD_EXPENSE_PREFIX = "[DAILY_RECORD:";

export function buildDailyRecordExpenseLabel(recordId: number, label: string) {
  return `${DAILY_RECORD_EXPENSE_PREFIX}${recordId}] ${label.trim()}`;
}

export function parseDailyRecordExpenseLabel(label: string) {
  const match = label.match(/^\[DAILY_RECORD:(\d+)\]\s*(.+)$/);
  if (!match) return null;

  return {
    recordId: Number(match[1]),
    label: match[2].trim(),
  };
}

export function getDailyRecordExpenseLikePattern(recordId: number) {
  return `${DAILY_RECORD_EXPENSE_PREFIX}${recordId}]%`;
}

export function stripDailyRecordExpenseMetadata(label: string) {
  return parseDailyRecordExpenseLabel(label)?.label ?? label;
}
