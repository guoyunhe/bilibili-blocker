# Changelog

## 0.10.0 - 2026-10-25

### Added

- Added the ability to block video publishers, with blacklist and whitelist management in the popup.
- Added user flags and scores to profile pages, and improved flag submission and blocked-status interactions.

### Improved

- Improved user-list loading, scrolling, and blocked-status updates.

## 0.9.0 - 2026-10-20

### Added

- Automatically hide video cards posted by deactivated accounts.

## 0.8.0 - 2026-10-18

### Changed

- Hide blocked creators' video cards instead of blurring them, including their outer feed cards.

### Fixed

- Treat missing account flags as empty data and keep fetch errors out of the profile page.

## 0.7.0 - 2026-10-17

### Added

- Show server-provided account flags and scores on user profile pages, with a link to submit a flag on the server.

## [0.6.0] - 2026-09-13

### Added

- Added the `sales.txt` rule for livestream sales, sponsored content, and promotions for products and courses.

### Rules

- Updated the `aislop.txt`, `clickbait.txt`, `copycat.txt`, and `finance.txt` rule lists.

## [0.5.0] - 2026-09-08

### Added

- Added settings to hide paid content cards, livestream cards, and recommendation carousels on the home page.

## [0.4.0] - 2026-09-07

### Added

- Added local custom blacklists and whitelists that store UIDs and usernames, with whitelist entries taking priority over subscribed rules.
- Added Blacklist and Whitelist tabs to the popup to view and remove custom entries.
- Added a block button and blocked-status indicator to Bilibili user profile pages.

## [0.3.0] - 2026-09-02

### Added

- Added the `copycat.txt` rule for unauthorized reposts and clips.
- Added the `fakenews.txt` rule for fake news.
- Added the `finance.txt` rule for irresponsible financial advice.
- Added the `superstition.txt` rule for superstition.

## [0.2.0] - 2026-09-01

### Added

- Added the `troll.txt` rule for antagonistic content.
- Added the `aivoice.txt` rule for AI-generated voice content.
- Added the `catfish.txt` rule for phishing content.
- Added rule ID counts to show the coverage of each rule.

## [0.1.0] - 2026-08-29

### Added

- Added the `clickbait.txt` rule for clickbait videos.
- Added the `aislop.txt` rule for low-quality AI-generated content.
