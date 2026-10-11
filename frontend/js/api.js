// const API_BASE = "http://localhost:5000/api";
const API_BASE = "https://campus-lost-found-api-o5so.onrender.com/api";

const Auth = {
  getToken() {
    return localStorage.getItem("lf_token");
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("lf_user"));
    } catch (_) {
      return null;
    }
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  save(token, user) {
    localStorage.setItem("lf_token", token);
    localStorage.setItem("lf_user", JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_user");
  },
};

async function apiRequest(path, options = {}) {
  const token = Auth.getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // no JSON body (e.g. some error responses) — that's fine
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

const ItemsAPI = {
  list(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    ).toString();
    return apiRequest(`/items${query ? `?${query}` : ""}`);
  },
  categories() {
    return apiRequest("/items/categories");
  },
  stats() {
    return apiRequest("/items/stats");
  },
  mine() {
    return apiRequest("/items/mine/list");
  },
  get(id) {
    return apiRequest(`/items/${id}`);
  },
  create(payload) {
    return apiRequest("/items", { method: "POST", body: JSON.stringify(payload) });
  },
  update(id, payload) {
    return apiRequest(`/items/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  toggleResolve(id, resolved) {
    return apiRequest(`/items/${id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ resolved }),
    });
  },
  remove(id) {
    return apiRequest(`/items/${id}`, { method: "DELETE" });
  },
};

const AuthAPI = {
  register(payload) {
    return apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  },
  login(payload) {
    return apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },
  me() {
    return apiRequest("/auth/me");
  },
};

const ResponsesAPI = {
  list(itemId) {
    return apiRequest(`/items/${itemId}/responses`);
  },
  create(itemId, payload) {
    return apiRequest(`/items/${itemId}/responses`, { method: "POST", body: JSON.stringify(payload) });
  },
  verify(responseId) {
    return apiRequest(`/responses/${responseId}/verify`, { method: "PATCH" });
  },
  remove(responseId) {
    return apiRequest(`/responses/${responseId}`, { method: "DELETE" });
  },
};
