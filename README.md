# Random Notifier (iPhone PWA)

Pick a logo, title, message, and sound. Choose how many notifications and over what period — they fire at **random** times, not evenly spaced.

## Deploy on GitHub Pages
1. Create a new GitHub repo and upload every file in this folder (`index.html`, `app.js`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png`).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/root` → **Save**.
3. Wait ~1 min. Your app is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

> HTTPS is required for notifications. GitHub Pages provides it automatically.

## Use on iPhone (required for real notifications)
1. Open the Pages URL in **Safari** (iOS 16.4+).
2. Tap **Share → Add to Home Screen**.
3. Open the app **from the Home Screen icon** (not from Safari).
4. Tap **Enable & Start** and allow notifications.

## Important limitation
GitHub Pages only serves static files — there is no server to run Apple's push service. So notifications are **scheduled on-device** and fire while the app is open or recently backgrounded. iOS will not deliver them if the app has been fully closed/killed for a long time. For push-while-fully-closed you'd need a backend (APNs or Web Push server), which GitHub Pages can't host.

Custom sounds play when the app is in the foreground; iOS uses its default notification sound otherwise.
