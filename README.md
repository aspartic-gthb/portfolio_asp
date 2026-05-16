# Portfolio v2 - Anirudh Sahu

A modern, responsive portfolio website featuring a dynamic design, GitHub activity heatmap, and a real-time "Now Playing" music status powered by Last.fm.

## Features
- **Dynamic Last.fm Widget**: Shows real-time listening activity.
- **GitHub Activity Tracker**: Live contribution heatmap.
- **Command Palette**: Keyboard-first navigation (Ctrl+K).
- **Theme Support**: Adaptive light/dark modes.
- **Interactive Elements**: Pixel-art pet and smooth micro-animations.

## Setup
To run this project locally and enable the Last.fm widget:

1. Clone the repository.
2. Create a `config.js` file in the root directory (you can copy `config.example.js`).
3. Add your [Last.fm API key](https://www.last.fm/api/account/create) and username to `config.js`.
4. Open `index.html` in your browser.

## Deployment
This project is configured to deploy to GitHub Pages via GitHub Actions.

### GitHub Secrets
To make the Last.fm widget work in production, you must add the following [Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) to your repository:
- `LASTFM_API_KEY`: Your Last.fm API key.
- `LASTFM_USER`: Your Last.fm username.

The `deploy.yml` workflow will automatically generate the `config.js` file during the build process.

## Technologies
- HTML5 / CSS3 (Vanilla)
- JavaScript (Vanilla)
- Last.fm API
- GitHub Contributions API

## License
© 2026 Anirudh Sahu (aspartic). Built with love, LLMs and Coffee.
