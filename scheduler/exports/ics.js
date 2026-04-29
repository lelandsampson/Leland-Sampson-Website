import { formatTime } from "../time.js";

export function exportIcs(model, session) {
  const events = buildEvents(model, session);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reference Scheduler//EN",
    "CALSCALE:GREGORIAN",
  ];
  events.forEach((event) => lines.push(...eventToIcs(event)));
  lines.push("END:VCALENDAR");
  download(`${lines.join("\r\n")}\r\n`, `reference-schedule-${session.weekStart}.ics`, "text/calendar");
  return { exported: events.length, skipped: countSkipped(model, session) };
}

function buildEvents(model, session) {
  const grouped = new Map();
  session.assignments.forEach((assignment) => {
    if (!assignment.assetId) return;
    const key = `${assignment.date}:${assignment.shiftId}:${assignment.position}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(assignment);
  });
  return [...grouped.values()].map((group) => {
    const first = group[0];
    const shift = model.shiftsById[first.shiftId];
    return {
      uid: `${first.date}-${first.shiftId}-${first.position.replace(/\s/g, "")}@reference-scheduler`,
      date: first.date,
      startMinute: first.startMinute,
      endMinute: first.endMinute,
      title: eventTitle(first, group),
      category: first.position === "Phone" ? "Phone coverage" : "Reference Desk Schedule",
      description: group.map((item) => item.assetId).join(", "),
      shift,
    };
  });
}

function countSkipped(model, session) {
  return session.assignments.filter((assignment) => !assignment.assetId || !model.shiftsById[assignment.shiftId]).length;
}

function eventTitle(first, group) {
  const assets = group.map((item) => item.assetId).filter(Boolean);
  if (first.position === "Phone") {
    const labels = {
      PHONE_0800: "Phone 8-10",
      PHONE_1000: "Phone 10-12",
      PHONE_1200: "Phone 12-2",
      PHONE_1400: "Phone 2-4",
    };
    return `${labels[first.shiftId] || "Phone"}: ${assets[0] || "XX"}`;
  }
  const labels = {
    MORNING: "Ref AM",
    AFTERNOON: "Ref PM",
    EVENING: "Ref x 4:30",
  };
  return `${labels[first.shiftId] || "Ref"}: ${assets[0] || "XX"} & ${assets[1] || "XX"}`;
}

function eventToIcs(event) {
  return [
    "BEGIN:VEVENT",
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${localStamp(event.date, event.startMinute)}`,
    `DTEND:${localStamp(event.date, event.endMinute)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `CATEGORIES:${escapeText(event.category)}`,
    "END:VEVENT",
  ];
}

function localStamp(date, minute) {
  const [year, month, day] = date.split("-");
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${year}${month}${day}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(text) {
  return String(text || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
