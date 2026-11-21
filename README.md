# MPB — Master Planner Board

A Persian RTL personal study and life planner.

## Run locally
Open `index.html` through a local web server (for example VS Code Live Server). Service workers require HTTPS or localhost.

## Deploy with GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then Save.
4. GitHub Pages will publish the site automatically.

The app is a PWA. Once served over HTTPS, use your browser's **Install app** option. The service worker caches the app shell and supports offline use after the first successful load.

## Data
Planner data is stored locally in the browser. Use the in-app JSON backup/export feature regularly; browser data is not automatically synced between devices.
