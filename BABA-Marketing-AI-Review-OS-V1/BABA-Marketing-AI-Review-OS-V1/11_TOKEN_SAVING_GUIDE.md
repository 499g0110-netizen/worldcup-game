# Claude Token 節省策略

1. 先把本規格包放進 GitHub repository。
2. 每次只要求一個 Phase。
3. 要 Claude 先讀檔，不要把所有內容重貼在聊天。
4. 每完成一階段提交 Git commit。
5. 新對話只提供：
   - repository
   - 當前 Phase
   - IMPLEMENTATION_LOG.md
   - 錯誤訊息
6. 不要反覆要求重寫整個專案。
7. 要求 Claude 修改最少必要檔案。
8. 每次完成後執行 build，避免錯誤累積。
9. 3D 動畫最後做，先把功能跑通。
10. 影片處理最耗資源，V1 先限制長度。
