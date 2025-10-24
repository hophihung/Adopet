# AdoPet - Folder Structure

## 📁 Project Structure

```
AdoPet/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth routes group
│   └── (tabs)/                   # Tab navigation routes
│
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── common/              # Shared components (Button, Card, etc.)
│   │   ├── forms/               # Form-specific components
│   │   ├── layout/              # Layout components (Header, Footer, etc.)
│   │   └── ui/                  # Base UI primitives
│   │
│   ├── features/                # Feature-based modules
│   │   ├── auth/
│   │   │   ├── components/      # Auth-specific components
│   │   │   ├── hooks/           # Auth-related hooks
│   │   │   ├── services/        # Auth API calls
│   │   │   └── types/           # Auth TypeScript types
│   │   ├── pets/
│   │   ├── adoption/
│   │   └── profile/
│   │
│   ├── services/                # Core services
│   │   ├── api/                 # API client & interceptors
│   │   ├── storage/             # AsyncStorage, SecureStore
│   │   └── notifications/       # Push notifications
│   │
│   ├── store/                   # State management
│   │   └── slices/              # Redux/Zustand slices
│   │
│   ├── navigation/              # Navigation config
│   │
│   ├── utils/                   # Utility functions
│   │   ├── validators/          # Validation functions
│   │   ├── formatters/          # Data formatters
│   │   └── helpers/             # General helpers
│   │
│   ├── types/                   # TypeScript definitions
│   │   ├── api/                 # API response types
│   │   └── models/              # Domain models
│   │
│   ├── constants/               # App constants
│   ├── styles/                  # Global styles
│   ├── theme/                   # Theme config (colors, fonts, etc.)
│   └── config/                  # App configuration
│
├── assets/                      # Static assets (images, fonts)
├── contexts/                    # React contexts
├── hooks/                       # Global custom hooks
├── lib/                         # Third-party integrations
├── supabase/                    # Supabase config & migrations
│
├── __tests__/                   # Tests
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── __mocks__/               # Test mocks
│
└── ...config files

```

## 🎯 Key Principles

### 1. **Feature-First Architecture**
- Each feature is self-contained with its own components, hooks, services, and types
- Promotes modularity and maintainability

### 2. **Component Organization**
- `common/`: Shared, reusable components (Button, Card, Modal)
- `forms/`: Form-specific components (Input, Checkbox, FormField)
- `layout/`: Layout components (Header, TabBar, Container)
- `ui/`: Base primitives (Text, View wrappers with theme)

### 3. **Separation of Concerns**
- Services handle API calls and external integrations
- Hooks handle business logic and state
- Components focus on presentation
- Types ensure type safety across the app

### 4. **Scalability**
- Easy to add new features without affecting existing code
- Clear import paths and barrel exports
- Organized tests mirror source structure

## 📝 Usage Examples

```typescript
// Import from features
import { LoginForm } from '@/features/auth/components';
import { useAuth } from '@/features/auth/hooks';

// Import from components
import { Button, Card } from '@/components';

// Import from services
import { api } from '@/services/api';

// Import types
import type { Pet, User } from '@/types/models';
```

## 🔧 Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/features/*"],
      "@services/*": ["./src/services/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"],
      "@hooks/*": ["./hooks/*"],
      "@assets/*": ["./assets/*"]
    }
  }
}
```

