---
name: EAS Android build dependencies
description: Cloud Android build requirements for this pnpm workspace and Expo app.
---

EAS Android builders use a newer pnpm than the local development environment and enforce dependency build-script approvals. They also require Babel presets imported by app config to be declared directly by the app package.

**Why:** The first cloud build failed during dependency installation because pnpm 11 rejected unapproved postinstall scripts; after that was fixed, Gradle bundling failed because `babel-preset-expo` was only available transitively.

**How to apply:** Keep approved native/build-script packages in the workspace `allowBuilds` configuration, and keep `babel-preset-expo` explicitly listed in the Expo app’s devDependencies whenever `babel.config.js` imports it.