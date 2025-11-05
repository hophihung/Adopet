# Hệ thống Giao dịch và Điểm Uy tín

## Tổng quan

Hệ thống này cho phép người bán gửi mã giao dịch trong chat, người mua xác nhận đã chuyển khoản, và tự động cập nhật điểm uy tín cho người bán khi giao dịch hoàn thành. Điểm uy tín càng cao, avatar frame và tên hiển thị càng đẹp.

## Các tính năng đã implement

### 1. Gửi mã giao dịch (Người bán)
- ✅ Nút "Gửi mã" trong header của chat screen (chỉ hiện cho người bán)
- ✅ Tự động tạo mã giao dịch duy nhất
- ✅ Hiển thị mã giao dịch trong chat
- ✅ Gửi tin nhắn tự động thông báo mã giao dịch

### 2. Xác nhận giao dịch (Người mua)
- ✅ Hiển thị TransactionCard với mã giao dịch và số tiền
- ✅ Nút upload ảnh chứng từ chuyển khoản
- ✅ Nút xác nhận đã chuyển khoản
- ✅ Tự động cập nhật trạng thái giao dịch

### 3. Hệ thống điểm uy tín
- ✅ Tự động cộng điểm khi giao dịch hoàn thành
- ✅ Công thức: 1 điểm per 100,000 VND
- ✅ Tự động cập nhật avatar frame dựa trên điểm uy tín

### 4. Avatar Frame và Reputation Badge
- ✅ 6 cấp độ: Default, Bronze, Silver, Gold, Platinum, Diamond
- ✅ Hiển thị badge trong header chat
- ✅ Hiển thị frame quanh avatar
- ✅ Hiển thị frame trong tin nhắn

## Cấu trúc Database

### Bảng `transactions`
- `id`: UUID
- `conversation_id`: UUID
- `pet_id`: UUID
- `seller_id`: UUID
- `buyer_id`: UUID
- `transaction_code`: TEXT (unique)
- `amount`: NUMERIC
- `status`: 'pending' | 'completed' | 'cancelled'
- `payment_proof_url`: TEXT (URL ảnh chứng từ)
- `created_at`, `updated_at`, `completed_at`: TIMESTAMP

### Bảng `profiles` (đã thêm)
- `reputation_points`: INTEGER (default 0)
- `avatar_frame`: TEXT ('default' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond')

### Trigger và Functions
- `generate_transaction_code()`: Tạo mã giao dịch unique
- `confirm_transaction()`: Xác nhận giao dịch (chỉ buyer)
- `update_seller_reputation()`: Tự động cập nhật điểm uy tín khi transaction completed
- `get_reputation_tier()`: Lấy tier dựa trên điểm

## Các Component

### TransactionCard
- Hiển thị thông tin giao dịch
- Nút copy mã giao dịch
- Upload ảnh chứng từ (cho buyer)
- Xác nhận giao dịch (cho buyer)
- Hiển thị trạng thái: pending, completed, cancelled

### ReputationBadge
- Hiển thị icon và điểm uy tín
- 3 kích thước: small, medium, large
- Tùy chọn hiển thị điểm

### AvatarFrame
- Wrapper component để hiển thị frame quanh avatar
- Tự động chọn frame dựa trên reputation points
- Hiệu ứng shadow và border theo tier

### ChatScreen (đã cập nhật)
- Nút "Gửi mã" cho seller
- Hiển thị transactions trong chat list
- Hiển thị reputation badge và avatar frame
- Real-time updates cho transactions

## Cấp độ Reputation

| Điểm | Tier | Frame | Icon |
|------|------|-------|------|
| 0-49 | Default | Không có | - |
| 50-99 | Bronze | Đồng | ⭐ |
| 100-199 | Silver | Bạc | ⭐ |
| 200-499 | Gold | Vàng | 🏆 |
| 500-999 | Platinum | Bạch Kim | 👑 |
| 1000+ | Diamond | Kim Cương | 💎 |

## Luồng giao dịch

1. **Người bán bấm "Gửi mã"**
   - Tạo transaction với status 'pending'
   - Generate mã giao dịch unique
   - Gửi tin nhắn tự động

2. **Người mua nhận mã**
   - Xem mã giao dịch trong TransactionCard
   - Chuyển khoản theo mã
   - (Optional) Upload ảnh chứng từ
   - Bấm "Xác nhận đã chuyển khoản"

3. **Hệ thống xác nhận**
   - Update transaction status = 'completed'
   - Trigger tự động cộng điểm uy tín cho seller
   - Tự động cập nhật avatar frame
   - Set completed_at timestamp

## Files đã tạo/cập nhật

### Components
- `src/features/chat/components/TransactionCard.tsx` (mới)
- `src/features/chat/components/ReputationBadge.tsx` (mới)
- `src/features/chat/components/ChatScreen.tsx` (cập nhật)

### Services
- `src/features/chat/services/transaction.service.ts` (đã có sẵn)

### Database
- `supabase/migrations/012_create_transaction_reputation_system.sql` (đã có sẵn)

### Exports
- `src/features/chat/index.ts` (cập nhật)

## Cách sử dụng

### Cho người bán:
1. Vào chat với người mua
2. Bấm nút "Gửi mã" ở header
3. Mã giao dịch sẽ được tạo và hiển thị trong chat
4. Chờ người mua xác nhận

### Cho người mua:
1. Nhận mã giao dịch từ người bán
2. Chuyển khoản theo mã
3. (Optional) Upload ảnh chứng từ
4. Bấm "Xác nhận đã chuyển khoản"
5. Giao dịch hoàn thành, người bán được cộng điểm

## Lưu ý

- Migration `012_create_transaction_reputation_system.sql` cần được chạy trước
- Avatar frame sẽ tự động cập nhật khi reputation points thay đổi
- Transaction status được real-time update
- Cần có bucket `pet-images` trong Supabase Storage để upload ảnh chứng từ

