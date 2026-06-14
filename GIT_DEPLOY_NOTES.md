# GitHub / Vercel 上傳注意事項

本版本已加入 `.gitignore`，正常使用 `git add .` 時會自動忽略：

- `node_modules/`
- `dist/`
- `.vercel/`
- `.env`

如果你之前已經把 `node_modules` 上傳到 GitHub，請在專案根目錄執行：

```powershell
git rm -r --cached node_modules
git rm -r --cached dist
git add .gitignore
git commit -m "remove node_modules and dist from git"
git push
```

之後正常更新：

```powershell
git add .
git commit -m "update game"
git push
```

Vercel 設定：

- Framework Preset: Vite
- Install Command: npm install
- Build Command: npm run build
- Output Directory: dist
