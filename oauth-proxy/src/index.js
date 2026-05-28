// GitHub OAuth code-exchange proxy for Decap CMS.
//
// Two endpoints:
//   GET  /auth      → redirects the browser to github.com/login/oauth/authorize
//   GET  /callback  → exchanges the temporary code for an access token and
//                     posts it back to the admin window via postMessage,
//                     then closes itself.
//
// Decap's frontend expects the postMessage payload to be a string starting
// with `authorization:github:success:` followed by a JSON blob with `token`
// and `provider`. On failure, the prefix is `authorization:github:error:`.
//
// Required env (set via `wrangler secret put`):
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

function html(body) {
  return new Response(
    `<!doctype html><html><body>${body}</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

function renderCallbackPage(messagePayload) {
  // messagePayload is the full string Decap expects, e.g.:
  //   authorization:github:success:{"token":"gho_...","provider":"github"}
  // We embed it as a JSON-encoded string so quotes inside don't break the script.
  const safe = JSON.stringify(messagePayload);
  return html(
    `<script>
(function () {
  function send() {
    if (!window.opener) return;
    window.opener.postMessage(${safe}, "*");
  }
  // Decap listens for "authorizing:<provider>" first, then sends back its own
  // message; we then reply with the success/error payload.
  window.addEventListener("message", function () { send(); }, false);
  if (window.opener) window.opener.postMessage("authorizing:github", "*");
})();
</script>`
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        scope: "repo,user",
        redirect_uri: `${url.origin}/callback`,
      });
      return Response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`, 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("missing code", { status: 400 });
      }

      let data;
      try {
        const tokenRes = await fetch(GITHUB_TOKEN_URL, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });
        data = await tokenRes.json();
      } catch (err) {
        return renderCallbackPage(
          `authorization:github:error:${JSON.stringify({ error: "token_exchange_failed", message: String(err) })}`
        );
      }

      if (data.error || !data.access_token) {
        return renderCallbackPage(
          `authorization:github:error:${JSON.stringify(data)}`
        );
      }

      return renderCallbackPage(
        `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: "github" })}`
      );
    }

    return new Response(
      "miki oauth proxy — endpoints: /auth, /callback\n",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  },
};
