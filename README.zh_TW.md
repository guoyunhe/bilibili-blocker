# Bilibili Blocker

[简体中文](./README.md) | [English](./README.en.md)

依帳號 UID 封鎖低品質或不感興趣的內容，支援訂閱規則和自訂黑名單、白名單。

## 下載安裝

- [下載 Chrome 擴充功能](https://chromewebstore.google.com/detail/bilibili-blocker/egfeldkfhdbjcmpjbipdaafnopgpglje)
- [下載 Firefox 擴充功能](https://addons.mozilla.org/zh-CN/firefox/addon/bilibili-blocker/)
- [加入 Telegram 群組](https://t.me/bilibili_blocker)

## 螢幕截圖

<p>
	<a href='./screenshots/1-home.png' target='_blank'><img src='./screenshots/1-home.png' alt='home' width='200' /></a>
	<a href='./screenshots/2-video.png' target='_blank'><img src='./screenshots/2-video.png' alt='video' width='200' /></a>
	<a href='./screenshots/3-search.png' target='_blank'><img src='./screenshots/3-search.png' alt='search' width='200' /></a>
	<a href='./screenshots/4-popup.png' target='_blank'><img src='./screenshots/4-popup.png' alt='popup' width='200' /></a>
</p>

## 功能特色

- **依 UID 精準封鎖**：根據帳號 UID 識別內容來源，避免關鍵字比對造成誤傷。
- **訂閱社群規則**：依需求啟用不同類型的封鎖規則，並可一鍵重新整理規則清單。
- **自訂黑名單**：直接在使用者空間頁封鎖不感興趣的帳號，也能單獨管理規則未涵蓋的帳號。
- **自訂白名單**：放行符合訂閱規則的帳號，白名單優先於訂閱規則。
- **本機管理**：黑名單和白名單僅儲存在瀏覽器本機，不會修改 Bilibili 官方黑名單。
- **支援動態內容**：自動處理頁面載入後出現的新內容。

## 封鎖規則

- [aislop](./rules/aislop.txt) - 低品質 AI 生成影片
- [aivoice](./rules/aivoice.txt) - AI 配音內容
- [clickbait](./rules/clickbait.txt) - 標題黨與誇張縮圖
- [copycat](./rules/copycat.txt) - 未授權搬運與剪輯
- [fakenews](./rules/fakenews.txt) - 假新聞與陰謀論
- [finance](./rules/finance.txt) - 投資理財與詐騙風險
- [spam](./rules/spam.txt) - 垃圾內容
- [superstition](./rules/superstition.txt) - 迷信與宗教
- [troll](./rules/troll.txt) - 對立與引戰內容

## 常見問題

### 為什麼不使用 Bilibili 內建的黑名單？

- **容量限制**：Bilibili 官方黑名單容量有限，無法滿足大量封鎖特定類型帳號的需求。
- **帳號安全**：短時間內大量加入官方黑名單可能觸發濫用偵測，而 Bilibili Blocker 只在本機過濾內容，不會向 Bilibili 發送封鎖請求。

### 為什麼不使用關鍵字封鎖？

- **誤傷率高**：正常的科普內容也可能包含「AI」或「投資理財」等詞彙。
- **效能問題**：關鍵字比對需要掃描影片標題，而 UID 比對可以直接依帳號過濾。
- **維護性較佳**：UID 清單比大量關鍵字更容易檢查與維護。
