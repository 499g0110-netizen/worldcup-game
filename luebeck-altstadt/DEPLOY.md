# 上架 Netlify

1. 解壓縮 `luebeck-netlify.zip`，會得到一個資料夾（裡面有 index.html、js、data、assets、netlify.toml）。
2. 打開 https://app.netlify.com/drop ，把整個資料夾拖進網頁。
3. 等上傳完成（約 24 MB），Netlify 會給一個網址，例如 `xxxx.netlify.app`，可以在 Site settings 改名或綁自己的網域。

注意：
- 網站是純靜態檔案，不需要任何 build 指令。
- three.js 從 unpkg.com 載入、字型從 Google Fonts 載入，所以瀏覽者需要連網。
- 資料來源：© OpenStreetMap contributors（ODbL）；材質：Poly Haven（CC0）；人物動畫授權見 assets/models/LICENSES.md。
