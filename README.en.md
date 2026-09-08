# Bilibili Blocker

[简体中文](./README.md) | [繁體中文](./README.zh_TW.md)

Block low-quality or unwanted content by account UID, with subscribed rules and custom blacklists and whitelists.

## Installation

- [Install for Chrome](https://chromewebstore.google.com/detail/bilibili-blocker/egfeldkfhdbjcmpjbipdaafnopgpglje)
- [Install for Firefox](https://addons.mozilla.org/zh-CN/firefox/addon/bilibili-blocker/)
- [Join the Telegram group](https://t.me/bilibili_blocker)

## Screenshots

<p>
	<a href='./screenshots/1-home.png' target='_blank'><img src='./screenshots/1-home.png' alt='home' width='200' /></a>
	<a href='./screenshots/2-video.png' target='_blank'><img src='./screenshots/2-video.png' alt='video' width='200' /></a>
	<a href='./screenshots/3-search.png' target='_blank'><img src='./screenshots/3-search.png' alt='search' width='200' /></a>
	<a href='./screenshots/4-popup.png' target='_blank'><img src='./screenshots/4-popup.png' alt='popup' width='200' /></a>
</p>

## Features

- **Precise UID-based blocking**: Identify content by account UID without the false positives caused by keyword matching.
- **Subscribed community rules**: Enable the rule categories you need and refresh the rule lists with one click.
- **Custom blacklist**: Block unwanted accounts directly from their profile pages, including accounts not covered by subscribed rules.
- **Custom whitelist**: Allow accounts matched by subscribed rules; whitelist entries take priority over subscribed rules.
- **Local management**: Blacklists and whitelists are stored only in the browser and do not modify Bilibili's official block list.
- **Dynamic content support**: Automatically process content loaded after the initial page load.

## Blocking Rules

- [aislop](./rules/aislop.txt) - Low-quality AI-generated videos
- [aivoice](./rules/aivoice.txt) - AI voice content
- [clickbait](./rules/clickbait.txt) - Clickbait titles and thumbnails
- [copycat](./rules/copycat.txt) - Unauthorized reposts and clips
- [fakenews](./rules/fakenews.txt) - Fake news and conspiracy theories
- [finance](./rules/finance.txt) - Financial advice and scam risks
- [spam](./rules/spam.txt) - Spam content
- [superstition](./rules/superstition.txt) - Superstition and religion
- [troll](./rules/troll.txt) - Provocative and antagonistic content

## FAQ

### Why not use Bilibili's built-in block list?

- **Capacity limits**: Bilibili's official block list has a limited capacity, which is not enough to block large categories of unwanted accounts.
- **Account safety**: Adding many accounts to Bilibili's official list in a short period may trigger abuse detection. Bilibili Blocker only filters content locally and does not send block requests to Bilibili.

### Why not block by keywords?

- **False positives**: Legitimate educational content may contain words such as “AI” or “finance”.
- **Performance**: Keyword matching requires scanning video titles, while UID matching provides direct account-level filtering.
- **Maintainability**: UID lists are easier to review and maintain than large keyword lists.
