# Development Guide - Ebook Admin

## 🚀 Quick Start

```bash
# Normal development
npm run dev

# If experiencing chunk loading issues  
npm run dev:clean
```

## 🔧 Troubleshooting Chunk Loading Issues

### Common Symptoms:
- `Uncaught SyntaxError: Invalid or unexpected token`
- `ChunkLoadError: Loading chunk app/layout failed`
- Hydration errors after restarting dev server
- Trang bị đứng ở "Đang chuyển hướng..."

### Quick Fix Options:

#### Option 1: Use the Clean Script
```bash
npm run dev:clean
```

#### Option 2: Use PowerShell Fix Script (Windows)
```powershell
.\dev-fix.ps1
```

#### Option 3: Manual Steps
```bash
# Stop dev server (Ctrl+C)
# Clear cache
Remove-Item -Recurse -Force .next
npm cache clean --force
# Restart
npm run dev
```

### Browser Steps:
1. **Hard Refresh**: `Ctrl + Shift + R` (Windows) hoặc `Cmd + Shift + R` (Mac)
2. **Clear Browser Cache**: F12 → Application → Storage → Clear storage
3. **Try Incognito**: Mở tab ẩn danh để test

## 🎯 Best Practices

### To Avoid Issues:
1. **Always hard refresh** after restarting dev server
2. **Use incognito mode** when developing
3. **Disable cache** in DevTools during development:
   - F12 → Network tab → Check "Disable cache"

### Development Workflow:
1. Stop dev server: `Ctrl + C`
2. Start with clean cache: `npm run dev:clean`
3. Wait for compilation to complete
4. Hard refresh browser: `Ctrl + Shift + R`

### Configuration Added:
- Enhanced webpack config for stable chunk loading
- Better hot reload reliability
- Improved cache busting in development

## 🐛 Still Having Issues?

1. **Clear everything**:
   ```bash
   npm run dev:clean
   npm cache clean --force
   ```

2. **Use different browser/incognito**

3. **Check console for specific errors**

4. **Restart PowerShell/Terminal**

## 💡 Why This Happens?

- Next.js dev server webpack chunk naming conflicts
- Browser cache conflicts with hot reload
- Development vs production build differences
- React StrictMode double-rendering in development

## 🔗 Additional Resources

- [Next.js Development Documentation](https://nextjs.org/docs/getting-started)
- [Webpack Dev Server Issues](https://webpack.js.org/configuration/dev-server/) 