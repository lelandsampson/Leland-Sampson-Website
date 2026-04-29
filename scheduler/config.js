import { parseCsv } from "./csv.js";
import { parseTime, durationHours } from "./time.js";

export const CONFIG_PATHS = {
  availability: "./config/default_availability.csv",
  roleEligibility: "./config/default_role_eligibility.csv",
  targets: "./config/asset_targets.csv",
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const SHIFTS = [
  shift("MORNING", "Morning", "08:00", "12:00", "Default block"),
  shift("AFTERNOON", "Afternoon", "12:00", "16:00", "Default block"),
  shift("EVENING", "Evening", "16:00", "19:30", "Default block"),
  shift("PHONE_0800", "Phone 8-10", "08:00", "10:00", "Default phone block"),
  shift("PHONE_1000", "Phone 10-12", "10:00", "12:00", "Default phone block"),
  shift("PHONE_1200", "Phone 12-2", "12:00", "14:00", "Default phone block"),
  shift("PHONE_1400", "Phone 2-4", "14:00", "16:00", "Default phone block"),
];

export const COVERAGE_REQUIREMENTS = [
  ...DAYS.flatMap((day) => [
    coverage(day, "MORNING", "Info Desk", 2),
    coverage(day, "AFTERNOON", "Info Desk", 2),
    coverage(day, "EVENING", "Info Desk", 2),
  ]),
  coverage("Monday", "PHONE_0800", "Phone", 1),
  coverage("Monday", "PHONE_1000", "Phone", 1),
  coverage("Monday", "PHONE_1200", "Phone", 1),
  coverage("Monday", "PHONE_1400", "Phone", 1),
];

function shift(id, label, start, end, notes) {
  const startMinute = parseTime(start);
  const endMinute = parseTime(end);
  return {
    id,
    label,
    start,
    end,
    startMinute,
    endMinute,
    hours: durationHours(startMinute, endMinute),
    active: true,
    notes,
  };
}

function coverage(dayOfWeek, shiftId, position, requiredAssets) {
  return { dayOfWeek, shiftId, position, requiredAssets };
}

export async function loadConfig() {
  const [availabilityText, roleText, targetText] = await Promise.all([
    fetchText(CONFIG_PATHS.availability),
    fetchText(CONFIG_PATHS.roleEligibility),
    fetchText(CONFIG_PATHS.targets),
  ]);
  const raw = {
    availabilityText,
    roleText,
    targetText,
  };
  return {
    raw,
    defaultAvailability: parseCsv(availabilityText),
    roleEligibility: parseCsv(roleText),
    targets: parseCsv(targetText),
    shifts: SHIFTS,
    coverageRequirements: COVERAGE_REQUIREMENTS,
    configHash: await hashStrings([availabilityText, roleText, targetText]),
  };
}

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.text();
}

async function hashStrings(strings) {
  const data = new TextEncoder().encode(strings.join("\n---\n"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
