# Personal Dashboard

A dependency-free web dashboard for a daily personal briefing. It is designed to run on GitHub Pages and refresh its data with GitHub Actions.

## Sections

- Top news
- U.S. Army and military news
- USMA and West Point updates
- Army West Point sports
- Pittsburgh Steelers
- Market watchlist
- Country music

## Local Preview

Run a static server from this folder:

```powershell
node server.mjs
```

Then open `http://localhost:8080`.

## Refresh Data

Run this command when network access is available:

```powershell
node scripts/fetch-feeds.mjs
```

## Customize

Edit `data/sources.json` to change topics, RSS feeds, or stock symbols.

## GitHub Pages Setup

1. Push this folder to a GitHub repository.
2. In GitHub, open the repository settings.
3. Go to Pages.
4. Set the source to deploy from the main branch root, or use GitHub Actions if you prefer.
5. Open the Actions tab and run "Refresh dashboard data" once.
