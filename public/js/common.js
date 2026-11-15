const TOKEN_KEY = "token";

export const $ = (id) => document.getElementById(id);

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api(
  path,
  { method = "GET", body, authToken = getToken() } = {},
) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data =
    response.status === 204 ? {} : await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export function showMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("error", isError);
}
