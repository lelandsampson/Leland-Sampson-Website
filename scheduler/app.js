import { loadConfig } from "./config.js";
import { buildModel, getMonday, isReviewerForShift } from "./model.js";
import { saveSession, loadSession, deleteSession, downloadSessionJson, readSessionFile } from "./session.js";
import { generateSchedule } from "./scheduler.js";
import { validateSession } from "./validation.js";
import { exportExcel } from "./exports/excel.js";
import { exportIcs } from "./exports/ics.js";
import { initTabs } from "./ui/tabs.js";
import { renderWeekSelector } from "./ui/week-selector.js";
import { renderSetupPanel } from "./ui/setup-panel.js";
import { renderPhoneEligibility } from "./ui/phone-eligibility.js";
import { renderAvailabilityEditor } from "./ui/availability-editor.js";
import { renderToolbar } from "./ui/toolbar.js";
import { renderScheduleCalendar } from "./ui/schedule-calendar.js";
import { renderTargetSummary } from "./ui/target-summary.js";
import { renderWarningsPanel } from "./ui/warnings-panel.js";

const els = {
  status: document.getElementById("app-status"),
  weekSelector: document.getElementById("week-selector"),
  setupPanel: document.getElementById("setup-panel"),
  phoneEligibility: document.getElementById("phone-eligibility"),
  availabilityEditor: document.getElementById("availability-editor"),
  toolbar: document.getElementById("toolbar"),
  calendar: document.getElementById("schedule-calendar"),
  targetSummary: document.getElementById("target-summary"),
  warnings: document.getElementById("warnings-panel"),
  fileInput: document.getElementById("session-file-input"),
};

const state = {
  model: null,
  session: null,
};

const actions = {
  selectWeek,
  selectAsset,
  confirmAvailability,
  toggleUnavailable,
  setPhoneEligibility,
  generate: () => generate(false),
  regenerate: () => {
    const locked = state.session.assignments.filter((a) => a.locked).length;
    const unlocked = state.session.assignments.length - locked;
    if (confirm(`${locked} locked assignments will be preserved. ${unlocked} unlocked assignments may change.`)) generate(true);
  },
  excel: () => exportExcel(state.model, state.session),
  ics: () => {
    const result = exportIcs(state.model, state.session);
    setStatus(`Exported ${result.exported} events. Skipped ${result.skipped} invalid assignments.`);
  },
  json: () => downloadSessionJson(state.session),
  "load-json": () => els.fileInput.click(),
  delete: restartWeek,
  removeAssignmentAsset,
  assignAssetToSlot,
  dropAssetOnAssignment,
  toggleAssignmentLock,
  splitAssignment,
};

boot();

async function boot() {
  try {
    initTabs();
    const config = await loadConfig();
    state.model = buildModel(config);
    state.session = loadSession(state.model, getMonday(new Date()));
    state.session = validateAndSave(state.session);
    wireFileInput();
    render();
    setStatus("Configuration loaded.");
  } catch (error) {
    console.error(error);
    els.status.innerHTML = `<span class="status-bad">Configuration error: ${error.message}</span>`;
    document.querySelector("main").insertAdjacentHTML("afterbegin", `<div class="error-box">Could not load scheduler configuration. This app must be served from GitHub Pages or a local web server, not opened directly as a file.</div>`);
  }
}

function render() {
  renderWeekSelector(els.weekSelector, state, actions);
  renderSetupPanel(els.setupPanel, state);
  renderPhoneEligibility(els.phoneEligibility, state, actions);
  renderAvailabilityEditor(els.availabilityEditor, state, actions);
  renderToolbar(els.toolbar, state, actions);
  renderScheduleCalendar(els.calendar, state, actions);
  renderTargetSummary(els.targetSummary, state);
  renderWarningsPanel(els.warnings, state);
}

function selectWeek(weekStart) {
  state.session = validateAndSave(loadSession(state.model, weekStart));
  render();
}

function selectAsset(assetId) {
  state.session = saveSession({ ...state.session, selectedAssetId: assetId });
  render();
}

function confirmAvailability(assetId, confirmed) {
  state.session = saveSession({
    ...state.session,
    availabilityConfirmations: { ...state.session.availabilityConfirmations, [assetId]: confirmed },
  });
  render();
}

function toggleUnavailable(assetId, date, dayOfWeek, minute) {
  const existingIndex = state.session.weeklyUnavailability.findIndex((block) =>
    block.assetId === assetId && block.date === date && block.startMinute === minute && block.endMinute === minute + 30
  );
  const weeklyUnavailability = [...state.session.weeklyUnavailability];
  if (existingIndex >= 0) {
    weeklyUnavailability.splice(existingIndex, 1);
  } else {
    weeklyUnavailability.push({ assetId, date, dayOfWeek, startMinute: minute, endMinute: minute + 30, allDay: false });
  }
  state.session = validateAndSave({
    ...state.session,
    weeklyUnavailability,
    availabilityConfirmations: { ...state.session.availabilityConfirmations, [assetId]: false },
  });
  render();
}

function setPhoneEligibility(assetId, eligible) {
  state.session = validateAndSave({
    ...state.session,
    weeklyPhoneEligibility: { ...state.session.weeklyPhoneEligibility, [assetId]: eligible },
  });
  render();
}

function generate(preserveLocked) {
  const generated = generateSchedule(state.model, state.session, { preserveLocked });
  state.session = validateAndSave(generated);
  render();
  setStatus(state.session.warnings.some((w) => w.code === "UNCOVERED_SLOT") ? "Schedule generated with uncovered slots." : "Schedule generated.");
}

function removeAssignmentAsset(id) {
  const assignments = state.session.assignments.map((assignment) =>
    assignment.id === id ? { ...assignment, assetId: "", locked: true, source: "manual" } : assignment
  );
  state.session = validateAndSave({ ...state.session, assignments });
  render();
}

function assignAssetToSlot(id, assetId) {
  if (!assetId) return;
  const assignments = state.session.assignments.map((assignment) =>
    assignment.id === id ? withManualAsset(assignment, assetId) : assignment
  );
  state.session = validateAndSave({ ...state.session, assignments });
  render();
}

function dropAssetOnAssignment(targetId, assetId) {
  if (!assetId) return;
  const target = state.session.assignments.find((assignment) => assignment.id === targetId);
  if (!target) return;
  let assignments;
  if (!target.assetId) {
    assignments = state.session.assignments.map((assignment) =>
      assignment.id === targetId ? withManualAsset(assignment, assetId) : assignment
    );
  } else {
    const extra = withManualAsset({
      ...target,
      id: `${target.id}-drop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }, assetId);
    assignments = [...state.session.assignments, extra];
  }
  state.session = validateAndSave({ ...state.session, assignments });
  render();
}

function toggleAssignmentLock(id) {
  const assignments = state.session.assignments.map((assignment) =>
    assignment.id === id ? { ...assignment, locked: !assignment.locked } : assignment
  );
  state.session = validateAndSave({ ...state.session, assignments });
  render();
}

function splitAssignment(id) {
  const target = state.session.assignments.find((assignment) => assignment.id === id);
  if (!target || !canManuallySplit(target)) return;
  const parts = splitParts(target).map((part) => ({
    ...target,
    id: `${target.id}-part-${part.partNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    startMinute: part.startMinute,
    endMinute: part.endMinute,
    hours: (part.endMinute - part.startMinute) / 60,
    partNumber: part.partNumber,
    partCount: 2,
    locked: true,
    source: "manual",
  }));
  const assignments = state.session.assignments.flatMap((assignment) => assignment.id === id ? parts : [assignment]);
  state.session = validateAndSave({ ...state.session, assignments });
  render();
}

function restartWeek() {
  if (!confirm("Delete stored values for this week and restart from default config?")) return;
  const week = state.session.weekStart;
  deleteSession(week);
  state.session = loadSession(state.model, week);
  render();
}

function validateAndSave(session) {
  const result = validateSession(state.model, session);
  return saveSession({ ...session, assignments: result.assignments, warnings: result.warnings });
}

function wireFileInput() {
  els.fileInput.addEventListener("change", async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    try {
      const imported = await readSessionFile(file);
      state.session = validateAndSave({
        ...loadSession(state.model, imported.weekStart || state.session.weekStart),
        ...imported,
        configMismatch: imported.configHash !== state.model.configHash,
      });
      render();
      setStatus("Session JSON loaded.");
    } catch (error) {
      alert(`Could not load JSON: ${error.message}`);
    } finally {
      els.fileInput.value = "";
    }
  });
}

function setStatus(message) {
  els.status.textContent = message;
}

function withManualAsset(assignment, assetId) {
  return {
    ...assignment,
    assetId,
    locked: true,
    source: "manual",
    isReviewer: assignment.position === "Info Desk"
      && assignment.shiftId !== "EVENING"
      && isReviewerForShift(state.model, assetId, assignment.dayOfWeek, assignment.shiftId),
  };
}

function canManuallySplit(assignment) {
  return assignment.position === "Info Desk"
    && (assignment.shiftId === "MORNING" || assignment.shiftId === "AFTERNOON")
    && !assignment.partNumber
    && assignment.endMinute - assignment.startMinute === 240;
}

function splitParts(assignment) {
  if (assignment.shiftId === "MORNING") {
    return [
      { partNumber: 1, startMinute: 8 * 60, endMinute: 10 * 60 },
      { partNumber: 2, startMinute: 10 * 60, endMinute: 12 * 60 },
    ];
  }
  return [
    { partNumber: 1, startMinute: 12 * 60, endMinute: 14 * 60 },
    { partNumber: 2, startMinute: 14 * 60, endMinute: 16 * 60 },
  ];
}
