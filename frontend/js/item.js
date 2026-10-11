const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");

const detailContainer = document.getElementById("detail-container");
const threadContainer = document.getElementById("thread-container");
const currentUser = Auth.getUser();

let categories = [];
let currentItem = null;

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function categoryOptions(selected) {
  return categories
    .map((c) => `<option value="${c}" ${c === selected ? "selected" : ""}>${c}</option>`)
    .join("");
}

if (!itemId) {
  detailContainer.innerHTML = `<div class="empty-state"><strong>No item specified</strong></div>`;
} else {
  init();
}

async function init() {
  try {
    categories = await ItemsAPI.categories();
  } catch (_) {
    categories = [];
  }
  await loadItem();
  await loadThread();
}

async function loadItem() {
  try {
    currentItem = await ItemsAPI.get(itemId);
    renderDetail();
  } catch (err) {
    detailContainer.innerHTML = `<div class="empty-state"><strong>Couldn't load this item</strong>${escapeHtml(err.message)}</div>`;
  }
}

function renderDetail() {
  const item = currentItem;
  const isMine = currentUser && item.postedBy && item.postedBy._id === currentUser.id;

  detailContainer.innerHTML = `
    <div class="detail-card">
      <div class="tag-row">
        <span class="tag ${item.status}">${item.status}</span>
        <span class="tag category">${escapeHtml(item.category)}</span>
        ${item.resolved ? '<span class="tag resolved-tag">Resolved</span>' : ""}
        ${isMine ? '<span class="tag mine-tag">Yours</span>' : ""}
      </div>
      <h2 id="view-title">${escapeHtml(item.title)}</h2>
      <p class="detail-meta" id="view-description">${escapeHtml(item.description)}</p>
      <p class="detail-meta"><strong>Where:</strong> <span id="view-location">${escapeHtml(item.location)}</span></p>
      <p class="detail-meta"><strong>Date:</strong> <span id="view-date">${new Date(item.date).toLocaleDateString()}</span></p>
      <p class="detail-meta"><strong>Posted by:</strong> ${escapeHtml(item.postedBy ? item.postedBy.name : "a student")} · ${timeAgo(item.createdAt)}</p>
      <p class="detail-meta"><strong>Contact:</strong> ${escapeHtml(item.contactEmail)}</p>

      ${
        isMine
          ? `
            <div class="detail-actions">
              <button class="btn edit" id="edit-toggle-btn" type="button">Edit</button>
              <button class="btn resolve" id="resolve-btn" type="button">${item.resolved ? "Reopen" : "Mark resolved"}</button>
              <button class="btn delete" id="delete-item-btn" type="button">Delete</button>
            </div>

            <form id="edit-form" class="edit-grid">
              <div class="full">
                <label for="edit-title">Title</label>
                <input id="edit-title" name="title" value="${escapeHtml(item.title)}" required maxlength="120" />
              </div>
              <div class="full">
                <label for="edit-description">Description</label>
                <textarea id="edit-description" name="description" required maxlength="1000">${escapeHtml(item.description)}</textarea>
              </div>
              <div>
                <label for="edit-category">Category</label>
                <select id="edit-category" name="category">${categoryOptions(item.category)}</select>
              </div>
              <div>
                <label for="edit-status">Status</label>
                <select id="edit-status" name="status">
                  <option value="lost" ${item.status === "lost" ? "selected" : ""}>Lost</option>
                  <option value="found" ${item.status === "found" ? "selected" : ""}>Found</option>
                </select>
              </div>
              <div>
                <label for="edit-location">Location</label>
                <input id="edit-location" name="location" value="${escapeHtml(item.location)}" required maxlength="150" />
              </div>
              <div>
                <label for="edit-date">Date</label>
                <input id="edit-date" name="date" type="date" value="${new Date(item.date).toISOString().slice(0, 10)}" required />
              </div>
              <div class="full">
                <button class="btn resolve" type="submit">Save changes</button>
                <button class="btn" type="button" id="cancel-edit-btn">Cancel</button>
              </div>
            </form>
          `
          : ""
      }
    </div>
  `;

  if (isMine) {
    document.getElementById("edit-toggle-btn").addEventListener("click", () => {
      document.getElementById("edit-form").classList.toggle("active");
    });
    document.getElementById("cancel-edit-btn").addEventListener("click", () => {
      document.getElementById("edit-form").classList.remove("active");
    });
    document.getElementById("edit-form").addEventListener("submit", handleEditSubmit);
    document.getElementById("resolve-btn").addEventListener("click", handleResolveToggle);
    document.getElementById("delete-item-btn").addEventListener("click", handleDeleteItem);
  }
}

async function handleEditSubmit(e) {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  try {
    currentItem = await ItemsAPI.update(itemId, payload);
    toast("Changes saved.", "success");
    renderDetail();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function handleResolveToggle() {
  try {
    currentItem = await ItemsAPI.toggleResolve(itemId);
    toast("Status updated.", "success");
    renderDetail();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function handleDeleteItem() {
  const ok = await confirmDialog("Delete this report? This can't be undone.");
  if (!ok) return;
  try {
    await ItemsAPI.remove(itemId);
    toast("Item deleted.", "success");
    setTimeout(() => (window.location.href = "index.html"), 500);
  } catch (err) {
    toast(err.message, "error");
  }
}

// --- Response thread ---

async function loadThread() {
  try {
    const responses = await ResponsesAPI.list(itemId);
    renderThread(responses);
  } catch (err) {
    threadContainer.innerHTML = `<div class="empty-state"><strong>Couldn't load responses</strong>${escapeHtml(err.message)}</div>`;
  }
}

function renderThread(responses) {
  const item = currentItem;
  const isMine = currentUser && item.postedBy && item.postedBy._id === currentUser.id;

  const list = responses.length
    ? responses
        .map((r) => {
          const canDelete = currentUser && (r.author._id === currentUser.id || isMine || currentUser.role === "admin");
          return `
            <div class="response-item" data-id="${r._id}">
              <div class="response-head">
                <span class="response-author">${escapeHtml(r.author.name)}</span>
                ${r.isClaim ? '<span class="tag claim-tag">Claim</span>' : ""}
                ${r.verified ? '<span class="tag found">Verified</span>' : ""}
                <span class="response-time">${timeAgo(r.createdAt)}</span>
              </div>
              <p class="response-message">${escapeHtml(r.message)}</p>
              <div class="response-actions">
                ${isMine && !r.verified ? `<button class="btn resolve" data-action="verify" data-id="${r._id}">Verify &amp; resolve</button>` : ""}
                ${canDelete ? `<button class="btn delete" data-action="delete-response" data-id="${r._id}">Delete</button>` : ""}
              </div>
            </div>
          `;
        })
        .join("")
    : `<p class="detail-meta">No responses yet.</p>`;

  let formOrPrompt;
  if (!currentUser) {
    formOrPrompt = `<p class="login-prompt">Have info about this item? <a href="auth.html">Log in</a> to respond.</p>`;
  } else if (isMine) {
    formOrPrompt = `<p class="detail-meta">This is your report — verify a response below once you've confirmed it's the right person.</p>`;
  } else {
    formOrPrompt = `
      <form class="respond-form" id="respond-form">
        <textarea id="respond-message" placeholder="Ask a question, or say why you think it's yours…" required maxlength="500"></textarea>
        <div class="respond-row">
          <label class="claim-checkbox">
            <input type="checkbox" id="respond-is-claim" />
            This is a claim — I believe this item is mine
          </label>
          <button class="submit-btn" type="submit">Post response</button>
        </div>
      </form>
    `;
  }

  threadContainer.innerHTML = `
    <div class="thread-section">
      <h3>Responses</h3>
      ${list}
      ${formOrPrompt}
    </div>
  `;

  const respondForm = document.getElementById("respond-form");
  if (respondForm) {
    respondForm.addEventListener("submit", handleRespondSubmit);
  }
}

// Bound once — threadContainer's innerHTML is replaced on re-render, but the
// element itself persists, so delegating here (instead of in renderThread)
// avoids stacking up duplicate listeners on every refresh.
threadContainer.addEventListener("click", handleThreadClick);

async function handleRespondSubmit(e) {
  e.preventDefault();
  const message = document.getElementById("respond-message").value.trim();
  const isClaim = document.getElementById("respond-is-claim").checked;
  if (!message) return;

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;

  try {
    await ResponsesAPI.create(itemId, { message, isClaim });
    toast("Response posted.", "success");
    await loadThread();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function handleThreadClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "verify") {
    const ok = await confirmDialog("Verify this response? This will mark the item as resolved.");
    if (!ok) return;
    try {
      await ResponsesAPI.verify(id);
      toast("Verified — item marked resolved.", "success");
      await loadItem();
      await loadThread();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (action === "delete-response") {
    const ok = await confirmDialog("Delete this response?");
    if (!ok) return;
    try {
      await ResponsesAPI.remove(id);
      toast("Response deleted.", "success");
      await loadThread();
    } catch (err) {
      toast(err.message, "error");
    }
  }
}
