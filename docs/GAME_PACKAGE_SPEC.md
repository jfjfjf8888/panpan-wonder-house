# 游戏包规范

详见根目录 `AGENT.txt` 第五部分与补充规范。

关键要求：

* 文件名：`game-{slug}-v{version}.zip`
* ZIP 根目录直接包含 `manifest.json`、`index.html`、`cover.webp`
* 禁止外部 CDN、eval、路径穿越、加密 ZIP
* 更新时 `id`/`slug` 必须与原游戏一致，且版本号更高
