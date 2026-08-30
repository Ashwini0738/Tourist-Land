---
name: Native location verification
description: Evidence needed before treating the location flow as verified on physical devices.
---

The web preview and mocked Expo tests can verify JavaScript routing and recovery copy, but not native location prompts, device Settings handoff, GPS-disabled behavior, or platform map-app launch. Physical iOS and Android checks are required for those outcomes.

**Why:** Native permission and URL-scheme behavior belongs to the operating system and can differ from a successful JavaScript mock or browser preview.

**How to apply:** Record the platform, OS/app build, permission state, GPS state, lookup result, whether the atlas centers once, and whether directions open the platform map app or show the fallback URL.