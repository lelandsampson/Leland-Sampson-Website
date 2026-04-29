import { scheduledHours } from "../validation.js";

export function renderTargetSummary(container, state) {
  const totals = scheduledHours(state.session.assignments);
  container.innerHTML = `
    <h2>Target Hours</h2>
    <table class="summary-table">
      <thead><tr><th>Asset</th><th>Hours</th><th>Target</th><th>Status</th></tr></thead>
      <tbody>
        ${state.model.assets.map((asset) => {
          const target = state.model.targets[asset.id] || {};
          const hours = totals[asset.id] || 0;
          const status = statusText(hours, target);
          return `<tr><td>${asset.id}</td><td>${hours}</td><td>${target.targetHours || 0}</td><td class="${status.className}">${status.text}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function statusText(hours, target) {
  if (!target.targetHours && !target.maxHours && !target.minHours) return { text: "No target", className: "status-warn" };
  if (target.maxHours && hours > target.maxHours) return { text: "Over max", className: "status-bad" };
  if (target.minHours && hours < target.minHours) return { text: "Under min", className: "status-warn" };
  return { text: "OK", className: "status-ok" };
}
