# Authentication Flow Logic

## Yêu cầu của User
1. **Logout/Token hết hạn** → Login lại → **Luôn về Dashboard** (fresh start)
2. **Đang login hợp lệ** → Refresh trang → **Ở lại trang hiện tại**

## Logic đã triển khai

### 1. Logout/Token Expire → Fresh Start (Dashboard)

#### Khi nào trigger:
- Token hết hạn (isTokenExpired = true)
- Silent refresh thất bại nhiều lần
- API trả về 401 Unauthorized
- User click logout

#### Hành vi:
- ❌ **KHÔNG** lưu returnPath
- Clear localStorage (access_token, user)
- Redirect về `/login`
- Sau khi login lại → **Luôn về `/admin`** (Dashboard)

#### Locations implemented:
- `config.ts` - handleApiError()
- `auth-guard.tsx` - token expired check
- `auth-guard.tsx` - auth logout handler
- `page.tsx` - redirect sau login
- `login-form.tsx` - redirect sau login

### 2. Valid Login → Refresh → Stay Current Page

#### Khi nào trigger:
- User refresh trang khi đang login hợp lệ
- Khởi động app khi có valid token trong localStorage

#### Hành vi:
- `checkAuthStatus()` trong `authSlice.ts` kiểm tra localStorage
- Nếu có valid token → restore auth state
- User ở lại đúng trang hiện tại (không redirect)

#### Implementation:
- `authSlice.ts` - checkAuthStatus thunk
- `auth-guard.tsx` - gọi checkAuthStatus on mount
- Không có logic redirect nếu đã authenticated và ở trang hợp lệ

## Kết quả

### Scenario 1: Token Expire
```
User ở /admin/users → Token expire → Login → Dashboard (/admin) ✅
User ở /admin/staff → Token expire → Login → Dashboard (/admin) ✅
```

### Scenario 2: Valid Login Refresh
```
User ở /admin/users → Refresh → Stay at /admin/users ✅
User ở /admin/staff → Refresh → Stay at /admin/staff ✅
```

### Scenario 3: Fresh Login
```
Truy cập trực tiếp /login → Login → Dashboard (/admin) ✅
```

## Code Changes

### Removed Functions:
- ❌ `saveReturnPath()` - Không cần lưu path khi logout
- ❌ `getAndClearReturnPath()` - Luôn về dashboard

### Simplified Logic:
- Login → Always redirect to `/admin`
- Logout/Expire → Always redirect to `/admin` after re-login
- Valid session + refresh → Stay current page (handled by checkAuthStatus)

## User Experience
- **Clean logout experience**: Mỗi lần login lại là fresh start từ dashboard
- **Seamless refresh**: Không mất vị trí khi refresh trong session hợp lệ
- **Predictable behavior**: User biết chắc sẽ về dashboard sau mỗi lần login 