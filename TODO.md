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
- [X] **Workout history/logging** — Record completed workouts with actual sets/reps/weight per session, auto-log on exercise edits, edit/delete sessions, mark day complete for streaks
- [X] **Progress charts** — Visualize weight/volume/1RM progression over time, grouped by workout day with color-coded exercises
- [ ] **Personal records (PRs)** — Automatically detect and celebrate new 1RM estimates or volume PRs
- [X] **Superset / circuit grouping** — Group exercises that are performed back-to-back
- [X] **Exercise notes** — Per-exercise notes (cues, reminders) and per-session free-text notes
- [X] **Exercise variant tracking** — Link exercise variations (Barbell Bench → Dumbbell Bench → Machine Bench) and compare progression across variants
- [X] **Advanced set types** — Toggle sets as warm-up, drop-set, AMRAP, or failure

## AI Coach
- [X] **AI chat** — Conversation-based coaching with workout context awareness
- [X] **Chat history persistence** — Save conversations to Redis (14-day TTL, auto-eviction)
- [X] **Workout generator** — AI-powered custom routine generation
- [X] **Progress analysis** — Muscle balance scoring, strengths/weaknesses, recommendations
- [X] **AI actions via API** — Let the coach perform actions on behalf of the user (bulk-add measurements, create/modify exercises, log workouts)
- [X] **Custom routine generation** — AI creates unique, personalized workout routine templates based on goals, equipment, and schedule
- [X] **Progressive overload suggestions** — AI analyzes logged history and recommends when to increase weight/volume
- [ ] **Server-side AI API key storage** — Move AI coach API keys from localStorage to encrypted server-side storage
- [ ] **Form tips** — Exercise-specific technique cues
### AI Coach - Advanced
- [ ] **Auto-program design** *(low priority)* — AI periodizes training automatically (linear progression, wave loading, etc.)
- [ ] **Injury risk assessment** — AI monitors for exercise patterns that might indicate injury risk
- [ ] **Plateau breaker** — Suggest exercise swaps when progress stalls on lifts
- [ ] **AI volume load distribution** — Show optimal muscle group volume ranges and where you deviate
- [ ] **Goal auto-tracking** — Set goals (deadlift 405, lose 10 lbs) and auto-update progress percentage

## Social & Motivation
- [X] **Weekly workout trend** — 4-week workout frequency trend with visual bar chart
- [ ] **Workout sharing** — Generate shareable links or images of routines
- [ ] **Leaderboard** — Opt-in community stats (total volume, consistency, etc.)
- [ ] **Anonymous stats comparison** — See how you rank vs similar users without exposing identity

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
- [x] **Body measurements tracking** — Weight, body fat %, measurements over time
- [ ] **Webhook/Zapier integration** — Trigger external actions on workout completion
- [ ] **Apple Health / Health Connect** — Bi-directional sync for bodyweight, active energy, and workout durations
- [ ] **Data export** — Allow users to download all their history in CSV/JSON format
- [ ] **Smartwatch companion** — Apple Watch / Wear OS extension for logging sets and triggering timers from the wrist
- [ ] **Spotify integration** — Log which playlist was used for workouts, correlate with performance
- [x] **Calendar sync** — Sync workout schedule to Google Calendar (encrypted server-side token storage)
### Data & Integration - Advanced(after application deployment)
- [ ] **Offline mode** — Work out without internet, sync when reconnected
- [ ] **Wearable timers** — Send rest timers to connected smartwatches
- [ ] **Haptic feedback** — Phone vibrates on set completion reminders

