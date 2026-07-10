# Product Requirements Document
## 產品需求規格

## 1. 使用者角色

### Super Admin
- 管理帳號與權限
- 修改所有 SOP
- 修改 AI Prompt
- 查看所有案件與系統紀錄

### Marketing Manager
- 建立、修改與發布審核標準
- 查看所有案件
- 核准或退回
- 修改 AI 建議
- 管理品牌與建案資料

### Reviewer
- 執行人工複審
- 留言、標註問題
- 變更審核狀態
- 不可刪除已發布 SOP

### Editor
- 建立案件
- 上傳檔案
- 查看自己的審核結果
- 重新提交修正版

### Viewer
- 只讀 SOP 與已核准資料

## 2. 主要模組

### Dashboard
顯示：
- 本週待審數量
- 已退回數量
- 平均分數
- 常見錯誤 TOP 10
- 各內容類型案件數
- SOP 最近更新
- 我的待辦

### Review Center
建立案件時必填：
- 案件名稱
- 專案／建案
- 品牌
- 內容類型
- 發布平台或輸出媒體
- 目標受眾
- 目的
- 預計發布日
- 文字內容
- 附件
- 備註
- 使用的審核標準版本

### SOP Center
- 建立標準
- 分類
- 權重
- 必須通過項目
- 禁用詞
- 建議詞
- 範例
- 版本發布
- 草稿與生效日期
- 變更紀錄

### Knowledge Center
- 公司品牌資料
- 建案資料
- 客群資料
- 過往案例
- 法務提醒
- 平台規格
- AIO 寫作規範

### Review Result
每次審核輸出：
- 總分
- 是否可發布
- 必改項目
- 建議修改
- 風險警示
- 分項評分
- 原文與建議版本
- 圖像問題
- 影片問題
- 來源／事實待確認
- 人工審核意見
- 修改前後差異

## 3. 案件狀態

DRAFT  
SUBMITTED  
AI_REVIEWED  
HUMAN_REVIEWING  
REVISION_REQUIRED  
RESUBMITTED  
APPROVED  
PUBLISHED  
ARCHIVED

## 4. 驗收條件

- 未登入不得存取任何內頁。
- 不同角色只能看到允許的功能。
- 上傳檔案後可以建立審核。
- 每次審核記錄 SOP 版本。
- 修改 SOP 不影響舊案件的歷史結果。
- AI 失敗時須顯示錯誤，不可假裝已完成。
- 所有管理操作須有 Audit Log。
