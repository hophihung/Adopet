-- =====================================================
-- FIX COMMENT COUNT TRIGGER
-- Kiểm tra và sửa lỗi trigger không tự động update comment_count
-- =====================================================

-- 1️⃣ Kiểm tra trigger hiện tại
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'post_comments';

-- 2️⃣ Xóa trigger cũ nếu có (để tạo lại)
DROP TRIGGER IF EXISTS trigger_update_comment_count ON public.post_comments;

-- 3️⃣ Xóa function cũ
DROP FUNCTION IF EXISTS update_post_comment_count();

-- 4️⃣ Tạo lại function để update comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Khi thêm comment, tăng comment_count
    UPDATE public.posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Khi xóa comment, giảm comment_count (nhưng không âm)
    UPDATE public.posts 
    SET comment_count = GREATEST(comment_count - 1, 0) 
    WHERE id = OLD.post_id;
    
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ Tạo lại trigger
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- 6️⃣ Đồng bộ lại comment_count cho tất cả posts (fix dữ liệu hiện tại)
UPDATE public.posts p
SET comment_count = (
  SELECT COUNT(*)
  FROM public.post_comments c
  WHERE c.post_id = p.id
);

-- 7️⃣ Kiểm tra kết quả
SELECT 
  p.id,
  p.content,
  p.comment_count as current_count,
  COUNT(c.id) as actual_count
FROM public.posts p
LEFT JOIN public.post_comments c ON c.post_id = p.id
GROUP BY p.id, p.content, p.comment_count
ORDER BY p.created_at DESC;

-- =====================================================
-- HOÀN THÀNH! 
-- Chạy script này trong Supabase SQL Editor
-- =====================================================
