# Flappy Snake - Retro Arcade Game

## Overview

Flappy Snake is a browser-based arcade game that merges mechanics from Flappy Bird and Snake. Players control a snake through an endless, scrolling world, avoiding diverse obstacles, collecting bugs for points, and utilizing power-ups. The game features 50 levels across 5 themed worlds, progressive difficulty, and special maze challenges. It's built as a full-stack TypeScript project with a React frontend and an Express backend, though the primary focus is on client-side game logic and a future-proof architecture for monetization and mobile deployment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React 18** and TypeScript, using **Vite** for bundling. Styling is managed with **TailwindCSS** and **Radix UI** for accessible components. Game rendering uses the HTML5 Canvas API with `requestAnimationFrame` for smooth 60fps gameplay. State management is handled by **Zustand** stores, separating core game state, game phase, audio, and ad integration.

### Backend Architecture

The backend utilizes **Express.js** as a REST API server, with middleware for JSON parsing, URL encoding, request logging, and error handling. It's configured for both development (Vite HMR integration) and production (static file serving). An interface-based design for storage (`IStorage`) allows for swapping between the current in-memory implementation (`MemStorage`) and a prepared database-backed solution using Drizzle ORM. API routes follow a `/api` convention.

### Core Features & Design Patterns

- **50-Level World System**: Progression through 5 themed worlds with unique visuals and escalating difficulty.
- **Enhanced Maze System**: World-specific maze complexity, integrated into the scrolling world every few levels.
- **Distance-Based Progression**: Leveling up is tied to meters traveled, with gradual snake speed increases.
- **Dynamic Obstacles**: Includes chasing insects, Mario-style Piranha Plant cacti, and environment-specific obstacles (fish, flames).
- **Power-Ups**: Shield, Ice, and Speed power-ups for varied gameplay.
- **Special Bonus Scenes**: Golden pipes trigger bonus stages with increased power-up spawns.
- **Progressive Difficulty**: Pipe gaps shrink and obstacle behavior intensifies with level progression.
- **Monetization Architecture**: Built-in ad placement points for banner, interstitial, and rewarded ads, with platform detection for web (AdSense placeholder) and native mobile (AdMob integration via Capacitor).
- **Mobile Touch Controls**: Tap-to-flap, virtual joystick, visual overlays, and responsive scaling for mobile devices.

## External Dependencies

- **Database**:
    - **Drizzle ORM** for PostgreSQL (prepared, currently using in-memory storage).
    - **Neon Database** serverless PostgreSQL driver.
    - **drizzle-zod** for Zod schema generation from Drizzle tables.
- **UI & Styling**:
    - **Radix UI**: Accessible component primitives.
    - **TailwindCSS**: Utility-first CSS framework.
    - **class-variance-authority**, **clsx**, **tailwind-merge**: For conditional styling and variant management.
    - **cmdk**: Command palette functionality.
    - **lucide-react**: Icon components.
- **State Management**:
    - **Zustand**: Lightweight global state management.
    - **TanStack Query (React Query)**: For server state management and data fetching.
- **Validation & Type Safety**:
    - **Zod**: Runtime schema validation.
- **Mobile & Monetization (Planned/Prepared)**:
    - **Capacitor**: For wrapping web app as native Android app.
    - **@capacitor-community/admob**: For Google AdMob integration.
- **Fonts & Assets**:
    - **@fontsource/inter**: Web font loading.
    - Asset handling for 3D models (`.gltf`, `.glb`) and audio files (`.mp3`, `.ogg`, `.wav`).
- **Development Tools**:
    - **tsx**: TypeScript execution in development.
    - **@replit/vite-plugin-runtime-error-modal**: Replit-specific error overlay.
- **Session Management (Prepared)**:
    - **connect-pg-simple**: For PostgreSQL session storage.
    - **express-session**: For user sessions (not actively used in current game logic).