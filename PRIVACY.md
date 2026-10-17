# Privacy Policy

**Effective Date:** 2026-08-29

## Overview

Bilibili Blocker is a browser extension that enhances the browsing experience on [bilibili.com](https://www.bilibili.com) by blocking clickbait and AI-generated content. This privacy policy outlines how the extension handles user data and ensures user privacy.

We take your privacy seriously. This policy explains what data the extension handles and how.

## Data Collection

**This extension does not collect account credentials, browsing history, or analytics data.**

- No analytics, telemetry, or tracking mechanisms are included.
- Custom blocklists, whitelists, and cached rules are stored locally in your browser.
- When you view a Bilibili profile, its public account UID is sent to the Bilibili Blocker service to retrieve its community flags.

## Network Requests

The extension makes the following network requests solely to provide its functionality:

| Endpoint                                                   | Purpose                                                                   | Data Sent                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `https://bilibili-blocker.guoyunhe.me/uploads/rules/*.txt` | Fetches the latest blocking rules for clickbait and AI-generated content. | None                                        |
| `https://bilibili-blocker.guoyunhe.me/api/accounts/{uid}`  | Fetches community flags for the Bilibili account whose profile you view.  | The public Bilibili account UID in the URL. |

Rule requests are made when the extension loads or refreshes blocking rules. Account flag requests are made when you view a Bilibili profile. The account UID identifies the public profile being viewed; the extension does not send your Bilibili credentials or browsing history. The flagging page is opened only when you click its link.

## Permissions

The extension requires the following permissions:

- **Host permission (`https://bilibili-blocker.guoyunhe.me/*`)**: Required to fetch blocking rules and account flags from the service.
- **Access to `www.bilibili.com`**: Required to apply the blocking rules on the Bilibili website.

## Data Sharing

The public account UID is sent to the Bilibili Blocker service only to retrieve flags for the profile you are viewing. The extension does not send your Bilibili credentials or browsing history, and does not use third-party analytics.

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/guoyunhe/bilibili-blocker).
