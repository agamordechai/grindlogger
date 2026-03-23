# GrindLogger — Feature TODO

## Core Platform
- [X] **Authentication** — Email/password registration and login with JWT tokens
- [X] **OAuth sign-in** — Google, GitHub, Discord, and Reddit OAuth providers
- [X] **Exercise CRUD** — Create, edit, delete exercises with inline editing
- [X] **Exercise archive** — Soft-delete with restore, permanent delete, and archive modal
- [X] **Seed data** — One-click starter routines (PPL, AB, Full Body)
- [X] **Admin dashboard** — User management, system stats, role editing, disable/delete users

## Workout Tracking Enhancements
- [X] **Rest timer** — Countdown timer with presets, audio chime, vibration, and native notifications
- [X] **Dashboard stats** — Total exercises, total sets, and volume calculations
- [X] **Volume chart** — Bar chart showing volume distribution by workout day
- [X] **Split distribution** — Donut chart showing exercise count per day
- [X] **Day filtering** — Filter exercises by workout day with count badges
- [X] **Bodyweight tracking** — Store bodyweight, use in volume calculations for BW exercises
- [ ] **Workout history/logging** — Record completed workouts with actual sets/reps/weight per session
- [ ] **Progress charts** — Visualize weight/volume progression over time per exercise
- [ ] **Personal records (PRs)** — Automatically detect and celebrate new 1RM estimates or volume PRs
- [ ] **Superset / circuit grouping** — Group exercises that are performed back-to-back
- [ ] **Exercise notes** — Per-exercise or per-session free-text notes

## AI Coach
- [X] **AI chat** — Conversation-based coaching with workout context awareness
- [X] **Chat history persistence** — Save conversations to Redis (14-day TTL, auto-eviction)
- [X] **Workout generator** — AI-powered custom routine generation
- [X] **Progress analysis** — Muscle balance scoring, strengths/weaknesses, recommendations
- [ ] **Progressive overload suggestions** — AI analyzes logged history and recommends when to increase weight/volume
- [ ] **Form tips** — Exercise-specific technique cues

## Social & Motivation
- [ ] **Streak tracking** — Track consecutive workout days/weeks with visual indicators
- [ ] **Workout sharing** — Generate shareable links or images of routines
- [ ] **Leaderboard** — Opt-in community stats (total volume, consistency, etc.)

## Quality of Life
- [X] **Dark/light theme toggle** — User-selectable theme
- [X] **PWA / mobile install** — Manifest + service worker for mobile app experience
- [X] **Workout templates** — Save and load full routines with duplicate detection and override
- [X] **Exercise library** — Searchable database of exercises with muscle group tags
- [X] **Units preference** — kg/lbs toggle with automatic conversion
- [X] **Disable mobile zoom** — Prevent pinch-to-zoom for native app feel
- [X] **Restore last page** — Auto-navigate to last visited page within 30 minutes
- [X] **Responsive mobile UI** — Bottom nav, three-dot menu, mobile-first layouts
- [X] **Skeleton loaders** — Loading states with shimmer animations
- [X] **Page transitions** — Framer Motion animations throughout the app
- [X] **Styled modals** — Custom modal dialogs replacing native browser dialogs
- [X] **Settings page** — Profile editing, theme, units, bodyweight, API key management
- [ ] **Notifications/reminders** — Remind users to work out on scheduled days

## Data & Integration
- [ ] **Import from other apps** — Import workout data from Strong, JEFIT, or other common CSV formats
- [ ] **Body measurements tracking** — Weight, body fat %, measurements over time
- [ ] **Webhook/Zapier integration** — Trigger external actions on workout completion
