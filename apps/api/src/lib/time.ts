export const BANGKOK_TIME_ZONE = "Asia/Bangkok";

/** ชั่วโมง (0-23) ตามเวลาไทย */
export function bangkokHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: BANGKOK_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value);
}

/** "วันทำการ" ของร้าน: ก่อน 06:00 ยังนับเป็นของเมื่อวาน */
export function businessDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BANGKOK_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const today = `${values.year}-${values.month}-${values.day}`;
  if (bangkokHour(date) >= 6) return today;
  const previous = new Date(`${today}T00:00:00+07:00`);
  previous.setDate(previous.getDate() - 1);
  return previous.toISOString().slice(0, 10);
}

/** แปลง "YYYY-MM-DD" เป็น Date ที่ใช้เก็บคอลัมน์ @db.Date */
export const toDateOnly = (value: string) => new Date(`${value}T00:00:00Z`);
