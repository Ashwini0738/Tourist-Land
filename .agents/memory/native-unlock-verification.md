---
name: Native unlock verification
description: What evidence is required before treating device authentication as verified.
---

Native device unlock is confirmed only by successful checks on physical iOS and Android devices. Mocked `expo-local-authentication` tests verify JavaScript routing and state transitions, but not native prompt availability, cancellation semantics, or device-passcode fallback.

**Why:** Expo web previews cannot display the native prompt, and a passing mock can reproduce the intended result without exercising the operating system. A prior physical check reported failures without identifying the checkpoint or native error, leaving the behavior unresolved.

**How to apply:** Record the platform, OS/build version, failing checkpoint, authentication result/error code, and relevant native/app logs. Do not close a physical-device verification task until success, cancellation, retry, passcode fallback, and destination routing pass on both platforms.