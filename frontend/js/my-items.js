if (!Auth.isLoggedIn()) {
  sessionStorage.setItem("lf_redirect_after_login", "my-items.html");
  window.location.href = "auth.html";
}

const listEl = document.getElementById("my-items-list");

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

async function load() {
  try {
    const items = await ItemsAPI.mine();

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <strong>You haven't posted anything yet</strong>
          <a class="nav-link primary" href="report.html" style="display:inline-block;margin-top:10px;">+ Report an item</a>
        </div>`;
      return;
    }

    // Pull each item's response thread in parallel so pending claims show up here
    const withResponses = await Promise.all(
      items.map(async (item) => {
        try {
          const responses = await ResponsesAPI.list(item._id);
          return { item, responses };
        } catch (_) {
          return { item, responses: [] };
        }
      })
    );

    listEl.innerHTML = withResponses.map(renderDashItem).join("");
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><strong>Couldn't load your reports</strong>${escapeHtml(err.message)}</div>`;
  }
}

function renderDashItem({ item, responses }) {
  const pending = responses.filter((r) => !r.verified);

  return `
    <div class="dash-item">
      <div class="dash-item-head">
        <div>
          <h3><a href="item.html?id=${item._id}" style="color:inherit;text-decoration:none;">${escapeHtml(item.title)}</a></h3>
          <div class="tag-row" style="margin-top:6px;">
            <span class="tag ${item.status}">${item.status}</span>
            <span class="tag category">${escapeHtml(item.category)}</span>
            ${item.resolved ? '<span class="tag resolved-tag">Resolved</span>' : ""}
          </div>
        </div>
        <div class="card-actions" style="border:none;padding:0;margin:0;">
          <button class="btn resolve" data-action="resolve" data-id="${item._id}">${item.resolved ? "Reopen" : "Mark resolved"}</button>
          <button class="btn delete" data-action="delete" data-id="${item._id}">Delete</button>
        </div>
      </div>

      <div class="dash-claims">
        ${
          pending.length
            ? pending
                .map(
                  (r) => `
                  <div class="dash-claim-row">
                    <span>
                      <strong>${escapeHtml(r.author.name)}</strong>
                      ${r.isClaim ? '<span class="tag claim-tag" style="margin-left:6px;">Claim</span>' : ""}
                      — ${escapeHtml(r.message)}
                      <span class="response-time"> · ${timeAgo(r.createdAt)}</span>
                    </span>
                    <button class="btn resolve" data-action="verify" data-id="${r._id}">Verify &amp; resolve</button>
                  </div>
                `
                )
                .join("")
            : `<p class="detail-meta">No responses yet.</p>`
        }
      </div>
    </div>
  `;
}

async function handleClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "delete") {
    const ok = await confirmDialog("Delete this report? This can't be undone.");
    if (!ok) return;
    try {
      await ItemsAPI.remove(id);
      toast("Item deleted.", "success");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (action === "resolve") {
    try {
      await ItemsAPI.toggleResolve(id);
      toast("Status updated.", "success");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (action === "verify") {
    const ok = await confirmDialog("Verify this response? This will mark the item as resolved.");
    if (!ok) return;
    try {
      await ResponsesAPI.verify(id);
      toast("Verified — item marked resolved.", "success");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }
}

listEl.addEventListener("click", handleClick);
load();
