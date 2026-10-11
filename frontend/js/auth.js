// Already logged in? Bounce straight to the board.
if (Auth.isLoggedIn()) {
  window.location.href = "index.html";
}

// Tab switching
document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-form`).classList.add("active");
  });
});

// Where to send the user after login — set by other pages via sessionStorage
function postLoginRedirect() {
  const redirectTo = sessionStorage.getItem("lf_redirect_after_login");
  sessionStorage.removeItem("lf_redirect_after_login");
  window.location.href = redirectTo || "index.html";
}

// --- Login ---
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginStatus.textContent = "";
  loginStatus.className = "form-status";

  const payload = Object.fromEntries(new FormData(loginForm).entries());
  const btn = loginForm.querySelector(".submit-btn");
  btn.disabled = true;
  btn.textContent = "Logging in…";

  try {
    const { token, user } = await AuthAPI.login(payload);
    Auth.save(token, user);
    loginStatus.textContent = "Welcome back!";
    loginStatus.classList.add("success");
    setTimeout(postLoginRedirect, 400);
  } catch (err) {
    loginStatus.textContent = err.message;
    loginStatus.classList.add("error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Log in";
  }
});

// --- Register ---
const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerStatus.textContent = "";
  registerStatus.className = "form-status";

  const payload = Object.fromEntries(new FormData(registerForm).entries());
  const btn = registerForm.querySelector(".submit-btn");
  btn.disabled = true;
  btn.textContent = "Creating account…";

  try {
    const { token, user } = await AuthAPI.register(payload);
    Auth.save(token, user);
    registerStatus.textContent = "Account created!";
    registerStatus.classList.add("success");
    setTimeout(postLoginRedirect, 400);
  } catch (err) {
    registerStatus.textContent = err.message;
    registerStatus.classList.add("error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create account";
  }
});
