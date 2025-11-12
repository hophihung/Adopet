# Requirements Document - Pet Card Redesign with Full Image Overlay

## Introduction

This feature redesigns the Pet Card component to display a full-screen image with text overlay, similar to modern dating apps (Tinder, Bumble). The new design improves visual appeal and user engagement by making pet images the primary focus, with information elegantly overlaid on the image using gradients for readability.

## Glossary

- **Pet Card**: A UI component that displays pet information in a card format
- **Text Overlay**: Text content displayed on top of an image with a semi-transparent background
- **Gradient Overlay**: A semi-transparent gradient layer applied over an image to improve text readability
- **Swipe Interface**: A gesture-based interface where users can swipe cards left or right
- **Status Badge**: A visual indicator showing pet availability status
- **Verification Badge**: An icon indicating verified seller status
- **Action Buttons**: Interactive buttons at the bottom of the card for user actions

## Requirements

### Requirement 1: Full Image Display

**User Story:** As a user browsing pets, I want to see large, full-card images of pets, so that I can better appreciate their appearance and make informed decisions.

#### Acceptance Criteria

1. WHEN the Pet Card renders, THE System SHALL display the pet's primary image covering the entire card area
2. WHEN no image is available, THE System SHALL display a placeholder image with appropriate messaging
3. THE System SHALL maintain a 4:5 aspect ratio for the card to ensure consistent display across devices
4. THE System SHALL apply rounded corners (20px radius) to the card for modern aesthetics
5. THE System SHALL use "cover" resize mode to ensure images fill the entire card without distortion

### Requirement 2: Text Overlay with Gradient

**User Story:** As a user viewing pet cards, I want pet information displayed clearly over the image, so that I can read details without the image being obscured.

#### Acceptance Criteria

1. THE System SHALL apply a linear gradient overlay from transparent (top) to semi-transparent black (bottom) over the pet image
2. THE System SHALL position all text content in the bottom third of the card over the gradient
3. WHEN text is rendered over the image, THE System SHALL use white color with appropriate shadow for maximum readability
4. THE System SHALL ensure the gradient opacity allows the image to remain visible while text stays readable
5. THE System SHALL use font weights of 700 or higher for primary text elements to enhance readability

### Requirement 3: Pet Information Display

**User Story:** As a user, I want to see essential pet information (name, age, location, status) on the card, so that I can quickly evaluate if the pet matches my preferences.

#### Acceptance Criteria

1. THE System SHALL display the pet name as the primary heading with font size 28px and weight 800
2. THE System SHALL display the pet age next to the name with a verification badge icon if applicable
3. THE System SHALL display the pet location with a home icon and distance information
4. THE System SHALL display an availability status badge (green dot + text) at the top of the text overlay
5. THE System SHALL limit location text to a single line with ellipsis for overflow

### Requirement 4: Status and Verification Badges

**User Story:** As a user, I want to see visual indicators for pet availability and seller verification, so that I can trust the listing and know if the pet is still available.

#### Acceptance Criteria

1. WHEN a pet is available, THE System SHALL display a green dot indicator with "Có hoạt động gần đây" text
2. WHEN a seller is verified, THE System SHALL display a blue checkmark badge next to the pet age
3. THE System SHALL position the availability status at the top-left of the text overlay section
4. THE System SHALL render badges with appropriate spacing and sizing for mobile devices
5. THE System SHALL use consistent badge styling across all pet cards

### Requirement 5: Action Buttons

**User Story:** As a user interacting with pet cards, I want quick access to actions (back, close, favorite, like, share), so that I can efficiently navigate and interact with listings.

#### Acceptance Criteria

1. THE System SHALL display five circular action buttons at the bottom of the card
2. THE System SHALL render buttons with white background, 60px diameter, and appropriate icons
3. THE System SHALL position buttons in a horizontal row with equal spacing
4. WHEN a user taps an action button, THE System SHALL execute the corresponding action (back, close, favorite, like, share)
5. THE System SHALL provide visual feedback (opacity change) when buttons are pressed

### Requirement 6: Responsive Layout

**User Story:** As a user on different devices, I want the pet card to display correctly on my screen size, so that I have a consistent experience regardless of device.

#### Acceptance Criteria

1. THE System SHALL calculate card dimensions based on screen width minus 32px horizontal margin
2. THE System SHALL maintain the 4:5 aspect ratio across all screen sizes
3. THE System SHALL ensure text remains readable on screens from 320px to 428px width
4. THE System SHALL scale font sizes proportionally for smaller screens if needed
5. THE System SHALL ensure action buttons remain accessible and tappable (minimum 44px touch target)

### Requirement 7: Image Loading and Error Handling

**User Story:** As a user, I want smooth image loading with appropriate placeholders, so that I have a good experience even with slow network connections.

#### Acceptance Criteria

1. WHEN an image is loading, THE System SHALL display a loading indicator or placeholder
2. WHEN an image fails to load, THE System SHALL display a fallback placeholder with "No Image" text
3. THE System SHALL cache loaded images to improve performance on subsequent views
4. THE System SHALL use progressive image loading for large images
5. THE System SHALL handle missing or invalid image URLs gracefully without crashing

### Requirement 8: Accessibility

**User Story:** As a user with accessibility needs, I want the pet card to be accessible, so that I can use the app effectively with assistive technologies.

#### Acceptance Criteria

1. THE System SHALL provide accessible labels for all interactive elements
2. THE System SHALL ensure text contrast ratios meet WCAG AA standards (4.5:1 minimum)
3. THE System SHALL support screen reader announcements for pet information
4. THE System SHALL ensure action buttons have minimum 44x44px touch targets
5. THE System SHALL provide alternative text for pet images

### Requirement 9: Animation and Transitions

**User Story:** As a user swiping through pet cards, I want smooth animations, so that the interface feels polished and responsive.

#### Acceptance Criteria

1. WHEN a card is pressed, THE System SHALL reduce opacity to 0.9 within 100ms
2. WHEN a card is released, THE System SHALL restore opacity to 1.0 within 100ms
3. THE System SHALL apply smooth transitions to all interactive elements
4. THE System SHALL ensure animations do not impact scrolling performance
5. THE System SHALL use native driver for animations where possible

### Requirement 10: Integration with Existing Features

**User Story:** As a developer, I want the new card design to work with existing features (likes, favorites, navigation), so that functionality is preserved.

#### Acceptance Criteria

1. WHEN a user taps the card, THE System SHALL navigate to the pet detail screen
2. WHEN a user taps the heart button, THE System SHALL toggle the favorite status
3. WHEN a user taps the star button, THE System SHALL add the pet to their saved list
4. WHEN a user taps the share button, THE System SHALL open the native share dialog
5. THE System SHALL maintain compatibility with the existing Pet type interface
