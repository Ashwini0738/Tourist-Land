---
name: Expo preview host
description: Expo mobile previews require the dedicated Expo development domain rather than the shared Replit development domain.
---

Set `REACT_NATIVE_PACKAGER_HOSTNAME` to `REPLIT_EXPO_DEV_DOMAIN` for managed Expo previews. Keep `EXPO_PUBLIC_DOMAIN` on `REPLIT_DEV_DOMAIN` for API requests.

**Why:** The Android simulator received `Failed to download remote update` when Metro advertised the shared `.pike.replit.dev` host; the dedicated `.expo.pike.replit.dev` host returned the packager status successfully.

**How to apply:** When configuring an Expo artifact workflow, avoid ngrok tunnel mode and advertise the Expo-specific host while preserving the API domain separately.