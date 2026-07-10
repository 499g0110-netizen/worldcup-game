# 資料庫與後台規格

## 主要資料表

### profiles
id, name, email, role, department, active

### brands
id, name, description, voice, prohibited_claims, status

### projects
id, brand_id, name, type, facts_json, contacts_json, status

### standards
id, code, title, category, content_type, platform, description, severity, weight, required, status

### standard_versions
id, standard_id, version, content_json, effective_at, created_by

### review_cases
id, title, project_id, content_type, platform, objective, audience, copy_text, status, created_by

### review_files
id, case_id, filename, mime_type, storage_path, metadata_json

### review_runs
id, case_id, standard_snapshot_json, model_provider, model_name, prompt_version, result_json, created_at

### human_reviews
id, case_id, reviewer_id, decision, comments, score, created_at

### revisions
id, case_id, revision_number, copy_text, file_snapshot_json, created_by

### audit_logs
id, actor_id, action, entity_type, entity_id, before_json, after_json, created_at

## 後台功能

1. 標準分類管理
2. 規則新增、停用、複製
3. 權重調整
4. 版本發布
5. 品牌資料管理
6. 建案事實資料管理
7. 禁用詞與敏感主張
8. Prompt 版本管理
9. 帳號與權限
10. Audit Log

## SOP 版本原則

- 已發布版本不可直接覆寫。
- 修改時建立新版本。
- 每個審核結果保存當下 Snapshot。
- 可設定生效日。
- 可回復舊版本，但需產生新版本號。
