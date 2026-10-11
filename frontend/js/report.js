// Reporting an item requires an account — bounce to login if needed.
if (!Auth.isLoggedIn()) {
  sessionStorage.setItem("lf_redirect_after_login", "report.html");
  window.location.href = "auth.html";
}

const form = document.getElementById("report-form");
const categorySelect = document.getElementById("category-input");
const statusEl = document.getElementById("form-status");
const postingAs = document.getElementById("posting-as");

const currentUser = Auth.getUser();
if (currentUser) {
  postingAs.textContent = `Posting as ${currentUser.name} (${currentUser.email}) — pin it to the board below.`;
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "";
  statusEl.className = "form-status";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  if (!payload.status) {
    statusEl.textContent = "Choose whether this item was lost or found.";
    statusEl.classList.add("error");
    return;
  }

  const submitBtn = form.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Pinning to board…";

  try {
    await ItemsAPI.create(payload);
    toast("Posted! Your item is now on the board.", "success");
    statusEl.textContent = "Posted! Redirecting…";
    statusEl.classList.add("success");
    form.reset();
    setTimeout(() => {
      window.location.href = "index.html";
    }, 700);
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.classList.add("error");
    toast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Pin to board";
  }
});

loadCategories();
