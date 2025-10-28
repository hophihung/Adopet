# 📸 Image Upload System - Hướng dẫn sử dụng

## 🎯 Tổng quan

Hệ thống upload ảnh đã được tích hợp hoàn chỉnh với Supabase Storage, hỗ trợ:
- ✅ Chọn ảnh từ camera hoặc thư viện
- ✅ Upload lên Supabase Storage
- ✅ Validation kích thước và định dạng
- ✅ Compression tự động
- ✅ RLS security
- ✅ Cleanup ảnh orphaned

## 🚀 Cài đặt

### 1. Chạy Migration
```sql
-- Chạy file migration trong Supabase SQL Editor
-- File: supabase/migrations/006_create_pet_images_storage.sql
```

### 2. Cài đặt Dependencies
```bash
# Đã có sẵn trong package.json
expo-image-picker
```

## 📱 Tính năng

### **Image Upload Service** (`src/services/imageUpload.service.ts`)

#### **Core Functions:**
```typescript
// Chọn ảnh từ camera hoặc thư viện
const imageUri = await imageUploadService.pickImage({
  quality: 0.8,
  maxWidth: 1024,
  maxHeight: 1024,
  allowsEditing: true,
  aspect: [1, 1]
});

// Upload ảnh lên Supabase Storage
const result = await imageUploadService.uploadImage(
  imageUri,
  'pet-images',
  'pets'
);

// Upload nhiều ảnh
const results = await imageUploadService.uploadMultipleImages(
  imageUris,
  'pet-images',
  'pets'
);

// Xóa ảnh
const success = await imageUploadService.deleteImage(filePath);
```

#### **Validation:**
```typescript
// Kiểm tra định dạng ảnh
const isValid = imageUploadService.validateImage(uri);

// Kiểm tra kích thước file
const fileSize = await imageUploadService.getFileSize(uri);

// Lấy kích thước ảnh
const dimensions = await imageUploadService.getImageSize(uri);
```

### **Create Pet Screen** (`app/pet/create-pet.tsx`)

#### **Tính năng:**
- ✅ Chọn ảnh từ camera hoặc thư viện
- ✅ Preview ảnh trước khi upload
- ✅ Validation kích thước (max 5MB)
- ✅ Validation định dạng (JPG, PNG, WebP, GIF)
- ✅ Upload tự động khi submit
- ✅ Loading states
- ✅ Error handling

#### **UI Features:**
- 📱 Image picker với options (Camera/Library)
- 🖼️ Image preview grid
- ❌ Remove image button
- ⏳ Loading indicator khi upload
- 📊 Progress feedback

### **Edit Pet Screen** (`app/pet/[id].tsx`)

#### **Tính năng:**
- ✅ Hiển thị ảnh hiện tại
- ✅ Thêm ảnh mới
- ✅ Xóa ảnh cũ
- ✅ Upload ảnh mới
- ✅ Giữ lại ảnh cũ
- ✅ Smart upload (chỉ upload ảnh mới)

## 🗄️ Database Schema

### **Supabase Storage Bucket:**
```sql
-- Bucket: pet-images
-- Public: true
-- File size limit: 5MB
-- Allowed types: image/jpeg, image/png, image/webp, image/gif
```

### **RLS Policies:**
```sql
-- Anyone can view images (public bucket)
-- Authenticated users can upload images
-- Users can update/delete their own images
```

### **Functions:**
```sql
-- get_pet_image_url(image_path) - Lấy public URL
-- delete_pet_images() - Xóa ảnh khi xóa pet
-- cleanup_orphaned_pet_images() - Cleanup ảnh không dùng
-- validate_pet_image_upload() - Validate upload
```

## 🔧 Cách sử dụng

### **1. Trong Create Pet Screen:**
```typescript
// User chọn ảnh
const handleImageAdd = async () => {
  const imageUri = await imageUploadService.pickImage({
    quality: 0.8,
    maxWidth: 1024,
    maxHeight: 1024,
    allowsEditing: true,
    aspect: [1, 1]
  });
  
  if (imageUri) {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, imageUri]
    }));
  }
};

// Upload khi submit
const handleSubmit = async () => {
  const uploadResults = await imageUploadService.uploadMultipleImages(
    formData.images,
    'pet-images',
    'pets'
  );
  
  const updatedFormData = {
    ...formData,
    images: uploadResults.map(result => result.url)
  };
  
  await createPet(updatedFormData);
};
```

### **2. Trong Edit Pet Screen:**
```typescript
// Smart upload - chỉ upload ảnh mới
const handleSubmit = async () => {
  const existingUrls = formData.images.filter(img => img.startsWith('http'));
  const newUris = formData.images.filter(img => !img.startsWith('http'));
  
  if (newUris.length > 0) {
    const uploadResults = await imageUploadService.uploadMultipleImages(
      newUris,
      'pet-images',
      'pets'
    );
    
    const updatedFormData = {
      ...formData,
      images: [...existingUrls, ...uploadResults.map(result => result.url)]
    };
    
    await updatePet(id, updatedFormData);
  }
};
```

## 🎨 UI/UX Features

### **Image Picker Options:**
- 📷 **Camera** - Chụp ảnh mới
- 🖼️ **Photo Library** - Chọn từ thư viện
- ✂️ **Crop/Edit** - Chỉnh sửa ảnh
- 📐 **Aspect Ratio** - Tỷ lệ 1:1

### **Image Preview:**
- 🖼️ **Grid Layout** - Hiển thị dạng lưới
- ❌ **Remove Button** - Nút xóa ảnh
- ⏳ **Loading State** - Trạng thái loading
- 📊 **Progress Indicator** - Thanh tiến trình

### **Validation & Error Handling:**
- ✅ **File Size** - Kiểm tra kích thước (max 5MB)
- ✅ **File Type** - Kiểm tra định dạng
- ✅ **Image Quality** - Compression tự động
- ❌ **Error Messages** - Thông báo lỗi rõ ràng

## 🔒 Security

### **RLS Policies:**
```sql
-- Public read access cho ảnh
-- Authenticated users có thể upload
-- Users chỉ có thể xóa ảnh của mình
```

### **File Validation:**
- ✅ Kích thước file (max 5MB)
- ✅ Định dạng file (JPG, PNG, WebP, GIF)
- ✅ Tên file (không chứa ..)
- ✅ MIME type validation

### **Storage Security:**
- 🔐 Bucket-level permissions
- 🔐 File-level RLS
- 🔐 Automatic cleanup
- 🔐 Orphaned file detection

## 🚀 Performance

### **Optimization:**
- 📦 **Image Compression** - Tự động nén ảnh
- 🖼️ **Resize** - Resize về 1024x1024
- ⚡ **Lazy Loading** - Load ảnh khi cần
- 🗑️ **Cleanup** - Xóa ảnh không dùng

### **Caching:**
- 💾 **Local Cache** - Cache ảnh local
- 🌐 **CDN** - Supabase CDN
- ⚡ **Fast Loading** - Load nhanh

## 🧹 Maintenance

### **Cleanup Functions:**
```sql
-- Xóa ảnh orphaned (không được sử dụng)
SELECT cleanup_orphaned_pet_images();

-- Xóa ảnh cũ hơn 30 ngày
DELETE FROM storage.objects 
WHERE bucket_id = 'pet-images' 
AND created_at < now() - INTERVAL '30 days';
```

### **Monitoring:**
```sql
-- Kiểm tra kích thước bucket
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size
FROM storage.objects 
WHERE bucket_id = 'pet-images'
GROUP BY bucket_id;

-- Kiểm tra ảnh không được sử dụng
SELECT name, created_at
FROM storage.objects 
WHERE bucket_id = 'pet-images'
AND name NOT IN (
  SELECT unnest(images) FROM pets
);
```

## 🎯 Best Practices

### **1. Image Quality:**
- Sử dụng quality: 0.8 (80%)
- Resize về 1024x1024
- Sử dụng WebP khi có thể

### **2. User Experience:**
- Hiển thị loading states
- Validation trước khi upload
- Error messages rõ ràng
- Preview ảnh trước khi upload

### **3. Performance:**
- Upload ảnh song song
- Compress ảnh trước khi upload
- Sử dụng CDN
- Cleanup ảnh không dùng

### **4. Security:**
- Validate file type
- Kiểm tra kích thước
- Sử dụng RLS
- Sanitize file names

---

**🎉 Image Upload System đã sẵn sàng sử dụng!**

Hệ thống hỗ trợ đầy đủ tính năng upload ảnh với Supabase Storage, bao gồm validation, compression, security và performance optimization.
