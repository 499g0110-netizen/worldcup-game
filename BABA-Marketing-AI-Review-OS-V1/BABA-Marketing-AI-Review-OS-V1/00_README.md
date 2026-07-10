# BABA Marketing AI Review OS V1
## 巴巴事業行銷企劃部 AI 審核與 SOP 中央系統

版本：V1.0 草案  
用途：交給 Claude Code、Codex、Cursor 或其他程式 Agent 建置  
核心目標：建立一個需登入、可上傳圖文與影片、可依公司標準自動審核、可由後台維護 SOP 與審核規則的企業內部網站。

---

## 一、V1 必須先完成的核心功能

1. 帳號密碼登入
2. 角色權限：主管、審核者、編輯者、唯讀
3. SOP 與審核標準後台
4. 上傳文字、圖片、PDF、影片
5. 選擇內容類型與平台
6. AI 自動審核
7. 問題標記、分數、修改建議
8. 審核歷程與版本紀錄
9. 可搜尋與篩選審核紀錄
10. 3D 粒子首頁與精緻動態介面

## 二、V1 不先做的功能

- 不先做全公司 ERP
- 不先串接所有社群 API
- 不先自動發布貼文
- 不先做完整專案管理
- 不先做複雜 BI
- 不先做自動影片剪輯
- 不先做多公司 SaaS

## 三、系統定位

本系統不是單純「AI 幫我看稿」，而是：

> 將巴巴事業行銷企劃部的專業判斷、品牌規範、製作標準與歷史修正經驗，轉換為可維護、可追溯、可持續更新的審核引擎。

## 四、建議技術

- 前端：Next.js 15+、TypeScript、Tailwind CSS
- UI：shadcn/ui
- 動畫：Three.js、React Three Fiber、GSAP
- 粒子：Three.js Points / Shader
- 後端：Next.js Server Actions / Route Handlers
- 資料庫：Supabase PostgreSQL
- 登入：Supabase Auth
- 檔案：Supabase Storage
- AI：先保留 Provider Adapter，可接 OpenAI、Anthropic
- 部署：Vercel + Supabase

## 五、建置順序

1. 建立專案與資料庫
2. 完成登入與權限
3. 完成 SOP 後台
4. 完成審核案件建立
5. 完成檔案上傳
6. 完成 AI 審核 API
7. 完成審核結果頁
8. 完成歷史紀錄
9. 加入 3D 首頁
10. 安全與部署驗收

## 六、重要原則

- 任何 AI 結果都不是最終核准。
- 涉及價格、法規、建案數據、日期、工程進度、獎項、媒體數據，必須標示來源與人工確認。
- SOP 修改必須留下版本。
- 審核結果必須記錄當時使用的 SOP 版本。
- 內部資料不得直接暴露在前端程式碼。
