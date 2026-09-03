# Bilibili Blocker

按 UP 主用户 ID 屏蔽 B 站上的低质内容

## 下载安装

- [下载 Chrome 插件](https://chromewebstore.google.com/detail/bilibili-blocker/egfeldkfhdbjcmpjbipdaafnopgpglje)
- [下载 Firefox 插件](https://addons.mozilla.org/zh-CN/firefox/addon/bilibili-blocker/)

## 屏幕截图

![home](./screenshots/1-home.png)

![video](./screenshots/2-video.png)

![search](./screenshots/3-search.png)

![popup](./screenshots/4-popup.jpg)

## 屏蔽规则

根据 UP 主的用户 ID 黑名单，屏蔽该 UP 主的所有视频。

- [aislop](./rules/aislop.txt) - AI 泔水（低质量的 AI 生成视频）
- [aivoice](./rules/aivoice.txt) - AI 配音
- [clickbait](./rules/clickbait.txt) - 标题党（用夸张标题或封面骗点击）
- [clipping](./rules/clipping.txt) - 切片（未授权）
- [copycat](./rules/copycat.txt) - 搬运（未授权）
- [fakenews](./rules/fakenews.txt) - 假新闻/阴谋论
- [finance](./rules/finance.txt) - 投资理财（不负责任地诱导投资理财或卖课）
- [religion](./rules/religion.txt) - 宗教（不含历史科普类）
- [superstition](./rules/superstition.txt) - 封建迷信、伪科学
- [troll](./rules/troll.txt) - 对立引战

## FAQ

### 为什么不用 B 站自带的拉黑名单功能？

- **容量限制**。普通用户的黑名单上限 500 个，Lv6 加倍至 1000 个，即使是大 UP 也有 5000 个的上限。而垃圾账号多达数百万，单凭黑名单屏蔽，无法满足屏蔽一类内容的需求。
- **违规风险**。短时间内大量添加黑名单可能会被 B 站判定为恶意行为，导致封号。而 Bilibili Blocker 只会在本地屏蔽，不会对 B 站服务器造成任何影响。

### 为什么不使用关键字屏蔽？

- **误伤率高**。比如一些正规的科普视频也可能含有一些“AI”或“理财”等关键字，如果使用关键字屏蔽，可能会误伤这些视频。
- **性能问题**。关键字屏蔽需要对每个视频的标题进行全文/正则匹配，时间复杂度 O(N)，而 Bilibili Blocker 只需要对 UP 主 ID 进行匹配，时间复杂度 O(1)。
- **可维护性差**。关键字屏蔽需要不断更新关键字列表，验证极其繁琐，而 Bilibili Blocker 只需要维护 UP 主 ID 黑名单即可。
