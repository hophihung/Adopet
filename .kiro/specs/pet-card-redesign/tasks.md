# Implementation Plan - Pet Card Redesign

- [x] 1. Create new PetCard component with full image layout





  - Create new file `src/features/pets/components/PetCardNew.tsx` with basic structure
  - Implement card container with proper dimensions (screen width - 32px, 4:5 aspect ratio)
  - Add ImageBackground component to display pet image covering full card
  - Implement rounded corners (20px) and shadow styling
  - Add placeholder for missing images with appropriate styling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
-

- [x] 2. Implement gradient overlay and text section



-

  - [x] 2.1 Add LinearGradient overlay component






    - Import and configure expo-linear-gradient
    - Apply gradient from transparent to semi-transparent black
    - Position gradient to cover bottom 40% of card
    - Set gradient colors: ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']
    - _Requirements: 2.1, 2.2, 2.4_
  

  - [x] 2.2 Create text overlay section container

    - Position text section absolutely at bottom of card
    - Add padding (20px horizontal, 24px vertical)
    - Ensure text uses white color with text shadow for readability
    - Apply proper font weights (700+) for all text elements
    - _Requirements: 2.2, 2.3, 2.5_
-

- [x] 3. Build status indicator component




  - Create status indicator with green dot and "Có hoạt động gần đây" text
  - Style green dot (8px diameter, #10B981 color)
  - Position at top of text overlay section
  - Use flex row layout with 6px gap
  - Apply white text color with 13px font size and 600 weight
  - _Requirements: 4.1, 4.3, 4.5_

- [x] 4. Implement pet information display



  - [x] 4.1 Create name, age, and verification badge row





    - Display pet name with 28px font size, 800 weight, white color
    - Display pet age next to name with 24px font size, 700 weight
    - Add blue checkmark verification badge (20px) for verified sellers
    - Use flex row layout with 8px gap between elements
    - _Requirements: 3.1, 3.2, 4.2_
  -

  - [x] 4.2 Create location information section








    - Add home icon (16px) with location text "Sống tại [location]"
    - Add pin icon with distance text "Cách xa [distance]"
    - Style location text: 15px, weight 600, white color
    - Style distance text: 14px, weight 500, white with 0.8 opacity
    - Add 8px spacing between location lines
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 5. Create action buttons row




  - [x] 5.1 Build individual action button components


    - Create circular button component (60px diameter, white background with 95% opacity)
    - Add shadow styling (shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 8)
    - Implement 5 buttons: back (↶), close (✕), star (☆), heart (♥), share (➤)
    - Use 24px icon size (28px for heart icon)
    - Apply dark gray icon color (#1F2937)
    - _Requirements: 5.1, 5.2, 5.3_
  

  - [x] 5.2 Layout action buttons container

    - Position buttons in horizontal row at bottom of text overlay
    - Use flex row with space-between justification
    - Add 20px horizontal padding
    - Ensure minimum 44px touch targets for accessibility
    - Implement activeOpacity (0.7) for press feedback
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 6. Implement responsive layout and dimensions





  - Calculate card dimensions based on screen width using Dimensions API
  - Maintain 4:5 aspect ratio across all screen sizes (320px to 428px)
  - Create font scaling function for screens smaller than 375px
  - Ensure action buttons remain accessible on small screens
  - Test layout on different device sizes (iPhone SE, iPhone 14, iPhone 14 Pro Max)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Add image loading states and error handling





  - [x] 7.1 Implement loading state

    - Show ActivityIndicator (white, large size) while image loads
    - Display loading indicator centered on card
    - Use light gray background (#F5F7FA) during loading
    - _Requirements: 7.1, 7.3_
  
  - [x] 7.2 Implement error state


    - Create placeholder UI for failed image loads
    - Display camera icon (48px, #9CA3AF) with "Không có ảnh" text
    - Handle missing or invalid image URLs gracefully
    - Add retry mechanism for network errors
    - _Requirements: 7.2, 7.4, 7.5_

- [x] 8. Add animations and interactions





  - Implement card press animation (scale to 0.95 on press, restore to 1.0 on release)
  - Use Animated API with spring animation for smooth transitions
  - Add image fade-in animation (300ms duration) when image loads
  - Apply activeOpacity to all touchable elements
  - Use native driver for all animations for better performance
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Implement accessibility features





  - [x] 9.1 Add accessibility labels and roles


    - Add accessible label to card: "Pet card for [name], [age] months old, located in [location]"
    - Add accessibility role "button" to card and action buttons
    - Add accessibility hints for all interactive elements
    - _Requirements: 8.1, 8.3_
  
  - [x] 9.2 Ensure proper contrast and touch targets


    - Verify text contrast ratio meets WCAG AA standards (4.5:1 minimum)
    - Ensure all buttons meet 44x44px minimum touch target
    - Test with screen reader (TalkBack on Android, VoiceOver on iOS)
    - _Requirements: 8.2, 8.4, 8.5_

- [x] 10. Integrate with existing services and navigation





  - [x] 10.1 Connect navigation handlers


    - Import useRouter from expo-router
    - Implement onPress handler to navigate to pet detail screen (`/pet/${pet.id}`)
    - Add onBack handler for back button navigation
    - _Requirements: 10.1_
  
  - [x] 10.2 Connect like and favorite functionality


    - Import PetService for like/favorite operations
    - Implement onLike handler with PetService.toggleLike()
    - Implement onFavorite handler with PetService.toggleFavorite()
    - Add error handling with user-friendly toast notifications
    - Update UI state optimistically for better UX
    - _Requirements: 10.2, 10.3_
  
  - [x] 10.3 Implement share functionality


    - Import Share API from react-native
    - Create share handler with pet information and deep link
    - Handle share errors gracefully with retry option
    - Format share message: "Check out [pet name] on Adopet!"
    - _Requirements: 10.4_

- [x] 11. Create style definitions and design tokens





  - Define all component styles using StyleSheet.create()
  - Create spacing scale object (xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32)
  - Create typography scale object with font sizes and weights
  - Define shadow presets for card and buttons
  - Import and use colors from theme file (src/theme/colors.ts)
  - _Requirements: 1.3, 1.4, 2.3, 2.5, 3.1, 3.2, 3.3, 4.5, 5.2_
-

- [x] 12. Update component exports and integration




  - Export new PetCardNew component from src/features/pets/components/index.ts
  - Update discover/swipe screen to use new PetCard component
  - Ensure backward compatibility with existing Pet type interface
  - Test integration with existing pet list and discovery features
  - _Requirements: 10.5_




- [x] 13. Write component tests

  - [x] 13.1 Create unit tests
    - Test component renders correctly with valid pet data
    - Test placeholder displays when image is missing
    - Test loading indicator shows while image loads


    - Test error state displays on image load failure
    - Test all button press handlers are called correctly
    - _Requirements: All_
  
  - [x] 13.2 Create integration tests

    - Test navigation to pet detail screen
    - Test like/favorite state updates and API calls
    - Test share dialog opens correctly
    - Test image caching behavior
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 13.3 Perform accessibility testing


    - Test with screen reader on iOS and Android
    - Verify all interactive elements have proper labels
    - Verify touch targets meet minimum size requirements
    - Verify color contrast meets WCAG standards
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_



- [x] 14. Performance optimization and testing






  - Wrap component with React.memo to prevent unnecessary re-renders
  - Use useCallback for all event handlers
  - Implement image preloading for next card in list
  - Test performance with React DevTools Profiler
  - Verify animations run at 60fps on mid-range devices
  - _Requirements: 9.4, 9.5_
