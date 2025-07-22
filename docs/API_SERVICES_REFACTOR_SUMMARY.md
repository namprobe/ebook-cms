# 🔧 API Services Refactor & Hooks Structure Unification

## Tổng quan

Đã hoàn thiện việc **refactor toàn bộ API services** và **thống nhất cấu trúc hooks** để:

1. ✅ **Loại bỏ manual token passing** từ tất cả API calls
2. ✅ **Áp dụng `authFetch`** cho auto token management
3. ✅ **Thống nhất hooks structure** vào `/lib/hooks`
4. ✅ **Tích hợp hoàn chỉnh** với Silent Token Manager

---

## 🔄 API Services Đã Cập Nhật

### 1. **Categories API** (`/lib/api/categories.ts`)

**Before:**
```typescript
create: async (data: CreateCategoryRequest, token: string) => {
  const response = await authFetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

getList: async (params: CategoryListParams, token: string) => {
  // Manual token handling
}
```

**After:**
```typescript
create: async (data: CreateCategoryRequest) => {
  const response = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  })
}

getList: async (params: CategoryListParams) => {
  // Auto token handling via authFetch
}
```

### 2. **Staff API** (`/lib/api/staff.ts`)

**Before:**
```typescript
getList: async (params: StaffListParams = {}, token: string) => {
  const response = await authFetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

create: async (data: CreateStaffRequest, token: string) => {
  // Manual token passing
}
```

**After:**
```typescript
getList: async (params: StaffListParams = {}) => {
  const response = await authFetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  })
}

create: async (data: CreateStaffRequest) => {
  // Clean API without token dependency
}
```

### 3. **Books API** (đã được cập nhật trước đó)
- ✅ All functions: `create`, `update`, `updateStatus`, `getList`, `getDetail`, `getChapters`, `delete`
- ✅ Loại bỏ token parameters hoàn toàn
- ✅ Sử dụng `authFetch` với auto token management

---

## 🗂️ Hooks Structure Unification

### **Old Structure (Inconsistent):**
```
/hooks/                          ❌ Scattered
  ├── use-mobile.tsx
  ├── use-theme.ts  
  ├── use-toast.ts
  └── use-reference-data.ts

/lib/hooks/                      ❌ Partial
  ├── hooks.ts (Redux only)
  └── useSilentTokenManager.ts
```

### **New Structure (Unified):**
```
/lib/hooks/                      ✅ Centralized
  ├── index.ts                   ✅ Single export point
  ├── hooks.ts                   ✅ Redux hooks  
  ├── useSilentTokenManager.ts   ✅ Auth/Token
  ├── use-mobile.tsx             ✅ UI/UX
  ├── use-theme.ts               ✅ UI/UX
  ├── use-toast.ts               ✅ UI/UX
  └── use-reference-data.ts      ✅ Data Management
```

### **Index Export (`/lib/hooks/index.ts`):**
```typescript
// Redux hooks (from main lib folder)
export { useAppDispatch, useAppSelector, useAppStore } from "../hooks"

// Auth & Token Management hooks
export { useSilentTokenManager } from "./useSilentTokenManager"

// UI & UX hooks
export { useIsMobile } from "./use-mobile"
export { useTheme } from "./use-theme"
export { useToast, toast } from "./use-toast"

// Data Management hooks
export { useBookCategories, useReferenceData } from "./use-reference-data"
```

---

## 🔧 Component Updates

### **Tất cả components đã được cập nhật:**

| Component | Changes |
|-----------|---------|
| **`toaster.tsx`** | ✅ Import: `@/lib/hooks/use-toast` |
| **`sidebar.tsx`** | ✅ Import: `@/lib/hooks/use-mobile` |
| **`category-management.tsx`** | ✅ Import + API: `categoriesApi.getList(params)` |
| **`staff-management.tsx`** | ✅ Import + API: `staffApi.getList(params)` |
| **`create-staff-modal.tsx`** | ✅ Import + API: `staffApi.create(data)` |
| **`create-category-modal.tsx`** | ✅ Import + API: `categoriesApi.create(data)` |
| **`book-management.tsx`** | ✅ Import + API: All `booksApi.*` calls |
| **`book-status-modal.tsx`** | ✅ Import + API: `booksApi.updateStatus(id, data)` |
| **`book-detail-modal.tsx`** | ✅ Import + API: `booksApi.getDetail(id)`, `booksApi.getChapters(id)` |
| **`book-form-modal.tsx`** | ✅ Import + API: `booksApi.create(data)`, `booksApi.update(id, data)` |

---

## 🚀 Benefits Achieved

### 1. **Developer Experience**
```typescript
// OLD: Manual token management
const token = useAppSelector(state => state.auth.access_token)
const result = await booksApi.getList(params, token!)

// NEW: Clean & Simple
const result = await booksApi.getList(params)
```

### 2. **Centralized Token Management**
- ✅ **Silent Token Manager** handles all token operations
- ✅ **No manual token passing** required
- ✅ **Auto refresh** when needed
- ✅ **Error handling** centralized

### 3. **Consistent Architecture**
- ✅ **Single source of truth** for hooks
- ✅ **Clear import paths** (`@/lib/hooks`)
- ✅ **Logical organization** by functionality

### 4. **Future Scalability**
- ✅ **Easy to add new hooks** in organized structure
- ✅ **Consistent patterns** across all API services  
- ✅ **Maintainable codebase** with clear separation

---

## 📊 Migration Summary

| Aspect | Before | After | Status |
|--------|--------|-------|---------|
| **API Token Passing** | Manual in all calls | Auto via `authFetch` | ✅ Complete |
| **Hooks Location** | Scattered `/hooks` & `/lib/hooks` | Unified `/lib/hooks` | ✅ Complete |
| **Import Statements** | Inconsistent paths | Unified `@/lib/hooks/*` | ✅ Complete |
| **Token Management** | Component-level | Service-level (Silent) | ✅ Complete |
| **Error Handling** | Scattered | Centralized in `authFetch` | ✅ Complete |
| **Code Duplication** | High (token boilerplate) | Minimal | ✅ Complete |

---

## 🎯 Final Architecture

```
📁 ebook_admin/
├── 📁 lib/
│   ├── 📁 hooks/                    ← 🎯 Unified hooks
│   │   ├── index.ts                 ← Single export
│   │   ├── hooks.ts                 ← Redux  
│   │   ├── useSilentTokenManager.ts ← Auth
│   │   ├── use-mobile.tsx           ← UI
│   │   ├── use-theme.ts             ← UI
│   │   ├── use-toast.ts             ← UI
│   │   └── use-reference-data.ts    ← Data
│   ├── 📁 api/                      ← 🎯 Clean API services
│   │   ├── books.ts                 ← No token params
│   │   ├── categories.ts            ← No token params  
│   │   ├── staff.ts                 ← No token params
│   │   └── reference.ts             ← Reference data
│   ├── 📁 services/                 ← 🎯 Background services
│   │   └── silentTokenManager.ts    ← Token automation
│   └── config.ts                    ← 🎯 Smart authFetch
└── 📁 components/                   ← 🎯 Clean components
    └── **/*.tsx                     ← No token management
```

---

**🎉 Kết quả**: Toàn bộ hệ thống giờ đây có **architecture nhất quán**, **developer experience tuyệt vời**, và **token management hoàn toàn tự động** - không còn manual token passing ở bất kỳ đâu! 