# 🐾 Swipe Interface Implementation - Adopet

## Overview
Updated the Match screen (`app/(tabs)/index.tsx`) to replace mock data with real pet listings from Supabase, featuring Tinder-like swipe mechanics with like/view tracking.

---

## Key Changes

### 1. **Data Source: From Mock to Real**
```typescript
// BEFORE: Mock SAMPLE_PETS array
const SAMPLE_PETS: Pet[] = [...]

// AFTER: Fetch from Supabase via PetService
const loadPets = async () => {
  const availablePets = await PetService.getAvailablePets(user?.id);
  // Parse images from JSON if needed
  setPets(parsedPets);
};
```

### 2. **Pet Interface Updated**
```typescript
interface Pet {
  id: string;
  name: string;
  type: string;              // 'dog' | 'cat' | 'hamster' | etc
  age_months?: number;       // Age in months (converted to years for display)
  breed?: string;            // Breed information
  location?: string;         // Location
  description?: string;      // Full description
  price?: number;           // Adoption fee
  images: string[];         // Array of image URLs
  seller_id: string;        // Reference to seller/profile
  is_available: boolean;    // Availability status
  like_count: number;       // Total likes (auto-updated by triggers)
  view_count: number;       // Total views (auto-updated by triggers)
  profiles?: {              // Seller information
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  energy_level?: string;    // 'low' | 'medium' | 'high'
  size?: string;            // 'small' | 'medium' | 'large' | 'extra_large'
}
```

### 3. **Swipe Actions with Tracking**

#### **Left Swipe (Pass)**
- Records a view via `PetService.trackView()`
- Adds entry to `pet_views` table
- Auto-increments `view_count` on pet (via trigger)
- Moves to next card

#### **Right Swipe (Like)**
- Records a view first
- Calls `PetService.toggleLike()` to add/remove like
- Adds/removes entry from `pet_likes` table
- Auto-increments/decrements `like_count` on pet (via trigger)
- Updates local `likedPets` Set for UI feedback
- Moves to next card

#### **Other Actions**
- **Undo (🔄)**: Jump back one card with `jumpToCardIndex()`
- **Super Like (⭐)**: Available but not fully implemented
- **Message (💬)**: Available but not fully implemented

### 4. **Tracking Implementation**

```typescript
// Track view when card is viewed
const trackPetView = async (petId: string) => {
  await PetService.trackView(petId, user?.id);
  // Creates pet_views record → triggers view_count increment
};

// Toggle like/unlike
const handleToggleLike = async (petId: string) => {
  const result = await PetService.toggleLike(petId, user.id);
  // Toggles pet_likes record → triggers like_count increment/decrement
  setLikedPets(...); // Update UI
};
```

### 5. **UI Enhancements**

#### **Seller Information Badge** (Top of card)
```
┌─────────────────────────────────┐
│  [Avatar] Seller Name           │
│           👍 42 | 👁 158        │
└─────────────────────────────────┘
```
- Shows seller profile with avatar
- Displays like & view counts for this pet

#### **Pet Information** (Bottom of card)
```
┌─────────────────────────────────┐
│  Buddy, 3                       │
│  🐶 Golden Retriever            │
│  📄 Ho Chi Minh City            │
│  💰 Size: Large                 │
│  ⚡ Energy: High                │
└─────────────────────────────────┘
```
- Dynamic display based on available data
- Conditionally rendered fields

#### **Like Button Feedback**
- Green heart (❤️) when not liked
- Red heart (❤️) when liked by current user
- Color changes immediately for feedback

### 6. **Loading States**

```typescript
// Loading spinner while fetching pets
if (loading) {
  return <ActivityIndicator /> + "Đang tải pets..."
}

// Empty state when no pets available
if (pets.length === 0) {
  return "Không có pet để hiển thị" + Refresh button
}
```

### 7. **Database Interactions**

**Tables Used:**
- `pets` - Pet listings with view/like counts
- `pet_likes` - Track which users liked which pets
- `pet_views` - Track pet views (for analytics)

**Automatic Features (via SQL triggers):**
- `view_count` increments when new `pet_views` record created
- `like_count` increments/decrements when `pet_likes` record inserted/deleted
- `last_viewed_at` timestamp updates on new view

---

## Technical Details

### Image Handling
- Stores as JSON array in database
- Parsed on load if needed
- Animated left/right carousel navigation per card

### View Tracking
- Records: `pet_id`, `user_id`, `timestamp`
- Anonymous views supported (ip_address, user_agent)
- Separate from like tracking

### Like Persistence
- One-to-one relationship per user-pet pair
- UNIQUE constraint prevents duplicates
- Immediate feedback with local state
- Auto-synced with database

---

## Usage Flow

1. **Screen Load** → `loadPets()` fetches available pets from Supabase
2. **User Views Card** → Card is rendered with images, info, seller details
3. **User Swipes Right** → 
   - View tracked → `pet_views` record created
   - Like toggled → `pet_likes` record created
   - `like_count` incremented (auto)
   - Like button shows red
   - Next card displayed
4. **User Swipes Left** →
   - View tracked → `pet_views` record created
   - Next card displayed without like
5. **Error Handling** → Alert shown, option to retry

---

## Future Enhancements

- [ ] Super Like implementation with notifications
- [ ] Message feature integration
- [ ] Filters panel (breed, age, location, price)
- [ ] Pet detail view on tap
- [ ] Share pet functionality
- [ ] Watchlist/Saved pets feature
- [ ] Pagination/infinite scroll
- [ ] Real-time pet availability updates

---

## Testing Checklist

- [ ] ✅ Pets load from Supabase on screen mount
- [ ] ✅ Swipe right = like tracked + recorded
- [ ] ✅ Swipe left = view tracked only
- [ ] ✅ Like count updates in real-time
- [ ] ✅ View count increments
- [ ] ✅ Seller info displays correctly
- [ ] ✅ Image carousel works per card
- [ ] ✅ Empty state shows when no pets
- [ ] ✅ Loading state shows on initial load
- [ ] ✅ Undo button works
- [ ] ✅ Error handling on failed requests
