import { $, api, getToken, clearToken, showMessage } from "./common.js";

const XSS_PRESETS = [
  {
    label: "Običan tekst",
    payload: "Ovo je sasvim obična bilješka.",
  },
  {
    label: "HTML umetanje",
    payload:
      '<b style="color:crimson;font-size:2em">Ovaj tekst je umetnuti HTML!</b>',
  },
  {
    label: "JavaScript dijalog",
    payload:
      '<img src="x" onerror="alert(\'XSS! Ovaj JavaScript je došao iz baze podataka.\')">',
  },
  {
    label: "Krađa sesije (JWT)",
    payload:
      "<img src=\"x\" onerror=\"alert('Ukradeni token iz localStorage:\\n\\n' + localStorage.getItem('token'))\">",
  },
  {
    label: "Izmjena stranice",
    payload:
      "<img src=\"x\" onerror=\"document.getElementById('page-title').textContent = 'HAKIRANO!'; document.body.style.background = '#3b0a0a'\">",
  },
];

const token = getToken();
let forgedToken = null;

function base64UrlDecode(part) {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64UrlEncode(text) {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function splitToken(jwt) {
  const [header, payload, signature] = jwt.split(".");
  return { header, payload, signature };
}

function decodePayload(jwt) {
  return JSON.parse(base64UrlDecode(splitToken(jwt).payload));
}

function renderTokenParts(element, jwt) {
  const { header, payload, signature } = splitToken(jwt);
  element.replaceChildren(
    span(header, "jwt-header"),
    ".",
    span(payload, "jwt-payload"),
    ".",
    span(signature, "jwt-signature"),
  );
}

function span(text, className) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

function renderUserContent(element, content) {
  if ($("xss-vulnerable").checked) {
    element.innerHTML = content;
  } else {
    element.textContent = content;
  }
}

function logout(query = "") {
  clearToken();
  location.replace(`/login${query}`);
}

$("logout-button").addEventListener("click", () => logout());

for (const preset of XSS_PRESETS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = preset.label;
  button.addEventListener("click", () => {
    $("note-content").value = preset.payload;
  });
  $("xss-presets").append(button);
}

async function loadNotes() {
  const { ok, status, data } = await api("/api/notes");
  if (status === 401) {
    logout("?expired");
    return;
  }
  if (!ok) {
    showMessage($("note-message"), data.error, true);
    return;
  }
  $("notes-list").replaceChildren(...data.notes.map(createNoteItem));
  updateNotesEmptyState();
}

function createNoteItem(note) {
  const item = document.createElement("li");

  const content = document.createElement("div");
  content.className = "note-content";
  content.dataset.raw = note.content;
  renderUserContent(content, note.content);

  const deleteButton = document.createElement("button");
  deleteButton.className = "secondary small";
  deleteButton.textContent = "Obriši";
  deleteButton.addEventListener("click", () => deleteNote(note.id, item));

  item.append(content, deleteButton);
  return item;
}

function updateNotesEmptyState() {
  $("notes-empty").hidden = $("notes-list").children.length > 0;
}

async function deleteNote(id, item) {
  const { ok, data } = await api(`/api/notes/${id}`, { method: "DELETE" });
  if (!ok) {
    showMessage($("note-message"), data.error, true);
    return;
  }
  item.remove();
  updateNotesEmptyState();
}

$("note-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const { ok, data } = await api("/api/notes", {
    method: "POST",
    body: { content: $("note-content").value },
  });

  if (!ok) {
    showMessage($("note-message"), data.error, true);
    return;
  }
  showMessage($("note-message"), "Bilješka spremljena.");
  $("note-content").value = "";
  $("notes-list").prepend(createNoteItem(data.note));
  updateNotesEmptyState();
});

$("xss-vulnerable").addEventListener("change", () => {
  for (const content of document.querySelectorAll("#notes-list .note-content")) {
    renderUserContent(content, content.dataset.raw);
  }
});

function resetAccessControlDemo() {
  renderTokenParts($("token-parts"), token);
  $("payload-editor").value = JSON.stringify(decodePayload(token), null, 2);
  updateForgedToken();
  $("request-line").textContent = "";
  renderAdminResult(null);
}

function readEditedPayload() {
  try {
    return JSON.parse($("payload-editor").value);
  } catch {
    return null;
  }
}

function updateForgedToken() {
  const payload = readEditedPayload();
  if (!payload) {
    forgedToken = null;
    $("forged-token").textContent = "Sadržaj tokena nije ispravan JSON.";
    return;
  }

  const { header, signature } = splitToken(token);
  forgedToken = `${header}.${base64UrlEncode(JSON.stringify(payload))}.${signature}`;
  renderTokenParts($("forged-token"), forgedToken);
}

$("payload-editor").addEventListener("input", updateForgedToken);

$("make-admin-button").addEventListener("click", () => {
  const payload = readEditedPayload();
  if (!payload) return;
  payload.role = "admin";
  $("payload-editor").value = JSON.stringify(payload, null, 2);
  updateForgedToken();
});

$("reset-access-control-button").addEventListener("click", resetAccessControlDemo);

async function requestAdminUsers(authToken) {
  const vulnerable = $("bac-vulnerable").checked;
  const path = `/api/admin/users?vulnerable=${vulnerable}`;
  $("request-line").textContent =
    `GET ${path}\nAuthorization: Bearer ${authToken}`;

  const { status, data } = await api(path, { authToken });
  renderAdminResult({ status, data });
}

$("send-token-button").addEventListener("click", () => {
  if (forgedToken) requestAdminUsers(forgedToken);
});

function renderAdminResult(result) {
  const container = $("admin-result");
  container.replaceChildren();
  if (!result) return;

  const { status, data } = result;
  const success = status === 200;

  const banner = document.createElement("div");
  banner.className = `result ${success ? "success" : "denied"}`;
  banner.append(span(`HTTP ${status}`, "status"), " ");
  banner.append(
    success
      ? `Pristup odobren (${data.tokenCheck}). Server misli da ste "${data.requestedBy.username}" s ulogom "${data.requestedBy.role}".`
      : data.error,
  );
  container.append(banner);

  if (success) {
    container.append(buildUsersTable(data.users));
  }
}

function buildUsersTable(users) {
  const table = document.createElement("table");
  table.innerHTML =
    "<thead><tr><th>ID</th><th>Korisnik</th><th>Hash lozinke</th><th>Privatne bilješke</th></tr></thead>";
  const body = document.createElement("tbody");

  for (const user of users) {
    const row = body.insertRow();
    row.insertCell().textContent = user.id;
    row.insertCell().textContent = user.username;

    const hashCell = row.insertCell();
    hashCell.className = "mono";
    hashCell.textContent = user.passwordHash;

    const notesCell = row.insertCell();
    for (const note of user.notes) {
      const noteElement = document.createElement("div");
      noteElement.className = "note-content";
      noteElement.textContent = note.content;
      notesCell.append(noteElement);
    }
  }

  table.append(body);
  return table;
}

function start() {
  let payload;
  try {
    payload = decodePayload(token);
  } catch {
    logout();
    return;
  }

  $("session-username").textContent = payload.username;
  resetAccessControlDemo();
  loadNotes();
}

start();
