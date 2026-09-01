---
name: Expo Go native compatibility
description: Native modules outside Expo Go's bundled runtime can crash before the app renders.
---

Keep the Expo Go root import graph limited to Expo Go-supported modules and built-in React Native APIs. A third-party native package can work in web previews and still make Expo Go show its generic project error before the app's own error boundary renders.

**Why:** Expo Go does not contain every native module available to a development build. In this workspace, a keyboard-controller provider was enough to make Android Expo Go fail while web and static Android bundling still succeeded.

**How to apply:** When Android or iOS Expo Go fails before rendering but web works, inspect root-level native imports first. Replace optional third-party providers with built-in compatibility wrappers, then verify with a platform-specific bundle request and `expo export`.