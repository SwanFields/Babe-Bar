export const BANGKOK_TIME_ZONE = "Asia/Bangkok";
export function businessDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BANGKOK_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const result = `${values.year}-${values.month}-${values.day}`;
  if (hour < 6) {
    const previous = new Date(`${result}T00:00:00+07:00`);
    previous.setDate(previous.getDate() - 1);
    return previous.toISOString().slice(0, 10);
  }
  return result;
}
export const bangkokTime = (date: Date) => new Intl.DateTimeFormat("th-TH", { timeZone: BANGKOK_TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(date);
