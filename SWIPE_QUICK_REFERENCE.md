# ⚡ Swipe Quick Reference

## Interactions

| Action | Handler | What Happens |
|--------|---------|--------------|
| **Swipe Right (Like)** | `handleLike()` | 1. Tracks view 2. Calls `toggleLike()` 3. Updates local state 4. Next card |
| **Swipe Left (Pass)** | `handlePass()` | 1. Tracks view 2. Next card |
| **Tap Left Edge** | `handlePrevImage()` | Previous pet image in carousel |
| **Tap Right Edge** | `handleNextImage()` | Next pet image in carousel |
| **Undo Button (🔄)** | `jumpToCardIndex()` | Go back to previous card |
| **Message Button (💬)** | *Future* | Start chat with seller |
| **Super Like (⭐)** | *Future* | Premium like with notification |

---

## Data Flow

```
Screen Load
    ↓
loadPets() 
    ↓
PetService.getAvailablePets(user?.id)
    ↓
Fetch from Supabase (pets table + profiles join)
    ↓
Parse images (if JSON)
    ↓
setState(pets)
    ↓
Render Swiper with pet cards
```

### Swipe Right (Like)
```
User swipes right
    ↓
trackPetView(petId)
    ↓
PetService.trackView(petId, userId)
    ↓
INSERT INTO pet_views (pet_id, user_id, viewed_at)
    ↓
[TRIGGER] view_count++ on pet
    ↓
handleToggleLike(petId)
    ↓
PetService.toggleLike(petId, userId)
    ↓
INSERT INTO pet_likes (pet_id, user_id)
    ↓
[TRIGGER] like_count++ on pet
    ↓
setLikedPets(new Set(...)) ← Local UI update
    ↓
Next card rendered
```

### Swipe Left (Pass)
```
User swipes left
    ↓
trackPetView(petId)
    ↓
PetService.trackView(petId, userId)
    ↓
INSERT INTO pet_views (pet_id, user_id, viewed_at)
    ↓
[TRIGGER] view_count++ on pet
    ↓
Next card rendered
```

---

## State Management

### Local State
```typescript
const [pets, setPets] = useState<Pet[]>([]);
const [loading, setLoading] = useState(true);
const [likedPets, setLikedPets] = useState<Set<string>>(new Set());
const [imageIndices, setImageIndices] = useState<{[key: string]: number}>({});
```

### Database State (Auto-synced)
```typescript
pet.like_count    // Updated by trigger
pet.view_count    // Updated by trigger
```

---

## Error Handling

```typescript
try {
  await PetService.trackView(petId, user?.id);
} catch (error) {
  console.error('Error tracking view:', error);
  // Swipe continues even if tracking fails
}

try {
  const result = await PetService.toggleLike(petId, user.id);
  setLikedPets(...);
} catch (error) {
  console.error('Error toggling like:', error);
  // User sees error but doesn't block swipe
}
```

---

## UI Display Logic

### Like Button Color
```typescript
const isLiked = likedPets.has(currentPet?.id);
const heartColor = isLiked ? "#FF3B5C" : "#00D664";
// Red when liked, green when not
```

### Seller Info Badge
```typescript
{pet.profiles && (
  <View style={styles.sellerInfo}>
    <Image source={{ uri: pet.profiles.avatar_url }} />
    <Text>{pet.profiles.full_name}</Text>
    <Text>👍 {pet.like_count} | 👁 {pet.view_count}</Text>
  </View>
)}
```

### Pet Info Overlay
```typescript
Conditionally rendered based on available fields:
- breed (if exists)
- location (if exists)
- size (if exists)
- energy_level (if exists)
```

---

## Performance Notes

- ✅ Images are lazy-loaded from URLs
- ✅ Animation uses `useNativeDriver: true` (60fps)
- ✅ Views/Likes tracked asynchronously (non-blocking)
- ✅ Like state managed locally for instant feedback
- ✅ Database updates happen in background

---

## Testing Steps

1. **Load Screen**: Should show loading spinner
2. **Pets Display**: Should show cards with real data
3. **Swipe Right**: 
   - Like count increases
   - Heart button turns red
4. **Swipe Left**:
   - No like recorded
   - View count increases
5. **Image Carousel**: Tap left/right to switch images
6. **Undo**: Click 🔄 to go back
7. **Error**: Disconnect internet, try swipe (should show alert)

---

## Database Schema Recap

```sql
-- pets table
id (uuid primary)
seller_id (uuid)
name (text)
type (text)
age_months (int)
breed (text)
images (text/json array)
location (text)
like_count (int) ← Auto-updated
view_count (int) ← Auto-updated
is_available (bool)
... other fields

-- pet_likes table
id (uuid primary)
pet_id (uuid, FK → pets)
user_id (uuid, FK → auth.users)
created_at (timestamp)
UNIQUE(pet_id, user_id)

-- pet_views table
id (uuid primary)
pet_id (uuid, FK → pets)
user_id (uuid, FK → auth.users)
viewed_at (timestamp)
(No UNIQUE constraint - allows multiple views)
```

---

## Next Steps

1. Test with real pet data in Supabase
2. Monitor like_count and view_count updates
3. Implement Super Like notification
4. Add message feature integration
5. Add filters panel
