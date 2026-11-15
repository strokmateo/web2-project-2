import { $, api, getToken, saveToken, showMessage } from "./common.js";

if (getToken()) {
  location.replace("/");
}

if (new URLSearchParams(location.search).has("expired")) {
  showMessage(
    $("auth-message"),
    "Token je istekao. Prijavite se ponovno.",
    true,
  );
}

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const fields = new FormData(form);

  const { ok, data } = await api(form.dataset.endpoint, {
    method: "POST",
    body: {
      username: fields.get("username"),
      password: fields.get("password"),
    },
  });

  if (!ok) {
    showMessage($("auth-message"), data.error, true);
    return;
  }
  saveToken(data.token);
  location.replace("/");
});
