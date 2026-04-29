import { isDefaultRoleEligible } from "../model.js";

export function renderPhoneEligibility(container, state, actions) {
  container.innerHTML = `
    <h2>Monday Phone Eligibility</h2>
    <table class="plain-table">
      <thead><tr><th>Asset</th><th>Default</th><th>Weekly</th></tr></thead>
      <tbody>
        ${state.model.assets.map((asset) => {
          const defaultEligible = isDefaultRoleEligible(state.model, asset.id, "Monday", "Phone");
          return `
            <tr>
              <td>${asset.id}</td>
              <td>${defaultEligible ? "Yes" : "No"}</td>
              <td>
                <input type="checkbox" data-phone="${asset.id}" ${state.session.weeklyPhoneEligibility[asset.id] ? "checked" : ""} ${defaultEligible ? "" : "disabled"}>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
  container.querySelectorAll("[data-phone]").forEach((input) => {
    input.addEventListener("change", () => actions.setPhoneEligibility(input.dataset.phone, input.checked));
  });
}
