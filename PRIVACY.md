# Privacy Policy

**Effective Date:** 2026-08-29

## Overview

Bilibili Blocker is a browser extension that enhances the browsing experience on [bilibili.com](https://www.bilibili.com) by blocking clickbait and AI-generated content. This privacy policy outlines how the extension handles user data and ensures user privacy.

We take your privacy seriously. This policy explains what data the extension handles and how.

## Data Collection

**This extension does NOT collect, store, or transmit any personal data.**

- No user credentials, browsing history, or personal information is ever accessed.
- No analytics, telemetry, or tracking mechanisms are included.
- No cookies, local storage, or persistent storage is used.
- No data is sent to the developer or any third-party analytics service.

## Network Requests

The extension makes the following network requests solely to provide its functionality:

| Endpoint                                           | Purpose                                                                   | Data Sent |
| -------------------------------------------------- | ------------------------------------------------------------------------- | --------- |
| `https://bilibili-blocker.netlify.app/rules/*.txt` | Fetches the latest blocking rules for clickbait and AI-generated content. | None      |

These requests are made only when you visit `www.bilibili.com` and are necessary to apply the blocking rules. No user-identifiable data is included in any request.

## Permissions

The extension requires the following permissions:

- **Host permission (`https://bilibili-blocker.netlify.app/rules/*.txt`)**: Required to fetch the latest blocking rules for clickbait and AI-generated content.
- **Access to `www.bilibili.com`**: Required to apply the blocking rules on the Bilibili website.

## Data Sharing

No data is shared with any third party. The developer does not receive or have access to any user data.

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/guoyunhe/bilibili-blocker).
