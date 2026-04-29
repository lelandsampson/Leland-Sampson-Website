import { formatTime } from "../time.js";

export function exportExcel(model, session) {
  if (!window.XLSX) throw new Error("SheetJS is not loaded.");
  const wb = XLSX.utils.book_new();
  append(wb, "Instructions", [["Reference Desk Scheduler"], ["Workbook exported for record keeping."]]);
  append(wb, "ScheduleWeek", [["WeekStartDate", "WeekEndDate"], [session.weekStart, session.weekDates.at(-1).date]]);
  append(wb, "Assets", [["AssetID", "AssetName", "Active"], ...model.assets.map((asset) => [asset.id, asset.name, asset.active])]);
  append(wb, "Shifts", [["ShiftID", "Label", "StartTime", "EndTime", "Hours", "Active"], ...model.shifts.map((s) => [s.id, s.label, s.start, s.end, s.hours, s.active])]);
  append(wb, "CoverageRequirements", [["DayOfWeek", "ShiftID", "Position", "RequiredAssets"], ...model.coverageRequirements.map((r) => [r.dayOfWeek, r.shiftId, r.position, r.requiredAssets])]);
  append(wb, "AssetTargets", [["AssetID", "MinHours", "TargetHours", "MaxHours"], ...Object.values(model.targets).map((t) => [t.assetId, t.minHours, t.targetHours, t.maxHours])]);
  append(wb, "DefaultAvailability", [["AssetID", "DayOfWeek", "AvailableStart", "AvailableEnd", "Timezone", "Notes", "Reviewer"], ...model.defaultAvailability.map((a) => [a.assetId, a.dayOfWeek, a.startMinute === null ? "" : formatTime(a.startMinute), a.endMinute === null ? "" : formatTime(a.endMinute), a.timezone, a.notes, a.reviewer.all ? "TRUE" : [...a.reviewer.shifts].join(";")])]);
  append(wb, "DefaultRoleEligibility", [["AssetID", "DayOfWeek", "Role", "Eligible"], ...model.roleEligibility.map((r) => [r.assetId, r.dayOfWeek, r.role, r.eligible])]);
  append(wb, "WeeklyPhoneEligibility", [["AssetID", "EligibleForPhone"], ...model.assets.map((a) => [a.id, Boolean(session.weeklyPhoneEligibility[a.id])])]);
  append(wb, "WeeklyUnavailability", [["AssetID", "Date", "DayOfWeek", "UnavailableStart", "UnavailableEnd", "AllDay"], ...session.weeklyUnavailability.map((u) => [u.assetId, u.date, u.dayOfWeek, u.startMinute === null ? "" : formatTime(u.startMinute), u.endMinute === null ? "" : formatTime(u.endMinute), u.allDay])]);
  append(wb, "Assignments", [["Date", "DayOfWeek", "ShiftID", "Position", "SlotNumber", "AssetID", "StartTime", "EndTime", "Hours", "Notes"], ...session.assignments.map((a) => [a.date, a.dayOfWeek, a.shiftId, a.position, a.slotNumber, a.assetId || "", formatTime(a.startMinute), formatTime(a.endMinute), a.hours, ""])]);
  append(wb, "Summary", summaryRows(model, session));
  append(wb, "WeeklySchedule", scheduleRows(model, session));
  XLSX.writeFile(wb, `reference-schedule-${session.weekStart}.xlsx`);
}

function append(wb, name, rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = rows[0]?.map((_, index) => ({ wch: Math.max(12, ...rows.map((row) => String(row[index] ?? "").length + 2)) })) || [];
  XLSX.utils.book_append_sheet(wb, sheet, name);
}

function summaryRows(model, session) {
  const totals = {};
  session.assignments.forEach((a) => {
    if (!a.assetId) return;
    totals[a.assetId] = (totals[a.assetId] || 0) + a.hours;
  });
  return [["AssetID", "ScheduledHours", "MinHours", "TargetHours", "MaxHours", "Status"], ...model.assets.map((asset) => {
    const target = model.targets[asset.id] || {};
    const scheduled = totals[asset.id] || 0;
    const status = target.maxHours && scheduled > target.maxHours ? "Over Max" : target.minHours && scheduled < target.minHours ? "Under Min" : "On Target";
    return [asset.id, scheduled, target.minHours || 0, target.targetHours || 0, target.maxHours || 0, status];
  })];
}

function scheduleRows(model, session) {
  return [["Date", "Day", "Shift", "Position", "Assets"], ...Object.values(groupAssignments(session)).map((group) => {
    const first = group[0];
    return [first.date, first.dayOfWeek, first.shiftId, first.position, group.map((a) => a.assetId || "XX").join(" & ")];
  })];
}

function groupAssignments(session) {
  return session.assignments.reduce((groups, assignment) => {
    const key = `${assignment.date}:${assignment.shiftId}:${assignment.position}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(assignment);
    return groups;
  }, {});
}
