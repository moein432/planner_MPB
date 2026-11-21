# MPB — Master Planner Board

A Persian RTL personal study and life planner.

## Run locally
Open `index.html` through a local web server (for example VS Code Live Server). Service workers require HTTPS or localhost.

## Deploy with GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Save the setting. The workflow in `.github/workflows/deploy-pages.yml` will publish the site on the next push to `main`.

The app is a PWA. Once served over HTTPS, use your browser's **Install app** option. The service worker caches the app shell and supports offline use after the first successful load.

## Data
Planner data is stored locally in the browser. Use the in-app JSON backup/export feature regularly; browser data is not automatically synced between devices.
