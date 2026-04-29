export function renderWarningsPanel(container, state) {
  container.innerHTML = `
    <h2>Warnings</h2>
    ${state.session.warnings.length ? state.session.warnings.map((warning) => `
      <div class="warning-item">
        <strong>${warning.code}</strong><br>
        ${warning.message}
      </div>
    `).join("") : `<p class="empty">No warnings.</p>`}
  `;
}
