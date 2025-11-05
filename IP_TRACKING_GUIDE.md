# 🛡️ Hệ thống chống đăng ký nhiều tài khoản từ cùng IP

## 📋 Tổng quan

Hệ thống này ngăn chặn người dùng đăng ký nhiều tài khoản từ cùng một IP address. Khi một IP đăng ký quá số lượng tài khoản cho phép (mặc định 3), IP đó sẽ tự động bị ban.

## 🚀 Cài đặt

### 1. Chạy Migration

Chạy file migration trong Supabase SQL Editor:

```sql
-- File: supabase/migrations/011_ip_tracking_and_ban_system.sql
-- Copy toàn bộ nội dung và chạy trong Supabase Dashboard → SQL Editor
```

### 2. Kiểm tra Migration

Sau khi chạy migration, kiểm tra các bảng đã được tạo:

```sql
-- Kiểm tra bảng ip_tracking
SELECT * FROM public.ip_tracking LIMIT 5;

-- Kiểm tra bảng banned_ips
SELECT * FROM public.banned_ips LIMIT 5;

-- Kiểm tra các functions
SELECT proname FROM pg_proc 
WHERE proname IN (
  'track_user_ip',
  'check_ip_ban',
  'check_ip_account_limit',
  'ban_ip',
  'unban_ip'
);
```

## 🔧 Cách hoạt động

### 1. Khi đăng ký tài khoản mới

- Hệ thống tự động lấy IP address của người dùng
- Kiểm tra xem IP có bị ban không
- Kiểm tra số lượng tài khoản đã đăng ký từ IP này
- Nếu vượt quá giới hạn (3 tài khoản), từ chối đăng ký và tự động ban IP
- Nếu hợp lệ, cho phép đăng ký và lưu IP vào tracking

### 2. Khi đăng nhập

- Kiểm tra xem IP có bị ban không
- Nếu bị ban, từ chối đăng nhập
- Nếu hợp lệ, cho phép đăng nhập và cập nhật tracking

### 3. Tự động ban IP

- Khi một IP đăng ký tài khoản thứ 4 (vượt quá giới hạn 3), IP sẽ tự động bị ban vĩnh viễn
- Ban được thực hiện tự động bởi function `check_ip_account_limit`

## 📊 Database Schema

### Bảng `ip_tracking`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| ip_address | text | IP address |
| user_id | uuid | ID của user (references auth.users) |
| first_seen_at | timestamptz | Lần đầu tiên thấy IP này |
| last_seen_at | timestamptz | Lần cuối cùng thấy IP này |
| account_count | integer | Số lượng tài khoản từ IP này |

### Bảng `banned_ips`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| ip_address | text | IP address bị ban (unique) |
| banned_at | timestamptz | Thời gian bị ban |
| banned_by | uuid | ID của admin ban (nullable) |
| reason | text | Lý do ban |
| expires_at | timestamptz | Thời gian hết hạn ban (NULL = ban vĩnh viễn) |
| is_active | boolean | Trạng thái ban (true = đang bị ban) |

## 🛠️ Functions

### `track_user_ip(user_id, ip_address)`

Track IP khi user đăng ký/đăng nhập.

```typescript
const result = await supabase.rpc('track_user_ip', {
  p_user_id: userId,
  p_ip_address: ipAddress
});

// Returns: { success: true, account_count: 2, ip_address: "..." }
// Hoặc: { success: false, error: "IP_ADDRESS_BANNED", message: "..." }
```

### `check_ip_ban(ip_address)`

Kiểm tra IP có bị ban không.

```typescript
const result = await supabase.rpc('check_ip_ban', {
  p_ip_address: ipAddress
});

// Returns: { banned: false }
// Hoặc: { banned: true, reason: "...", banned_at: "...", expires_at: "..." }
```

### `check_ip_account_limit(ip_address, max_accounts)`

Kiểm tra số tài khoản từ IP và tự động ban nếu vượt quá.

```typescript
const result = await supabase.rpc('check_ip_account_limit', {
  p_ip_address: ipAddress,
  p_max_accounts: 3
});

// Returns: { success: true, banned: false, account_count: 2, max_accounts: 3, remaining: 1 }
// Hoặc: { success: false, banned: true, account_count: 4, error: "IP_ACCOUNT_LIMIT_EXCEEDED", message: "..." }
```

### `ban_ip(ip_address, reason, expires_at, banned_by)`

Ban một IP (cho admin).

```typescript
const result = await supabase.rpc('ban_ip', {
  p_ip_address: ipAddress,
  p_reason: 'Spam behavior',
  p_expires_at: null, // NULL = ban vĩnh viễn
  p_banned_by: adminUserId
});
```

### `unban_ip(ip_address)`

Gỡ ban một IP (cho admin).

```typescript
const result = await supabase.rpc('unban_ip', {
  p_ip_address: ipAddress
});
```

## ⚙️ Cấu hình

### Thay đổi giới hạn số tài khoản mỗi IP

Mặc định là 3 tài khoản. Để thay đổi, sửa trong `AuthContext.tsx`:

```typescript
// Trong signUpWithEmail function
const { data: limitCheck } = await supabase.rpc('check_ip_account_limit', {
  p_ip_address: clientIP,
  p_max_accounts: 5, // Thay đổi từ 3 thành 5
});
```

### Ban IP tạm thời

Để ban IP trong một khoảng thời gian:

```sql
SELECT ban_ip(
  '192.168.1.100',
  'Suspicious activity',
  now() + interval '7 days', -- Ban trong 7 ngày
  'admin-user-id'
);
```

## 🔍 Queries hữu ích

### Xem tất cả IP đang bị ban

```sql
SELECT * FROM public.banned_ips 
WHERE is_active = true 
AND (expires_at IS NULL OR expires_at > now())
ORDER BY banned_at DESC;
```

### Xem số lượng tài khoản từ mỗi IP

```sql
SELECT 
  ip_address,
  COUNT(DISTINCT user_id) as account_count,
  MIN(first_seen_at) as first_seen,
  MAX(last_seen_at) as last_seen
FROM public.ip_tracking
GROUP BY ip_address
ORDER BY account_count DESC;
```

### Xem IP nào có nhiều tài khoản nhất

```sql
SELECT 
  ip_address,
  COUNT(DISTINCT user_id) as account_count
FROM public.ip_tracking
GROUP BY ip_address
HAVING COUNT(DISTINCT user_id) >= 2
ORDER BY account_count DESC;
```

### Xem tất cả tài khoản từ một IP cụ thể

```sql
SELECT 
  it.ip_address,
  it.user_id,
  p.email,
  p.full_name,
  it.first_seen_at,
  it.last_seen_at
FROM public.ip_tracking it
LEFT JOIN public.profiles p ON it.user_id = p.id
WHERE it.ip_address = '192.168.1.100'
ORDER BY it.first_seen_at;
```

## ⚠️ Lưu ý

1. **IP có thể thay đổi**: Người dùng có thể thay đổi IP bằng VPN hoặc proxy. Hệ thống này chỉ là một lớp bảo vệ cơ bản.

2. **Nhiều người dùng cùng IP**: Trong môi trường như office, trường học, hoặc gia đình, nhiều người có thể dùng chung IP. Cân nhắc tăng giới hạn hoặc có cơ chế whitelist.

3. **IPv6**: Hệ thống hỗ trợ cả IPv4 và IPv6.

4. **Privacy**: IP addresses được lưu trữ trong database. Đảm bảo tuân thủ các quy định về privacy nếu cần.

5. **Performance**: Việc lấy IP từ client có thể mất thời gian (1-3 giây). Hệ thống có retry mechanism để đảm bảo reliability.

## 🐛 Troubleshooting

### Lỗi: "Could not get client IP"

- Kiểm tra kết nối internet
- Kiểm tra các service API (ipify.org, ipapi.co) có hoạt động không
- Nếu không lấy được IP, hệ thống vẫn cho phép đăng nhập/đăng ký nhưng không track IP

### Lỗi: "IP_ADDRESS_BANNED" khi không nên bị ban

- Kiểm tra bảng `banned_ips`:
  ```sql
  SELECT * FROM public.banned_ips WHERE ip_address = 'YOUR_IP';
  ```
- Nếu IP bị ban nhầm, sử dụng `unban_ip` để gỡ ban

### Lỗi RLS Policy

- Đảm bảo user đã authenticated khi gọi các functions
- Kiểm tra RLS policies trong migration file

## 📝 TODO

- [ ] Thêm whitelist cho IP được phép nhiều tài khoản
- [ ] Thêm admin dashboard để quản lý banned IPs
- [ ] Thêm notification khi IP bị ban tự động
- [ ] Thêm logging chi tiết hơn
- [ ] Tích hợp với các hệ thống anti-fraud khác

