# Portfolio v2 — Anirudh Sahu (aspartic)

Personal portfolio site: static HTML/CSS/JS, deployed to GitHub Pages. Live features include a GitHub contribution heatmap, Last.fm “now playing” card, keyboard command palette, and light/dark theme.

For a deep dive into structure and data flow, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Tech stack

| Piece | Choice |
|-------|--------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (no framework) |
| Package manager | None (no `package.json`) |
| APIs | Last.fm, GitHub Contributions proxy, CounterAPI |
| Fonts / icons | Google Fonts (JetBrains Mono), Simple Icons CDN |
| Hosting | GitHub Pages |
| CI | GitHub Actions (`deploy.yml`) |

There is **no backend** in this repository. All “server” behavior is either static files or calls from the browser to public APIs.

## Project structure

```
.
├── index.html           # Home
├── projects.html        # Project showcase
├── blogs.html           # Blog placeholder
├── research.html        # Research placeholder
├── 404.html             # Not found page
├── styles.css           # Global styles
├── script.js            # All client-side logic
├── config.example.js    # Copy → config.js for local dev
├── assets/              # Images (avatar, logos, etc.)
├── ARCHITECTURE.md      # Technical architecture notes
└── .github/workflows/deploy.yml
```

## Local development

1. Clone the repo.
2. Copy the config template:
   ```bash
   cp config.example.js config.js
   ```
3. Edit `config.js` with your [Last.fm API key](https://www.last.fm/api/account/create) and username.
4. Serve the folder with any static server (opening `index.html` directly works for most features; some browsers restrict `fetch` on `file://` — prefer a local server):

   ```bash
   npx --yes serve .
   ```

   Or with Python:

   ```bash
   python -m http.server 8080
   ```

5. Open `http://localhost:8080` (or the port your tool prints).

Without `config.js`, the Last.fm widget stays on the placeholder text in HTML; the heatmap and theme still work.

## Environment / secrets

| Variable | Where | Purpose |
|----------|--------|---------|
| `LASTFM_API_KEY` | GitHub Actions secret | Injected into `config.js` on deploy |
| `LASTFM_USER` | GitHub Actions secret | Last.fm username on deploy |

Local: set both in `config.js` (never commit — listed in `.gitignore`).

## Deployment

Pushes to `main` run **Deploy to GitHub Pages**:

1. CI writes `config.js` from secrets.
2. The repo root is uploaded as the site artifact.
3. GitHub Pages serves it.

Configure secrets under **Settings → Secrets and variables → Actions** in your GitHub repo.

## Features (user-facing)

- **Theme** — Light/dark toggle; preference stored in `localStorage`.
- **Command palette** — `Ctrl+K` (or `Cmd+K` on Mac): navigate, toggle theme, copy email, open resume.
- **GitHub activity** — Contribution grid for `aspartic-gthb` (via third-party JSON API).
- **Now playing** — Last.fm recent track (updates every 30s on the home page).
- **Visitor counter** — CounterAPI increment on home page load (see ARCHITECTURE.md for behavior).
- **Projects / Blogs / Research** — Multi-page navigation; blogs and research are placeholders.

## Customization checklist

To make this repo yours, search and replace:

- Name, bio, education, experience in `index.html`
- Project entries in `projects.html`
- GitHub username in `script.js` (`github-contributions-api.deno.dev/...`)
- Social links and email in `index.html` and `handleAction('copy-email')` in `script.js`
- CounterAPI namespace/key in `script.js` (`aspartic-portfolio`, `main-visits`)
- `config.example.js` / GitHub secrets for Last.fm

## Scripts and commands

There are no npm scripts. Useful commands:

| Task | Command |
|------|---------|
| Local static server | `npx --yes serve .` |
| Create local config | `cp config.example.js config.js` |

## License

© 2026 Anirudh Sahu (aspartic). All rights reserved unless you add a separate license file.
