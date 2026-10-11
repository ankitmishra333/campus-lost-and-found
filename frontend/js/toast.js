function toast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add("show"));

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 3600);
}

/**
 * A small styled confirm dialog so destructive actions don't rely on the
 * browser's native confirm(). Resolves true/false.
 */
function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-box">
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn" data-choice="cancel">Cancel</button>
          <button class="btn delete" data-choice="ok">Yes, do it</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    overlay.addEventListener("click", (e) => {
      const choice = e.target.dataset.choice;
      if (!choice && e.target !== overlay) return;
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 200);
      resolve(choice === "ok");
    });
  });
}
