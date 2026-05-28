// GitHub OAuth code-exchange proxy for Decap CMS.
//
// Endpoints:
//   GET /auth      → sets a CSRF `state` cookie and redirects to GitHub's
//                    authorize URL.
//   GET /callback  → verifies the state cookie, exchanges the code for an
//                    access token, and posts the token back to the admin
//                    window — only to an origin on the configured allowlist.
//
// Required env (set in wrangler.toml or via `wrangler secret put`):
//   GITHUB_CLIENT_ID     (secret)
//   GITHUB_CLIENT_SECRET (secret)
//   ADMIN_ORIGINS        (var)   comma-separated, e.g.
//                                  "https://user.github.io,http://localhost:8000"
//                                The token is only sent to origins on this list.

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

const STATE_COOKIE = "oauth_state";
const STATE_TTL_SECONDS = 600; // 10 minutes — plenty for an interactive flow

// JSON.stringify doesn't escape `<` by default, so a malicious token could
// inject `</script>` and break out of an inline <script> context. Escape the
// dangerous sequences before interpolation.
function jsonForScript(value) {
  // JSON.stringify doesn't escape < or U+2028/U+2029 by default. In an inline
  // <script> context an embedded "</script>" would break out, and U+2028 /
  // U+2029 break ES5 string literals. Escape both before interpolation.
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\u003e")
    .replace(/[\u2028\u2029]/g, function (m) {
      return m.charCodeAt(0) === 0x2028 ? "\\u2028" : "\\u2029";
    });
}

function htmlResponse(body, extraHeaders) {
  return new Response(`<!doctype html><html><body>${body}</body></html>`, {
    headers: Object.assign(
      { "content-type": "text/html; charset=utf-8" },
      extraHeaders || {}
    ),
  });
}

function parseAllowedOrigins(env) {
  return (env.ADMIN_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function generateState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url
  let s = btoa(String.fromCharCode.apply(null, bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

function renderCallbackPage(messagePayload, allowedOrigins) {
  const payloadJson = jsonForScript(messagePayload);
  const originsJson = jsonForScript(allowedOrigins);
  // The popup waits for the parent to identify itself. The parent's `e.origin`
  // is validated against the allowlist before the token is sent — and is sent
  // *only* to that exact origin, never to "*".
  return htmlResponse(
    `<script>
(function () {
  var ALLOWED = ${originsJson};
  var PAYLOAD = ${payloadJson};
  function isAllowed(origin) {
    for (var i = 0; i < ALLOWED.length; i++) {
      if (ALLOWED[i] === origin) return true;
    }
    return false;
  }
  window.addEventListener("message", function (e) {
    // Reject any message from an origin not on the allowlist.
    if (!isAllowed(e.origin)) return;
    if (!window.opener) return;
    window.opener.postMessage(PAYLOAD, e.origin);
  }, false);
  // Announce readiness to each allowed origin. The handshake string carries no
  // sensitive data; it is safe to broadcast individually to each allowed
  // origin (never to "*").
  if (window.opener) {
    for (var j = 0; j < ALLOWED.length; j++) {
      window.opener.postMessage("authorizing:github", ALLOWED[j]);
    }
  }
})();
</script>`
  );
}

function setStateCookie(state) {
  // SameSite=Lax allows the cookie to be sent on the top-level redirect from
  // github.com back to /callback. HttpOnly so admin-page JS can't read it.
  return [
    `${STATE_COOKIE}=${state}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${STATE_TTL_SECONDS}`,
  ].join("; ");
}

function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowed = parseAllowedOrigins(env);

    if (!env.ADMIN_ORIGINS || allowed.length === 0) {
      return new Response(
        "OAuth proxy misconfigured: ADMIN_ORIGINS env var is empty.\n" +
          "Set it in wrangler.toml [vars] to the admin site's origin(s),\n" +
          "comma-separated, no trailing slashes.\n",
        { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    if (url.pathname === "/auth") {
      const state = generateState();
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        scope: "repo,user",
        redirect_uri: `${url.origin}/callback`,
        state,
      });
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${GITHUB_AUTHORIZE_URL}?${params}`,
          "Set-Cookie": setStateCookie(state),
        },
      });
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const expectedState = getCookie(request, STATE_COOKIE);

      // Constant-time-ish state comparison. Both values are short opaque
      // strings, so a length-check plus equality is fine for this threat
      // model — we're protecting against CSRF, not timing oracles.
      if (
        !code ||
        !returnedState ||
        !expectedState ||
        returnedState !== expectedState
      ) {
        return new Response("invalid OAuth state", {
          status: 400,
          headers: { "Set-Cookie": clearStateCookie() },
        });
      }

      let data;
      try {
        const tokenRes = await fetch(GITHUB_TOKEN_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
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
        const page = renderCallbackPage(
          `authorization:github:error:${JSON.stringify({
            error: "token_exchange_failed",
            message: String(err),
          })}`,
          allowed
        );
        page.headers.set("Set-Cookie", clearStateCookie());
        return page;
      }

      let payload;
      if (data.error || !data.access_token) {
        payload = `authorization:github:error:${JSON.stringify(data)}`;
      } else {
        payload = `authorization:github:success:${JSON.stringify({
          token: data.access_token,
          provider: "github",
        })}`;
      }

      const page = renderCallbackPage(payload, allowed);
      page.headers.set("Set-Cookie", clearStateCookie());
      return page;
    }

    return new Response(
      "miki oauth proxy — endpoints: /auth, /callback\n",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  },
};
