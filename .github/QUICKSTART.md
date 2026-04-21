# 🚀 Quick Start: CI/CD

## Bước 1: Xem Workflows đã tạo

```
.github/workflows/
├── ci.yml                 # Main CI (backend + frontend)
├── backend-tests.yml      # Backend testing
└── frontend-build.yml     # Frontend build
```

## Bước 2: Commit & Push

```bash
git add .github/
git commit -m "Add CI/CD workflows"
git push origin develop
```

## Bước 3: Xem CI chạy

- Truy cập: https://github.com/YOUR_USER/QLDA/actions
- Hoặc: Tab **Actions** trên GitHub

## Bước 4: Kiểm tra Results

✅ **Green**: Tất cả tests pass  
❌ **Red**: Có test fail - xem logs

---

## Workflow Triggers

### Backend Tests chạy khi:
- Push thay đổi `backend/`, `tests/`, `requirements.txt`
- PR có thay đổi backend

### Frontend Build chạy khi:
- Push thay đổi `frontend/`
- PR có thay đổi frontend

### CI (Both) chạy:
- Mọi push & PR đến `main`, `develop`

---

## Xem Logs

**GitHub UI:**
1. Actions tab → Select workflow run
2. Click job name → Xem logs

**CLI (nếu có gh):**
```bash
gh run list
gh run view <run-id> --log
```

---

## Tắt/Tạm dừng Workflows

**Disable workflow:**
1. Settings → Actions → General
2. Workflow permissions → Chọn option

**Disable specific workflow:**
- Actions tab → Click workflow → Disable

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Workflow not running | Check branch filter, push to main/develop |
| Test failed | Run locally: `pytest tests/` |
| Build failed | Check Node version, run `npm install` |
| No dependencies | Check `pip install -r requirements.txt` |

---

Xem `CI_CD_SETUP_GUIDE.md` để biết chi tiết hơn!
