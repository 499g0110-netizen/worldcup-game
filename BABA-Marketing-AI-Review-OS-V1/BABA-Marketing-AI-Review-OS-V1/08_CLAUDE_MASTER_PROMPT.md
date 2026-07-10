# 給 Claude Code 的主 Prompt

你現在是本專案的資深產品工程師、AI 架構師與前端動畫工程師。

請先完整閱讀本 repository 內：
- 00_README.md
- 01_PRODUCT_REQUIREMENTS.md
- 02_REVIEW_TAXONOMY.md
- 03_STANDARD_WORKFLOWS.md
- 04_AI_REVIEW_ENGINE.md
- 05_DATABASE_AND_ADMIN.md
- 06_UI_UX_3D.md
- 07_SECURITY_AND_DEPLOYMENT.md

你的任務不是一次完成全部功能，而是依照下列階段建置，且每一階段都必須：
1. 先列出要修改的檔案。
2. 執行實作。
3. 執行 lint、typecheck、test、build。
4. 修正錯誤。
5. 更新 IMPLEMENTATION_LOG.md。
6. 不得刪除尚未理解的既有內容。
7. 不得自行創造公司事實。

技術固定：
- Next.js
- TypeScript strict
- Tailwind
- shadcn/ui
- Supabase Auth/Postgres/Storage
- React Three Fiber + GSAP
- Zod
- 可替換 AI Provider Adapter

第一階段只做：
- 專案骨架
- 登入
- 權限 middleware
- Dashboard shell
- Supabase schema
- seed 範例
- README 安裝指令

完成後停止，提供：
- 已完成內容
- 驗證方式
- 尚未完成內容
- 下一階段精確 Prompt

禁止：
- 一開始做所有頁面
- 以 mock login 取代真正登入
- 把密鑰寫入 repo
- 為了動畫犧牲可用性
- 讓 AI 自動最終核准案件
