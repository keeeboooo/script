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
  // "YYYY-MM-DD" を直接パース（new Date("YYYY-MM-DD") はUTC解釈でJSTで日付がずれる）
  const [, m, dd] = dateStr.split("-").map(Number);
  return `${m}/${dd}`;
}

export function formatScheduleBadge(date: string, time?: string): string {
  const dateLabel = formatDateLabel(date);
  if (!time) return dateLabel;

  // TIME_SLOT_VALUES と対応させた逆引き
  const [h] = time.split(":").map(Number);
  let timeLabel: string;
  if (h >= 5 && h < 11) timeLabel = "朝";
  else if (h >= 11 && h < 17) timeLabel = "昼";
  else timeLabel = "夜";

  return `${dateLabel} ${timeLabel}`;
}
