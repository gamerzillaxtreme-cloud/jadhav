# Flappy Snake - Retro Arcade Game

## Overview

Flappy Snake is a browser-based arcade game that combines elements of Flappy Bird and Snake mechanics. The game features a snake that players control through an endless scrolling world, avoiding obstacles (pipes, spikes, blobs, fireballs, animated cacti), collecting bugs for points, and gathering power-ups (magnet, ghost, shrink, shooter) to enhance gameplay. The application is built as a full-stack TypeScript project with a React frontend and Express backend, though the current implementation focuses primarily on client-side game logic.

## Recent Features (Latest Update - November 2025)

**50-Level World System (Latest)**
- Complete progression through 5 themed worlds (50 levels total):
  - **Forest World** (Levels 1-10): Green environment, basic obstacles, introduces rotating obstacles
  - **Rocky Mountains** (Levels 11-20): Gray rocky terrain, moving pipes, falling rocks, enemies appear
  - **Desert** (Levels 21-30): Sandy landscape, sliding pipes, all obstacle types active
  - **Ice World** (Levels 31-40): Frozen blue environment, maximum difficulty, icy surfaces
  - **Neon Cave** (Levels 41-50): Dark futuristic cave, neon colors, all mechanics enabled, highest difficulty
- Each world features unique background gradients, pipe colors, and obstacle palettes
- Difficulty scales progressively with formulas:
  - Scroll speed increases by 0.04 per level × world multiplier
  - Pipe gaps shrink by 0.7px per level (minimum 100px)
  - Enemy spawn chance increases after level 15
  - Maze complexity scales with level (0-5 complexity tiers)
- HUD displays current level and world name (e.g., "Level 15 - Rocky Mountains")
- World themes automatically transition as player progresses through level ranges

**Enhanced Maze System**
- Mazes now feature world-specific complexity based on current level
- Advanced maze mechanics (not yet fully implemented):
  - Multiple path branches for more strategic navigation
  - Fake exits that mislead players
  - Moving blocks within maze cells
  - Key-door mechanics requiring exploration
  - Complexity increases from 0 (simple paths) to 5 (complex multi-branch mazes)
- Maze spawning remains every 3 levels with smooth scrolling integration

**Distance-Based Progression System**
- Changed from score-based leveling to distance-based progression
- Level increases every 2000 meters traveled
- Distance displayed in HUD alongside score
- Reduced base snake speed from 4.5 to 3.0 for better early-game balance
- Snake speed gradually increases by 0.3 per level

**Chasing Insects (Level 6+)**
- New "chaser" obstacle type that spawns at level 6 and above
- Starts as stationary golden insect until snake approaches within 300 pixels
- Actively pursues snake when activated, turning red during chase
- Chases at speed 3.5, creating intense chase sequences
- Music tempo increases to 1.4x and volume increases during chase
- HUD displays "⚠️ BEING CHASED!" warning when active

**Special Bonus Scene Pipes (Level 5+)**
- Golden-colored special pipes spawn with 10% chance at level 5+
- Marked with star icon (⭐) to distinguish from regular pipes
- Entering special pipe triggers bonus scene mode
- Bonus scene spawns 3x more power-ups (higher spawn rate, max 3 at once)
- Collect 3 power-ups within bonus scene to exit successfully
- Death in bonus scene = game over (no respawn)
- Dedicated counter tracks power-ups collected within bonus scene

**Mario-Style Piranha Plant Cacti**
- Cacti redesigned to resemble Mario Piranha Plants
- Base positioned at pipe top with stem extending upward
- Proper collision detection for both snake contact and shooter projectiles
- Cacti cause instant death unless protected by shield or snake length ≥ 20

**Progressive Difficulty**
- Pipe gaps reduce by 8px per level (minimum 120px)
- Creates increasingly challenging navigation as game progresses

**Maze Challenges (Every 3 Levels)**
- Maze puzzles spawn at levels 3, 6, 9, etc.
- Mazes appear in the scrolling world (like pipes) at a specific position
- 10x10 maze with entry at top-left and exit at bottom-right
- Pipes hidden while maze is active
- Same game environment/background continues
- Navigate snake through maze using normal controls
- Reaching exit awards +200 points and clears maze
- Visual feedback: green entry cell, glowing yellow star exit

**Special Pipe Integration**
- Fixed collision bug - special pipes can now be entered safely
- Entering grants 10-second shooter power-up
- Prepares snake for upcoming boss battles

**Large Snake Ability**
- Snakes with length ≥20 can destroy obstacles on contact
- Awards 20 points per destroyed obstacle
- Can bite boss head for 2x damage in boss battles
- Creates particle effects on destruction

**Environment System**
- Three themed environments that change based on level progress:
  - **Jungle** (Levels 1-4): Green pipes, standard obstacles
  - **Water** (Levels 5-8): Blue underwater theme with swimming fish obstacles
  - **Fire** (Levels 9+): Red/orange volcanic theme with flame-shooting cacti
- Each environment has unique visual style and background colors
- Environment-specific obstacles spawn only in their respective environments

**New Obstacles**
- **Fish** (Water environment): Swim horizontally across the screen, move up/down slightly
- **Flames** (Fire environment): Shot from cacti, rise upward diagonally

**New Power-Ups**
- **Shield** (⬟): Protects snake from obstacles - any collision destroys the obstacle instead of killing the snake
- **Ice** (❄): Slows down all moving obstacles by 50% for easier navigation
- **Speed** (⚡): Boosts snake movement speed by 50% for quick escapes
- All power-ups last 5 seconds and show remaining time in HUD

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server
- **TailwindCSS** for styling with a custom design system using CSS variables for theming
- **Radix UI** component library for accessible UI primitives

**Game Rendering**
- Canvas-based 2D game rendering using the HTML5 Canvas API
- Game loop implemented with `requestAnimationFrame` for smooth 60fps gameplay
- State management handled through Zustand stores for reactive game state

**State Management Pattern**
- **Zustand** stores for global state management
  - `useFlappySnake`: Core game state (snake position, obstacles, score, combos, power-ups)
  - `useGame`: Game phase management (ready/playing/ended states)
  - `useAudio`: Sound effect management and mute state
- Separation of concerns: game logic state separate from UI state

**Client-Side Routing**
- Single-page application architecture
- All game logic runs client-side with no backend dependencies for gameplay
- Static file serving for production builds

### Backend Architecture

**Server Framework**
- **Express.js** REST API server
- Middleware for JSON parsing and URL encoding
- Request logging middleware with duration tracking
- Error handling middleware for centralized error responses

**Development vs Production**
- Development: Vite middleware integration for HMR (Hot Module Reload)
- Production: Static file serving from compiled dist directory
- Build process uses esbuild for server bundling and Vite for client bundling

**Storage Layer**
- In-memory storage implementation (`MemStorage`) for development
- Interface-based design (`IStorage`) allows swapping to database-backed storage
- User management methods (getUser, getUserByUsername, createUser)
- Current implementation uses Map data structure for user storage

**API Design**
- Routes prefixed with `/api` convention
- HTTP server setup using Node's `http.createServer`
- Separation of route registration from server initialization

### External Dependencies

**Database**
- **Drizzle ORM** configured for PostgreSQL
- **Neon Database** serverless PostgreSQL driver (`@neondatabase/serverless`)
- Schema defined in `shared/schema.ts` with Zod validation
- Database migrations stored in `./migrations` directory
- Currently using in-memory storage; database integration prepared but not active

**UI Component Libraries**
- **Radix UI** primitives for 30+ accessible components (dialogs, dropdowns, tooltips, etc.)
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional className composition
- **cmdk** for command palette functionality
- **lucide-react** for icon components

**3D Graphics (Prepared but Not Used)**
- **React Three Fiber** (`@react-three/fiber`) - React renderer for Three.js
- **Drei** (`@react-three/drei`) - helpers and abstractions for R3F
- **Postprocessing** (`@react-three/postprocessing`) - post-processing effects
- **vite-plugin-glsl** for shader support
- Note: Game currently uses 2D Canvas rendering; 3D libraries present but unused

**Data Fetching**
- **TanStack Query** (React Query) for server state management
- Custom query function wrapper for API requests with credential handling
- Configured for no refetching by default (static game content)

**Type Safety & Validation**
- **Zod** for runtime schema validation
- **drizzle-zod** for generating Zod schemas from Drizzle tables
- Shared types between client and server via `shared/` directory

**Fonts & Assets**
- **@fontsource/inter** for web font loading
- Asset handling for 3D models (`.gltf`, `.glb`) and audio files (`.mp3`, `.ogg`, `.wav`)

**Development Tools**
- **tsx** for TypeScript execution in development
- **@replit/vite-plugin-runtime-error-modal** for error overlays in Replit environment
- TypeScript with strict mode enabled and ESNext module resolution

**Session Management (Configured but Not Active)**
- **connect-pg-simple** for PostgreSQL session storage
- **express-session** prepared for user sessions
- Not currently utilized in game implementation

## Monetization & Google Play Store Deployment

### Ad Integration for Mobile Deployment

This web-based game is currently optimized for browser play. To deploy to Google Play Store with ad integration, you'll need to:

**1. Convert to Mobile App**
- Use a framework like **Capacitor** or **Cordova** to wrap the web app as a native Android app
- Install Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/android`
- Initialize Capacitor: `npx cap init`
- Add Android platform: `npx cap add android`

**2. Integrate Google AdMob**
- Install AdMob plugin: `npm install @capacitor-community/admob`
- Register your app on [Google AdMob Console](https://apps.admob.com/)
- Get your App ID and Ad Unit IDs for different ad types

**3. Recommended Ad Placements**
The game UI has been structured to accommodate ads at key moments:

- **Interstitial Ads**: Show when game ends (after "GAME OVER" screen)
- **Rewarded Ads**: Offer to continue game or get power-ups in exchange for watching an ad
- **Banner Ads**: Display at the bottom during "ready" state (before starting game)
- Avoid ads during active gameplay to maintain user experience

**4. Sample Integration Code**
```typescript
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

// Initialize AdMob
await AdMob.initialize({
  requestTrackingAuthorization: true,
  initializeForTesting: true, // Set to false for production
});

// Show banner ad on ready screen
const bannerOptions: BannerAdOptions = {
  adId: 'YOUR_BANNER_AD_UNIT_ID',
  adSize: BannerAdSize.ADAPTIVE_BANNER,
  position: BannerAdPosition.BOTTOM_CENTER,
};
await AdMob.showBanner(bannerOptions);

// Show interstitial ad on game over
const interstitialOptions = {
  adId: 'YOUR_INTERSTITIAL_AD_UNIT_ID',
};
await AdMob.prepareInterstitial(interstitialOptions);
await AdMob.showInterstitial();
```

**5. Ad Placement Strategy**
- **Frequency**: Show interstitial ads every 2-3 game sessions to avoid annoying users
- **Timing**: Display ads during natural breaks (game over, level complete)
- **Rewarded Videos**: Offer optional rewards like extra lives or power-ups
- **Banner Ads**: Keep small and non-intrusive at screen edges

**6. Testing**
- Use AdMob test ad unit IDs during development
- Test on real Android devices to ensure proper ad display
- Monitor ad performance and user engagement metrics

**Note**: Ad integration requires a mobile app build. The current web version can be played directly in browsers without ads. For Google Play Store deployment, follow the Capacitor setup and AdMob integration steps above.