# 安全與部署

## 登入

- Supabase Auth Email/Password
- 可選邀請制
- 停用公開註冊
- 密碼至少 12 字元
- 可加 MFA
- Session 過期
- 權限由伺服器驗證，不只前端隱藏

## 資料安全

- Storage Bucket 設為 Private
- 下載使用 Signed URL
- Row Level Security
- API Key 僅放 Server Environment
- 禁止把 Service Role Key 放前端
- 上傳檔案掃描類型與大小
- 限制可接受格式
- 敏感資料刪除政策
- 日誌不可記錄完整密碼、Token、個資

## 檔案建議限制

- 圖片：JPG/PNG/WebP，單檔 20MB
- PDF：50MB
- 影片：MP4/MOV，V1 建議 500MB 上限
- 影片分析採非同步工作，但 UI 必須顯示狀態
- 若無背景工作系統，V1 先限制影片長度 5 分鐘

## 部署

- GitHub Private Repository
- Vercel
- Supabase
- Preview 與 Production 分離
- 環境變數分離
- 自動備份
- 上線前建立管理員帳號
