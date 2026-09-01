---
name: Expo workflow tunnel failures
description: Expo Go workflow verification can be blocked by an external ngrok tunnel failure even when Metro and static bundles are healthy.
---

The Expo Go workflow may fail before serving the app when the tunnel provider returns a malformed health response. For Replit mobile artifacts, the managed Expo-domain router can serve the localhost Metro process directly, so tunnel mode should remain optional rather than mandatory. Treat tunnel failures separately from Metro or application bundle failures.

**Why:** A restart of the managed Expo workflow produced an ngrok `Cannot read properties of undefined (reading 'body')` error while the same app built successfully through local Metro.

**How to apply:** Check workflow logs first. If the error is from ngrok rather than Metro, use the artifact's managed localhost routing for normal preview verification; reserve `--tunnel` for networks that specifically block direct phone-to-preview connections.