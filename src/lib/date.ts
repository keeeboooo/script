export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getTodayStr(): string {
  return toDateStr(new Date());
}

export function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateStr(d);
}

export function getWeekendStr(): string {
  const d = new Date();
  const day = d.getDay();
  // 次の土曜日
  const daysUntilSat = day === 6 ? 7 : 6 - day;
  d.setDate(d.getDate() + daysUntilSat);
  return toDateStr(d);
}

export function formatDateLabel(dateStr: string): string {
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  if (dateStr === today) return "今日";
  if (dateStr === tomorrow) return "明日";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatScheduleBadge(date: string, time?: string): string {
  const dateLabel = formatDateLabel(date);
  if (!time) return dateLabel;

  const [h] = time.split(":").map(Number);
  let timeLabel: string;
  if (h !== undefined && h < 10) timeLabel = "朝";
  else if (h !== undefined && h < 15) timeLabel = "昼";
  else timeLabel = "夜";

  return `${dateLabel} ${timeLabel}`;
}
