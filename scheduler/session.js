import { createSession } from "./model.js";

export function sessionKey(weekStart) {
  return `referenceScheduler.session.${weekStart}`;
}

export function loadSession(model, weekStart) {
  const stored = localStorage.getItem(sessionKey(weekStart));
  if (!stored) return createSession(model, weekStart);
  try {
    const parsed = JSON.parse(stored);
    if (parsed.schemaVersion !== 1) return createSession(model, weekStart);
    return {
      ...createSession(model, weekStart),
      ...parsed,
      configMismatch: parsed.configHash !== model.configHash,
    };
  } catch {
    return createSession(model, weekStart);
  }
}

export function saveSession(session) {
  const updated = { ...session, updatedAt: new Date().toISOString() };
  localStorage.setItem(sessionKey(session.weekStart), JSON.stringify(updated));
  return updated;
}

export function deleteSession(weekStart) {
  localStorage.removeItem(sessionKey(weekStart));
}

export function hasSavedSession(weekStart) {
  return Boolean(localStorage.getItem(sessionKey(weekStart)));
}

export function downloadSessionJson(session) {
  downloadBlob(JSON.stringify(session, null, 2), `schedule-session-${session.weekStart}.json`, "application/json");
}

export function readSessionFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function downloadBlob(content, filename, type) {
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
