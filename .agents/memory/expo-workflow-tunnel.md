---
name: Expo workflow tunnel failures
description: Expo Go workflow verification can be blocked by an external ngrok tunnel failure even when Metro and static bundles are healthy.
---

The Expo Go workflow may fail before serving the app when the tunnel provider returns a malformed health response. Treat this separately from Metro or application bundle failures; a successful static Android/iOS build still verifies the JavaScript bundle.

**Why:** A restart of the managed Expo workflow produced an ngrok `Cannot read properties of undefined (reading 'body')` error while the same app built successfully through local Metro.

**How to apply:** Check workflow logs first. If the error is from ngrok rather than Metro, avoid repeated restart loops and report that live Expo Go verification is pending tunnel recovery.