export function renderSetupPanel(container, state) {
  const confirmed = Object.values(state.session.availabilityConfirmations).filter(Boolean).length;
  const total = state.model.assets.length;
  container.innerHTML = `
    <h2>Weekly Setup</h2>
    <table class="plain-table">
      <tr><th>Week</th><td>${state.session.weekStart} to ${state.session.weekDates.at(-1).date}</td></tr>
      <tr><th>Availability</th><td>${confirmed}/${total} assets confirmed</td></tr>
      <tr><th>Exceptions</th><td>${state.session.weeklyUnavailability.length}</td></tr>
      <tr><th>Assignments</th><td>${state.session.assignments.length}</td></tr>
      <tr><th>Config</th><td>${state.session.configMismatch ? "session uses saved config snapshot" : "current"}</td></tr>
    </table>
  `;
}
