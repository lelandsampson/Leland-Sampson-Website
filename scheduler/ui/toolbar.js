export function renderToolbar(container, state, actions) {
  const allConfirmed = Object.values(state.session.availabilityConfirmations).every(Boolean);
  container.innerHTML = `
    <button type="button" data-action="generate" ${allConfirmed ? "" : "disabled"}>Generate Schedule</button>
    <button type="button" data-action="regenerate" ${state.session.assignments.length ? "" : "disabled"}>Regenerate Unlocked</button>
    <button class="secondary" type="button" data-action="excel" ${state.session.assignments.length ? "" : "disabled"}>Save Excel</button>
    <button class="secondary" type="button" data-action="json">Save Session JSON</button>
    <button class="secondary" type="button" data-action="load-json">Load Session JSON</button>
    <button class="secondary" type="button" data-action="ics" ${state.session.assignments.length ? "" : "disabled"}>Export ICS</button>
    <button class="danger" type="button" data-action="delete">Restart Week</button>
    <span class="spacer">${allConfirmed ? "Ready to generate" : "Confirm all asset availability to generate"}</span>
  `;
  container.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => actions[button.dataset.action]?.());
  });
}
