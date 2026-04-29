export const DAY_START_MINUTE = 8 * 60;
export const DAY_END_MINUTE = 19 * 60 + 30;
export const SLOT_MINUTES = 30;

export function parseTime(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid time: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new Error(`Invalid time: ${value}`);
  if (minutes % SLOT_MINUTES !== 0) throw new Error(`Time must use 30-minute increments: ${value}`);
  return hours * 60 + minutes;
}

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function durationHours(startMinute, endMinute) {
  return (endMinute - startMinute) / 60;
}

export function isThirtyMinuteIncrement(minutes) {
  return Number.isFinite(minutes) && minutes % SLOT_MINUTES === 0;
}

export function timeSlots(start = DAY_START_MINUTE, end = DAY_END_MINUTE) {
  const slots = [];
  for (let minute = start; minute < end; minute += SLOT_MINUTES) slots.push(minute);
  return slots;
}
