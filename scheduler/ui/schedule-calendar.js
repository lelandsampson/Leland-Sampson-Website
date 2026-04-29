import { DAYS } from "../config.js";
import { formatTime } from "../time.js";

export function renderScheduleCalendar(container, state, actions) {
  const grouped = groupAssignments(state.session.assignments);
  container.innerHTML = `
    <h2>Schedule Review</h2>
    <p class="helper-text">MORNING and AFTERNOON Info Desk blocks can split into two 2-hour halves when full-block coverage is not feasible. Use Split on an eligible block to split it manually.</p>
    <div class="calendar-grid">
      <div class="grid-head">Shift</div>
      ${DAYS.map((day) => `<div class="grid-head">${day}</div>`).join("")}
      ${state.model.shifts.filter((shift) => !shift.id.startsWith("PHONE") || shift.id === "PHONE_0800").map((shift) => rowForShift(state, grouped, shift)).join("")}
    </div>
  `;
  container.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => actions.removeAssignmentAsset(button.dataset.remove));
  });
  container.querySelectorAll("[data-lock]").forEach((button) => {
    button.addEventListener("click", () => actions.toggleAssignmentLock(button.dataset.lock));
  });
  container.querySelectorAll("[data-split]").forEach((button) => {
    button.addEventListener("click", () => actions.splitAssignment(button.dataset.split));
  });
  container.querySelectorAll("[data-assign-asset]").forEach((select) => {
    select.addEventListener("change", () => actions.assignAssetToSlot(select.dataset.assignAsset, select.value));
  });
  container.querySelectorAll("[data-asset-drag]").forEach((pill) => {
    pill.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("application/json", JSON.stringify({
        assignmentId: pill.dataset.assignmentId,
        assetId: pill.dataset.assetDrag,
      }));
      event.dataTransfer.effectAllowed = "copy";
    });
  });
  container.querySelectorAll("[data-drop-assignment]").forEach((card) => {
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      card.classList.add("drop-target");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drop-target"));
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drop-target");
      const payload = JSON.parse(event.dataTransfer.getData("application/json") || "{}");
      if (payload.assetId) actions.dropAssetOnAssignment(card.dataset.dropAssignment, payload.assetId);
    });
  });
}

function rowForShift(state, grouped, shift) {
  const phoneRows = shift.id === "PHONE_0800" ? state.model.shifts.filter((item) => item.id.startsWith("PHONE")) : [shift];
  return phoneRows.map((rowShift) => `
    <div class="time-cell">${rowShift.label}<br>${formatTime(rowShift.startMinute)}-${formatTime(rowShift.endMinute)}</div>
    ${state.session.weekDates.map((dateInfo) => {
      const keyPrefix = `${dateInfo.date}:${rowShift.id}:`;
      const assignments = Object.entries(grouped).filter(([key]) => key.startsWith(keyPrefix)).flatMap(([, items]) => items);
      return `<div class="schedule-day">${assignments.length ? assignments.map((assignment) => renderAssignment(assignment, state)).join("") : ""}</div>`;
    }).join("")}
  `).join("");
}

function renderAssignment(assignment, state) {
  const cls = `assignment ${assignment.position === "Phone" ? "phone" : ""} ${assignment.warningCodes?.length ? "warning" : ""} ${assignment.locked ? "locked" : ""}`;
  return `
    <div class="${cls}" data-drop-assignment="${assignment.id}">
      <div class="assignment-title">${assignment.position} ${formatTime(assignment.startMinute)}-${formatTime(assignment.endMinute)}</div>
      <span class="asset-pill" ${assignment.assetId ? `draggable="true" data-asset-drag="${assignment.assetId}" data-assignment-id="${assignment.id}"` : ""}>
        ${assignment.assetId || "XX"} <button type="button" data-remove="${assignment.id}" title="Remove">x</button>
      </span>
      ${assignment.isReviewer ? `<span class="asset-pill">Reviewer</span>` : ""}
      ${assignment.warningCodes?.length ? `<div>${assignment.warningCodes.join(", ")}</div>` : ""}
      ${assignment.partNumber ? `<span class="asset-pill">Split ${assignment.partNumber}/${assignment.partCount}</span>` : ""}
      <div class="assignment-actions">
        <select class="asset-select" data-assign-asset="${assignment.id}" aria-label="Assign asset">
          <option value="">${assignment.assetId ? "Replace asset" : "Add asset"}</option>
          ${state.model.assets.map((asset) => `<option value="${asset.id}" ${assignment.assetId === asset.id ? "selected" : ""}>${asset.id}</option>`).join("")}
        </select>
        <button class="tiny-btn" type="button" data-lock="${assignment.id}">${assignment.locked ? "Unlock" : "Lock"}</button>
        ${canSplitAssignment(assignment) ? `<button class="tiny-btn" type="button" data-split="${assignment.id}">Split</button>` : ""}
      </div>
    </div>
  `;
}

function canSplitAssignment(assignment) {
  return assignment.position === "Info Desk"
    && (assignment.shiftId === "MORNING" || assignment.shiftId === "AFTERNOON")
    && !assignment.partNumber
    && assignment.endMinute - assignment.startMinute === 240;
}

function groupAssignments(assignments) {
  return assignments.reduce((groups, assignment) => {
    const key = `${assignment.date}:${assignment.shiftId}:${assignment.position}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(assignment);
    return groups;
  }, {});
}
