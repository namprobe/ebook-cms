# API Filtering & Sorting Implementation Guide

## Overview
This guide covers the complete API filtering, sorting, and pagination implementation for all list endpoints in the admin panel, with real-time filtering and extended support for all backend parameters.

## Book Management API Features

### BookListParams Interface
The complete interface supports all documented backend API parameters:

```typescript
export interface BookListParams {
  // Combined text search (searches across title, author, isbn, publisher, tags)
  search?: string
  
  // Specific filters
  categoryId?: string
  approvalStatus?: 0 | 1 | 2 // 0: Pending, 1: Approved, 2: Rejected
  status?: 0 | 1 // 0: Active, 1: Inactive
  isPremium?: boolean
  hasChapters?: boolean
  
  // Date range filtering
  publishedDateFrom?: string
  publishedDateTo?: string
  
  // Numeric filters
  minRating?: number
  maxRating?: number
  minTotalRatings?: number
  minTotalViews?: number
  maxTotalViews?: number
  
  // Sorting
  sortBy?: "title" | "author" | "isbn" | "publisher" | "approvalstatus" | 
           "status" | "ispremium" | "pagecount" | "publisheddate" | 
           "createdat" | "rating" | "totalratings" | "totalviews"
  isAscending?: boolean
  
  // Pagination
  pageNumber?: number
  pageSize?: number
}
```

### Book Interface
Updated to include all fields returned by the API:

```typescript
export interface Book {
  id: string
  title: string
  author: string
  description: string
  isbn?: string
  publisher?: string
  category_name: string
  cover_image_url: string
  approval_status: 0 | 1 | 2
  status: 0 | 1
  is_premium: boolean
  has_chapters: boolean
  average_rating: number
  total_ratings: number
  total_views: number
  published_date: string
  created_at: string
  tags?: string
}
```

## UI Implementation

### Filter Components
1. **Combined Search Field**: Single search input that searches across title, author, ISBN, publisher, and tags
2. **Category Filter**: Dropdown with all available categories
3. **Approval Status Filter**: Dropdown with Pending/Approved/Rejected options
4. **Status Filter**: Dropdown with Active/Inactive options
5. **Premium Filter**: Dropdown with Premium/Free options

### Sort Features
- **Sort Direction Toggle**: Button with up/down arrow icons
- **Extended Sort Options**: All sortable fields from the API
- **Visual Feedback**: Clear indication of current sort field and direction

### Real-time Filtering
- **Immediate API calls** for dropdown changes
- **500ms debounce** for text search input
- **Auto-reset pagination** when filters change

## Filter States & Labels

### Approval Status
- `0` = "Chờ duyệt" (Pending) - Secondary badge
- `1` = "Đã duyệt" (Approved) - Default badge  
- `2` = "Từ chối" (Rejected) - Destructive badge

### Book Status
- `0` = "Hoạt động" (Active) - Default badge
- `1` = "Không hoạt động" (Inactive) - Secondary badge

### Premium Status
- `true` = "Premium" - Default badge
- `false` = "Miễn phí" - Secondary badge

## Table Layout
Updated table includes:
1. ID (shortened to last 8 characters)
2. Book (title, description, cover image)
3. Author
4. Category
5. **Approval Status** (new)
6. **Status** (new)  
7. Premium Type
8. Rating (with star icon)
9. Views
10. Published Date
11. Actions dropdown

## Implementation Benefits

### Performance
- **Reduced API calls** through debounced search
- **Efficient state management** with single source of truth
- **Optimized re-renders** with proper dependency arrays

### User Experience
- **Instant feedback** for dropdown filters
- **Smooth search experience** with debouncing
- **Clear visual indicators** for all statuses
- **Consistent interface** across all management pages

### Maintainability
- **Type-safe interfaces** prevent runtime errors
- **Centralized API logic** in dedicated modules
- **Consistent patterns** across all list components
- **Comprehensive documentation** for future developers

## API Integration
The implementation correctly maps UI filters to backend API parameters:

```typescript
// UI State → API Parameters
if (searchQuery.trim()) params.search = searchQuery.trim()
if (categoryFilter) params.categoryId = categoryFilter
if (approvalStatusFilter) params.approvalStatus = parseInt(approvalStatusFilter) as 0 | 1 | 2
if (statusFilter) params.status = parseInt(statusFilter) as 0 | 1
if (premiumFilter) params.isPremium = premiumFilter === "premium"
```

## Error Handling
- **Network error recovery** with user-friendly messages
- **Loading states** during API calls
- **Graceful fallbacks** for missing data
- **Toast notifications** for user feedback

## Future Enhancements
- Add date range picker for published date filtering
- Implement advanced numeric range sliders
- Add bulk operations for filtered results
- Export filtered data functionality
