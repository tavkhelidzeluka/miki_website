# MIKI / GTXHI — Portfolio

Static portfolio site for visual artist Mykyta Kirichenko. Live at:
`https://tavkhelidzeluka.github.io/miki_website/` (once Pages is enabled).

## Editing content

All editable content (projects, social posts, contact info, prices, about text)
lives in `content/content.json`.

### Easy way (admin UI)

1. Visit `<site>/admin/`.
2. Click **Login with GitHub**. You need write access to this repo.
3. Edit fields, upload images. Click **Save**.
4. Within ~1–2 minutes, the live site updates.

### Direct way (git)

Edit `content/content.json` and push to `main`. GitHub Pages auto-deploys.

### Adding a new piece (e.g. a poster)

**Admin UI:** Navigate to `Projects → POSTERS → works`, click "Add work",
fill in name + desc, drag an image into the `thumb` field (it uploads to
`assets/images/projects/posters/`), optionally set a price.

**Code editor:** Drop the image in `assets/images/projects/posters/`, add an
entry to the `works` array of the POSTERS project in `content/content.json`,
push.

## Order flow

When a customer places an order via the Canvas/Checkout page, the form submits
to Web3Forms, which emails the destination address registered to
`content.json:orderForm.web3formsKey`. The artist replies manually with payment
instructions (PayPal invoice, IBAN, or USDT wallet address).

No card payments are processed on the site itself. Stripe integration is a
documented future upgrade — see the design doc.

## Local development

```bash
python3 -m http.server 8000
open http://localhost:8000/
```

No build step. Babel runs in-browser on the `.jsx` files.

## Deployment

Three independent pieces:

| Piece | Where | How |
|---|---|---|
| **Site** | GitHub Pages | Auto-deploys from `main` (Settings → Pages → Source: branch `main`, `/` root). |
| **Admin** | Same repo as site, served at `/admin/` | Auto-deploys with the site. |
| **OAuth proxy** | Cloudflare Workers | Deploy via `wrangler deploy` from `oauth-proxy/`. Holds the GitHub OAuth client secret as a Worker secret. |

### One-time setup (already done at launch)

1. Web3Forms: signed up at web3forms.com, key in `content.json`.
2. GitHub OAuth App: registered at github.com/settings/developers. Client ID + Secret stored in the Cloudflare Worker.
3. Cloudflare Worker: deployed; URL wired into `admin/config.yml` as `backend.base_url`.
4. GitHub Pages: enabled, `.nojekyll` at repo root prevents Jekyll processing.

### Who can edit the admin

Anyone listed as a **collaborator** on this GitHub repo (or members of an org
team with write access). To grant access: GitHub repo Settings → Collaborators →
Add. To revoke: remove the collaborator. No code change needed.

## Architecture

Pure static site (HTML + JSX + CSS + JSON + images), served from the repo root
via GitHub Pages. React in-browser via Babel (no build step). Content driven by
`content/content.json`. Admin via Decap CMS at `/admin/`, gated by GitHub OAuth
through a Cloudflare Worker proxy that holds the OAuth client secret.

See `docs/superpowers/specs/2026-05-28-static-site-with-decap-admin-design.md`
for the full design rationale, and
`docs/superpowers/plans/2026-05-28-static-site-with-decap-admin.md` for the
implementation steps.
