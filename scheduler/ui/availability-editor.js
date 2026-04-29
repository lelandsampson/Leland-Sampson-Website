import { DAYS } from "../config.js";
import { DAY_END_MINUTE, DAY_START_MINUTE, formatTime, timeSlots } from "../time.js";
import { isTimeAvailable } from "../model.js";

export function renderAvailabilityEditor(container, state, actions) {
  const selected = state.session.selectedAssetId || state.model.assets[0]?.id;
  container.innerHTML = `
    <h2>Asset Availability</h2>
    <div class="asset-list">
      ${state.model.assets.map((asset) => `
        <button class="asset-chip ${asset.id === selected ? "active" : ""} ${state.session.availabilityConfirmations[asset.id] ? "confirmed" : ""}" data-asset="${asset.id}" type="button">${asset.id}</button>
      `).join("")}
    </div>
    <label class="confirm-row">
      <input id="confirm-availability" type="checkbox" ${state.session.availabilityConfirmations[selected] ? "checked" : ""}>
      Availability confirmed for ${selected}
    </label>
    <div class="availability-grid">
      <div class="grid-head">Time</div>
      ${DAYS.map((day) => `<div class="grid-head">${day}</div>`).join("")}
      ${timeSlots(DAY_START_MINUTE, DAY_END_MINUTE).map((minute) => `
        <div class="time-cell">${formatTime(minute)}</div>
        ${state.session.weekDates.map((dateInfo) => slotCell(state, selected, dateInfo, minute)).join("")}
      `).join("")}
    </div>
  `;
  container.querySelectorAll("[data-asset]").forEach((button) => {
    button.addEventListener("click", () => actions.selectAsset(button.dataset.asset));
  });
  container.querySelector("#confirm-availability").addEventListener("change", (event) => {
    actions.confirmAvailability(selected, event.target.checked);
  });
  container.querySelectorAll("[data-slot]").forEach((cell) => {
    cell.addEventListener("click", () => actions.toggleUnavailable(selected, cell.dataset.date, cell.dataset.day, Number(cell.dataset.minute)));
  });
}

function slotCell(state, assetId, dateInfo, minute) {
  const available = isTimeAvailable(state.model, state.session, assetId, dateInfo.date, dateInfo.dayOfWeek, minute, minute + 30);
  const weekly = state.session.weeklyUnavailability.some((block) => block.assetId === assetId && block.date === dateInfo.date && !block.allDay && block.startMinute <= minute && block.endMinute > minute);
  const cls = weekly ? "weekly-unavailable" : available ? "available" : "default-unavailable";
  return `<button class="slot-cell ${cls}" data-slot="1" data-date="${dateInfo.date}" data-day="${dateInfo.dayOfWeek}" data-minute="${minute}" type="button" title="${dateInfo.date} ${formatTime(minute)}"></button>`;
}
