import { addDays, getMonday } from "../model.js";
import { hasSavedSession } from "../session.js";

export function renderWeekSelector(container, state, actions) {
  const first = getMonday(new Date());
  const weeks = Array.from({ length: 6 }, (_, index) => addDays(first, index * 7));
  container.innerHTML = `
    <section class="panel">
      <h2>Schedule Week</h2>
      <div class="week-row">
        ${weeks.map((week) => `
          <button class="week-card ${week === state.session.weekStart ? "active" : ""}" data-week="${week}" type="button">
            <div class="date">${week}</div>
            <div class="meta">${hasSavedSession(week) ? "Saved session" : "New session"}</div>
          </button>
        `).join("")}
      </div>
    </section>
  `;
  container.querySelectorAll("[data-week]").forEach((button) => {
    button.addEventListener("click", () => actions.selectWeek(button.dataset.week));
  });
}
