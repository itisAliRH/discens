# Internationalization (i18n) Implementation

## Overview
Discens now supports multiple languages using `next-intl` with English and German translations.

## Features Implemented

### 1. **Core Configuration**
- **Library**: `next-intl` v4.8.1
- **Supported Languages**: English (`en`), German (`de`)
- **Default Language**: English
- **URL Structure**: `as-needed` prefix (English has clean URLs like `/dashboard`, German uses `/de/dashboard`)

### 2. **File Structure**
```
src/i18n/
├── config.ts           # Locale configuration and types
├── request.ts          # Next-intl request handler
└── messages/
    ├── en.json        # English translations
    └── de.json        # German translations
```

### 3. **App Structure**
The app directory has been restructured to support locale-based routing:

```
src/app/
├── [locale]/          # Locale-dynamic segment
│   ├── layout.tsx     # Locale-specific layout with NextIntlClientProvider
│   ├── page.tsx       # Home redirect
│   ├── (auth)/        # Auth routes (login, forgot-password, reset-password)
│   ├── (main)/        # Main app routes (dashboard, learn, review, etc.)
│   └── onboarding/    # Onboarding flow
├── api/               # API routes (no locale needed)
├── layout.tsx         # Root layout
└── page.tsx           # Root redirect
```

### 4. **Middleware**
- **File**: `middleware.ts`
- **Functions**:
  - Handles locale detection and routing
  - Manages Supabase session updates
  - Protects authenticated routes

### 5. **Translation Coverage**

#### Common
- Loading states, buttons, actions
- Confirm/cancel dialogs
- Error/success messages

#### Authentication
- Login, sign-up flows
- Forgot password
- Reset password
- OAuth options

#### Dashboard
- Welcome messages
- Stats cards (streak, accuracy, time spent)
- Quick actions
- Recent activity

#### Learning Features
- **Learn**: Quiz generation, questions, answers, results
- **Review**: Flashcards, difficulty ratings, progress
- **Memory**: Material management, import wizard
- **Conversation**: Chat interface, sessions
- **History**: Activity log, filters, statistics

#### Profile
- Personal information
- Preferences (theme, language, notifications)
- Quiz settings
- Profile photo management

#### Gamification
- Badges and achievements
- Streak tracking
- Level progress

### 6. **Components**

#### Language Selector
- **Location**: Top navigation bar
- **Functionality**: 
  - Dropdown with flag icons
  - Switches between English and German
  - Updates URL and reloads page with new locale
- **File**: `src/components/ui/LanguageSelector.tsx`

### 7. **Next.js Configuration**
Updated `next.config.ts`:
```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  // ... other config
};

export default withNextIntl(nextConfig);
```

## Usage in Components

### Server Components
```typescript
import { useTranslations } from 'next-intl';

export default function MyPage() {
  const t = useTranslations('dashboard');
  
  return (
    <h1>{t('title')}</h1>
  );
}
```

### Client Components
```typescript
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('common');
  
  return (
    <button>{t('save')}</button>
  );
}
```

### With Parameters
```typescript
const t = useTranslations('dashboard');

// Translation: "Welcome back, {name}!"
<h2>{t('welcome', { name: user.full_name })}</h2>
```

## TODO: Update Existing Components

The following components still need to be updated to use translations:

### Pages
- [ ] `/[locale]/(auth)/login/page.tsx`
- [ ] `/[locale]/(auth)/forgot-password/page.tsx`
- [ ] `/[locale]/(auth)/reset-password/page.tsx`
- [ ] `/[locale]/(main)/dashboard/page.tsx`
- [ ] `/[locale]/(main)/learn/page.tsx`
- [ ] `/[locale]/(main)/review/page.tsx`
- [ ] `/[locale]/(main)/memory/page.tsx`
- [ ] `/[locale]/(main)/conversation/page.tsx`
- [ ] `/[locale]/(main)/history/page.tsx`
- [ ] `/[locale]/(main)/profile/page.tsx`
- [ ] `/[locale]/(main)/profile/edit/page.tsx`
- [ ] `/[locale]/onboarding/page.tsx`

### UI Components
- [ ] `src/components/ui/UserMenu.tsx`
- [ ] `src/components/ui/ThemeToggle.tsx`
- [ ] `src/app/[locale]/(main)/layout.tsx` (navigation labels)

## Adding New Translations

1. Add the key to both `en.json` and `de.json`
2. Use the translation in your component with `useTranslations()`
3. Test both languages

Example:
```json
// en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}

// de.json
{
  "myFeature": {
    "title": "Meine Funktion",
    "description": "Das ist meine Funktion"
  }
}
```

## Adding New Languages

1. Add the language code to `src/i18n/config.ts`:
   ```typescript
   export const locales = ['en', 'de', 'fr'] as const;
   export const localeNames: Record<Locale, string> = {
     en: 'English',
     de: 'Deutsch',
     fr: 'Français',
   };
   ```

2. Create a new translation file: `src/i18n/messages/fr.json`

3. Copy the structure from `en.json` and translate all strings

4. Update the language selector component if needed

## Testing

- Navigate to different routes and verify URLs
- Switch languages using the language selector
- Check that all static text is translated
- Verify dynamic content (with parameters) works correctly
- Test with both server and client components

## Notes

- API routes do NOT use locale routing
- Locale is automatically detected from the URL
- The default locale (English) uses clean URLs without `/en` prefix
- Other locales show the prefix (e.g., `/de/dashboard`)
- The middleware handles locale detection and routing automatically
