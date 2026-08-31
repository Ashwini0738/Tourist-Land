---
name: Mobile-web visual checks
description: The boundary between mobile-web visual regression coverage and native-device smoke coverage.
---

Mobile-web regression coverage should use React Native Testing Library structure and spacing contracts at representative narrow and wide web frames, while native prompts, biometrics, GPS, and external map launching remain outside this layer.

**Why:** Browser previews cannot prove native-device behavior, and full pixel snapshots are brittle for a cross-platform Expo tree. Stable semantic structure and responsive web spacing catch hierarchy regressions without fabricating catalog records.

**How to apply:** When adding mobile-web screen coverage, render through a web `SafeAreaProvider` frame, assert root landmarks and state containers, and use real static catalog fixtures only where the screen already owns them.