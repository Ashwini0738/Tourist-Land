---
name: Playwright on Nix
description: Environment requirements for running real Chromium browser tests in this workspace
---

Headless Playwright Chromium requires explicit Nix runtime libraries, including GLib, GBM, udev, and the standard Chromium/X11 dependencies. The browser download is stored in the workspace cache and is not a source-controlled asset.

**Why:** The Playwright package can install successfully while Chromium still exits immediately when a shared library is absent.

**How to apply:** When adding or running browser tests, provision the required Nix packages in the workspace environment and install the Playwright browser during environment setup rather than committing browser binaries.