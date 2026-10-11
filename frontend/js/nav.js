function renderNav() {
  const authArea = document.getElementById("nav-auth-area");
  const myItemsLink = document.getElementById("nav-my-items");
  if (!authArea) return;

  const user = Auth.getUser();

  if (user) {
    if (myItemsLink) myItemsLink.style.display = "";
    authArea.innerHTML = `
      <span class="nav-user">Hi, ${user.name.split(" ")[0]}</span>
      <button class="nav-link logout-btn" id="logout-btn" type="button">Log out</button>
    `;
    document.getElementById("logout-btn").addEventListener("click", () => {
      Auth.clear();
      toast("Logged out.", "info");
      setTimeout(() => (window.location.href = "index.html"), 400);
    });
  } else {
    if (myItemsLink) myItemsLink.style.display = "none";
    authArea.innerHTML = `<a class="nav-link" href="auth.html">Log in</a>`;
  }
}

document.addEventListener("DOMContentLoaded", renderNav);
