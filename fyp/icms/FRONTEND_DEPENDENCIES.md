# ICMS Frontend Dependencies

## Production Dependencies

### Core Framework & Routing
- **react** (^19.2.4): React library for building the UI
- **react-dom** (^19.2.4): React DOM rendering for browser
- **react-router-dom** (^7.14.0): Client-side routing and navigation

### State Management
- **zustand** (^5.0.12): Lightweight state management library with persistence support
  - Used for: Auth state (token, user), data caching, UI state, notifications

### HTTP & API Communication
- **axios** (^1.14.0): HTTP client for API requests with request/response interceptors

### Data Handling
- **papaparse** (^5.5.3): CSV parsing and conversion utility
- **xlsx** (^0.18.5): Excel file reading and parsing

### Visualization
- **plotly.js** (^3.5.0): Plotly visualization library (charts, plots, heatmaps)
- **react-plotly.js** (^2.6.0): React wrapper for Plotly charts
- **three** (^0.183.2): 3D graphics library (used for advanced visualizations)

### Animation & UI
- **framer-motion** (^12.38.0): Animation and motion library for smooth UI transitions

### Styling
- **tailwindcss** (4.2.2): Utility-first CSS framework (in devDependencies)

## Development Dependencies

### Build Tools
- **vite** (^8.0.1): Modern frontend build tool and dev server
- **@vitejs/plugin-react** (^6.0.1): Vite plugin for React Fast Refresh

### Linting & Code Quality
- **eslint** (^9.39.4): JavaScript linter for code quality
- **@eslint/js** (^9.39.4): ESLint rules library
- **eslint-plugin-react-hooks** (^7.0.1): ESLint plugin for React Hooks rules
- **eslint-plugin-react-refresh** (^0.5.2): ESLint plugin for Fast Refresh

### CSS & Styling
- **tailwindcss** (^4.2.2): Utility-first CSS framework
- **@tailwindcss/vite** (^4.2.2): Tailwind CSS Vite plugin
- **postcss** (^8.5.8): CSS transformations tool
- **autoprefixer** (^10.4.27): PostCSS plugin for vendor prefixes

### Type Checking
- **@types/react** (^19.2.14): TypeScript types for React
- **@types/react-dom** (^19.2.3): TypeScript types for React DOM

### Utilities
- **globals** (^17.4.0): Global constants for ESLint

## Installation & Usage

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Architecture Notes

### State Management (Zustand)
- **Auth Store**: JWT token and user object with localStorage persistence
- **Data Store**: Projects, datasets, jobs, results with API caching
- **UI Store**: Modals, sidebar, theme preferences
- **Notifications Store**: Toast messages with auto-dismiss

### API Integration (Axios)
- Baseurl: `http://127.0.0.1:8000` (configurable via `VITE_API_BASE_URL`)
- JWT token automatically added to all requests
- Error handling and response transformation

### Visualization (Plotly + Three.js)
- EDA charts: Histograms, boxplots, correlation heatmaps
- Model detail: Confusion matrix, residual plots, SHAP features
- Advanced 3D visualizations: Optional Three.js integration

### Build Optimization
- Vite provides fast HMR (Hot Module Replacement) during development
- Optimized production builds with code splitting
- Tailwind CSS purges unused styles in production

## Common Issues & Solutions

### Port Already in Use
- Vite defaults to port 5173, use `npm run dev -- --port 5174` if busy

### API Connection Issues
- Check `VITE_API_BASE_URL` environment variable
- Verify backend is running on http://127.0.0.1:8000
- Check CORS configuration in backend

### State Persistence
- Auth state persists to localStorage (survives page refreshes)
- UI preferences (sidebar, theme) also persisted
- Data/results caching is runtime-only (cleared on refresh)

## Environment Variables

Create `.env.development` or `.env.production`:

```env
# API base URL (no trailing slash)
VITE_API_BASE_URL=http://127.0.0.1:8000

# Or use defaults (empty = localhost:8000)
# VITE_API_BASE_URL=
```

