---
name: Expo Go native compatibility
description: Native modules outside Expo Go's bundled runtime can crash before the app renders.
---

Keep the Expo Go root import graph limited to Expo Go-supported modules and built-in React Native APIs. A third-party native package can work in web previews and still make Expo Go show its generic project error before the app's own error boundary renders.

**Why:** Expo Go does not contain every native module available to a development build. In this workspace, a keyboard-controller provider was enough to make Android Expo Go fail while web and static Android bundling still succeeded.

**How to apply:** When Android or iOS Expo Go fails before rendering but web works, inspect root-level native imports first. Replace optional third-party providers with built-in compatibility wrappers, then verify with a platform-specific bundle request and `expo export`.

For physical-device previews, do not force Expo CLI to advertise the Replit `.expo.pike.replit.dev` proxy when iOS reports an invalid certificate. Clear that proxy override and use Expo tunnel mode so the QR points to a publicly trusted `exp.direct` host.

**Why:** The Replit proxy certificate can be valid from the workspace/container while still being rejected by iOS's trust store.

**How to apply:** Validate both the tunnel manifest and its platform-specific launch asset over HTTPS, then have the user scan the newly generated tunnel QR instead of reopening a cached QR project.