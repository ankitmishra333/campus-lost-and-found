const state = {
  q: "",
  category: "all",
  status: "all",
  sort: "newest",
  page: 1,
  limit: 9,
};

const grid = document.getElementById("board-grid");
const meta = document.getElementById("result-meta");
const pagination = document.getElementById("pagination");
const statsBar = document.getElementById("stats-bar");
const searchInput = document.getElementById("search-input");
const categorySelect = document.getElementById("category-select");
const statusSelect = document.getElementById("status-select");
const sortSelect = document.getElementById("sort-select");

const currentUser = Auth.getUser();

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

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadStats() {
  try {
    const s = await ItemsAPI.stats();
    statsBar.innerHTML = `
      <div class="stat-card"><span class="num">${s.totalItems}</span><span class="label">On the board</span></div>
      <div class="stat-card"><span class="num">${s.totalLost}</span><span class="label">Lost</span></div>
      <div class="stat-card"><span class="num">${s.totalFound}</span><span class="label">Found</span></div>
      <div class="stat-card"><span class="num">${s.totalResolved}</span><span class="label">Resolved</span></div>
    `;
  } catch (err) {
    statsBar.innerHTML = "";
  }
}

function renderCard(item) {
  const isMine = currentUser && item.postedBy && item.postedBy._id === currentUser.id;

  const card = document.createElement("article");
  card.className = `item-card${item.resolved ? " resolved" : ""}`;
  card.innerHTML = `
    <div class="tag-row">
      <span class="tag ${item.status}">${item.status}</span>
      <span class="tag category">${escapeHtml(item.category)}</span>
      ${item.resolved ? '<span class="tag resolved-tag">Resolved</span>' : ""}
      ${isMine ? '<span class="tag mine-tag">Yours</span>' : ""}
    </div>
    <h3><a href="item.html?id=${item._id}">${escapeHtml(item.title)}</a></h3>
    <p class="description">${escapeHtml(item.description)}</p>
    <p class="item-meta"><strong>Where:</strong> ${escapeHtml(item.location)}</p>
    <p class="item-meta"><strong>Posted by:</strong> ${escapeHtml(item.postedBy ? item.postedBy.name : "a student")}</p>
    <p class="item-meta">${timeAgo(item.createdAt)}</p>
    <div class="card-actions">
      ${
        isMine
          ? `
            <button class="btn resolve" data-action="resolve" data-id="${item._id}">
              ${item.resolved ? "Reopen" : "Mark resolved"}
            </button>
            <button class="btn delete" data-action="delete" data-id="${item._id}">Delete</button>
          `
          : `<a class="btn" href="item.html?id=${item._id}">View &amp; respond</a>`
      }
    </div>
  `;
  return card;
}

async function loadCategories() {
  try {
    const categories = await ItemsAPI.categories();
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Could not load categories:", err.message);
  }
}

async function loadItems() {
  grid.innerHTML = `<div class="empty-state"><strong>Loading the board…</strong></div>`;
  try {
    const { items, pagination: p } = await ItemsAPI.list({
      q: state.q,
      category: state.category,
      status: state.status,
      sort: state.sort,
      page: state.page,
      limit: state.limit,
    });

    grid.innerHTML = "";

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>Nothing pinned here yet</strong>
          Try a different search or filter, or be the first to report an item.
        </div>`;
    } else {
      items.forEach((item) => grid.appendChild(renderCard(item)));
    }

    meta.textContent = `${p.total} item${p.total === 1 ? "" : "s"} on the board`;
    renderPagination(p);
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <strong>Couldn't reach the board</strong>
        ${escapeHtml(err.message)} — is the backend running on localhost:5000?
      </div>`;
    meta.textContent = "";
    pagination.innerHTML = "";
  }
}

function renderPagination(p) {
  pagination.innerHTML = "";
  if (p.pages <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "← Prev";
  prev.disabled = p.page <= 1;
  prev.addEventListener("click", () => {
    state.page -= 1;
    loadItems();
  });
  pagination.appendChild(prev);

  for (let i = 1; i <= p.pages; i += 1) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === p.page) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.page = i;
      loadItems();
    });
    pagination.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Next →";
  next.disabled = p.page >= p.pages;
  next.addEventListener("click", () => {
    state.page += 1;
    loadItems();
  });
  pagination.appendChild(next);
}

// --- Event wiring ---

let searchTimer;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.q = e.target.value;
    state.page = 1;
    loadItems();
  }, 350);
});

categorySelect.addEventListener("change", (e) => {
  state.category = e.target.value;
  state.page = 1;
  loadItems();
});

statusSelect.addEventListener("change", (e) => {
  state.status = e.target.value;
  state.page = 1;
  loadItems();
});

sortSelect.addEventListener("change", (e) => {
  state.sort = e.target.value;
  state.page = 1;
  loadItems();
});

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "delete") {
    const ok = await confirmDialog("Remove this item from the board? This can't be undone.");
    if (!ok) return;
    try {
      await ItemsAPI.remove(id);
      toast("Item deleted.", "success");
      loadItems();
      loadStats();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (action === "resolve") {
    try {
      await ItemsAPI.toggleResolve(id);
      toast("Status updated.", "success");
      loadItems();
      loadStats();
    } catch (err) {
      toast(err.message, "error");
    }
  }
});

loadCategories();
loadStats();
loadItems();
