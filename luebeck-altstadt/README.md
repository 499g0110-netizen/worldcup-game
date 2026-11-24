# Lübeck Altstadt：可自由走動的 3D 呂貝克舊城

開放式的 3D 空間，沒有時間限制。用 Three.js 即時運算，不需要編譯，也不需要伺服器程式。

## 本機打開
因為頁面會讀取 `assets/aerial.jpg` 和 CDN 上的 Three.js，請用一個簡單的本機伺服器打開，不要直接雙擊：

```
npx serve .
```

## 上架到 Netlify（最簡單）
1. 登入 https://app.netlify.com/drop
2. 把整個 `luebeck-altstadt` 資料夾拖進網頁
3. 幾秒後會拿到一個公開網址

也可以放在 Cloudflare Pages、GitHub Pages 或 Vercel，都是靜態網站，設定一樣：發布目錄就是這個資料夾，沒有 build 指令。

## 操作
- W A S D／方向鍵：走路；按住 Shift：奔跑；空白鍵：跳
- 滑鼠拖曳：轉鏡頭；滾輪：拉近拉遠
- T：切換時間（清晨／正午／午後／黃昏／夜晚）
- V：第一／第三人稱
- M：大地圖
- 手機：左下搖桿走路，畫面其他地方滑動轉鏡頭
