# CityFix

CityFix is an urban issue reporting and management platform comprising a mobile application for citizens and a web dashboard for administrators and management.

## Project Structure

```
cityfix/
├── mobile/                   # React Native Mobile App
│   ├── assets/               # Images, fonts, and static resources
│   ├── src/                  # Source code
│   │   ├── api/              # API endpoints and HTTP services
│   │   ├── components/       # Reusable UI components
│   │   ├── constants/        # App constants, colors, theme
│   │   ├── hooks/            # Custom React hooks
│   │   ├── navigation/       # Navigation stacks & tabs
│   │   ├── screens/          # Screen views (Home, Report, Profile, etc.)
│   │   ├── store/            # State management
│   │   ├── types/            # TypeScript types & interfaces
│   │   └── utils/            # Helper functions & utilities
│   ├── App.tsx               # Entry application component
│   └── package.json
│
├── web/                      # React + Vite Web Application
│   ├── public/               # Static assets
│   ├── src/                  # Source code
│   │   ├── assets/           # Dynamic assets (SVGs, images)
│   │   ├── components/       # UI components (Buttons, Tables, Modals)
│   │   ├── config/           # App configuration
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # Page layouts (MainLayout, AuthLayout)
│   │   ├── pages/            # View pages (HomePage, Dashboard, etc.)
│   │   ├── routes/           # Routing configuration
│   │   ├── services/         # API HTTP services
│   │   ├── store/            # State management
│   │   ├── types/            # TypeScript interfaces & types
│   │   └── utils/            # Helper functions
│   ├── index.html            # Vite HTML template
│   ├── App.tsx               # Root React component
│   ├── main.tsx              # Entry mounting script
│   └── vite.config.ts        # Vite configuration
│
├── shared/                   # Shared TypeScript models and utilities
│   └── types/                # Core domain types (User, Issue, etc.)
│
└── package.json              # Root package script runner
```

## Quick Start

### Running from Root
- **Web App**: `npm run dev:web`
- **Mobile App**: `npm run start:mobile`

### Running from Subfolders
- **Web App**:
  ```bash
  cd web
  npm install
  npm run dev
  ```
- **Mobile App**:
  ```bash
  cd mobile
  npm install
  npm start
  ```
