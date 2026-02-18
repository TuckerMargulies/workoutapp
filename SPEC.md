# Workout App — Technical Specification

**Version:** 0.1.0 (Alpha)  
**Date:** February 17, 2026  
**Status:** Functional prototype — all screens implemented, local-storage persistence

---

## 1. Product Overview

The Workout App generates a personalized workout on demand, the moment the user is ready to exercise. It factors in available time, location, equipment, exercise history, and user-defined goals to create a balanced routine from a pre-built exercise library.

**Core value proposition:** Tap "Workout Now" → set time, location, goals → receive a tailored workout → follow along exercise-by-exercise → done.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS + custom CSS variables | 4.x |
| Language | TypeScript | 5.x |
| Persistence | Browser localStorage (migration-ready) | — |
| Build / Dev | Turbopack (via Next.js) | — |
| Package Manager | npm | — |

**Planned additions:** Supabase or Firebase (auth + cloud DB), Vercel (hosting), React Native or Capacitor (iOS).

---

## 3. Project Structure

```
workout-app/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout (480px max-width container)
│   │   ├── page.tsx                # Screen 0: Home
│   │   ├── globals.css             # Global styles + CSS variables
│   │   ├── plan/page.tsx           # Screen 1a: Plan a Workout
│   │   ├── workout/page.tsx        # Screen 1b: Today's Workout
│   │   ├── exercise/page.tsx       # Screen 1c: Exercise (active)
│   │   ├── summary/page.tsx        # Screen 1d: Workout Summary
│   │   ├── planning/
│   │   │   ├── page.tsx            # Screen 2: Planning Hub
│   │   │   ├── library/page.tsx    # Screen 2a: Library (exercises + groups)
│   │   │   ├── breakdown/page.tsx  # Screen 2b: Breakdown (frequency sliders)
│   │   │   ├── goals/page.tsx      # Screen 2c: Specific Goals
│   │   │   └── locations/page.tsx  # Screen 2d: Locations & Equipment
│   │   ├── tracking/page.tsx       # Screen 3: Tracking
│   │   ├── settings/page.tsx       # Screen 4: App Settings (placeholder)
│   │   └── account/page.tsx        # Screen 5: Account (placeholder)
│   ├── components/                 # Shared components (empty — to be built)
│   ├── data/
│   │   ├── exercises.ts            # Seed data: 37 exercises, 11 workout groups
│   │   └── defaults.ts             # Default locations, equipment, breakdown prefs
│   └── lib/
│       ├── types.ts                # All TypeScript interfaces & type unions
│       ├── store.ts                # localStorage CRUD for all 5 databases
│       └── generateWorkout.ts      # Core workout generation algorithm
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 4. Data Model

### 4.1 Database 1A — Exercise Library

Each exercise record contains:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (e.g., `ex-squat`) |
| `name` | string | Display name |
| `bodyArea` | string | Target area: `lower body`, `upper body push`, `upper body pull`, `core`, `full body` |
| `type` | ExerciseType | `resistance` · `mobility` · `cardio` · `breath hold` · `agility` · `stability` · `rehabilitation` |
| `equipment` | string[] | Required equipment (empty = bodyweight) |
| `setting` | string | Required setting: `any`, `gym`, `outdoors`, `pool` |
| `timeBased` | boolean | `true` = timed exercise; `false` = rep-based |
| `defaultTimeSec` | number | Estimated total time in seconds (includes setup for cardio) |
| `defaultReps` | number | Goal reps (or approx reps for timed HIIT) |
| `defaultDistance` | string? | For cardio: e.g., "2-3 miles" |
| `timePerRepSec` | number | Seconds per rep estimate |
| `applications` | string[] | Goal tags: `back`, `shoulder`, `surf`, `breath hold`, `joints` |
| `description` | string | Movement description for the exercise detail view |
| `groupIds` | string[] | Which workout groups include this exercise |

**Current data:** 37 exercises across 7 exercise types.

### 4.2 Database 1B — Workout Groups

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (e.g., `grp-leg-day`) |
| `name` | string | Display name |
| `bodyAreas` | string[] | Aggregate body areas worked |
| `types` | ExerciseType[] | Exercise types in the group |
| `equipment` | string[] | All equipment needed across group members |
| `applications` | string[] | Goal tags for the group |
| `exerciseIds` | string[] | Ordered list of member exercise IDs |

**Current data:** 11 groups:

| Group | Members | Focus |
|---|---|---|
| Leg Day | 6 exercises | Lower body resistance |
| Upper Body Push | 4 exercises | Chest/shoulder resistance |
| Upper Body Pull | 3 exercises | Back/bicep resistance |
| McGill Big 3 | 4 exercises | Core stability, back pain |
| Foundation Training | 3 exercises | Mobility, back pain |
| Mobility & Stretching | 4 exercises | Joint mobility |
| Steady-State Cardio | 3 exercises | Treadmill, running, swimming |
| HIIT Circuit | 3 exercises | Burpees, climbers, jump rope |
| Breath Hold Training | 3 exercises | Static holds, box breathing |
| Surf Prep | 3 exercises | Pop-ups, paddling, balance |
| Work / No Floor | 4 exercises | Exercises requiring no mat/floor |

### 4.3 Database 2 — Workout Tracking

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique log ID |
| `date` | string (ISO) | Workout date |
| `totalTimeAllottedSec` | number | Time the user selected (after 90% cap) |
| `totalTimeElapsedSec` | number | Actual workout duration |
| `location` | string | Location name |
| `equipment` | string[] | Equipment used |
| `exercises` | WorkoutExerciseLog[] | Per-exercise results |

Each `WorkoutExerciseLog` contains: `exerciseId`, `exerciseName`, `timeSec`, `reps`, `timePerRepSec`, `completed`.

### 4.4 Database 3A — Breakdown Preferences

| Field | Type | Description |
|---|---|---|
| `type` | string | Exercise type or specific goal name |
| `frequency` | number | 1–7 (times per week) |
| `isSpecificGoal` | boolean | `true` = goal-directed; `false` = main type |

**Defaults:** Resistance 3x, Mobility 2x, Cardio 2x, Breath Hold 1x, Surf 1x, Shoulder 1x, Back 2x, Joints 1x.

### 4.5 Database 3B — Locations & Equipment

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique location ID |
| `name` | string | Display name |
| `available` | boolean | Whether location is active |
| `equipment` | Record<string, boolean> | Equipment → checked map |

**Default locations:** Home (kettlebells + mat), Gym (all equipment), Outdoors (mat), Travel (none), Work (none, disabled), Pool (none).

**Equipment universe:** free weights, kettlebells, machines, mat/floor, bands.

### 4.6 Transient State (localStorage)

| Key | Purpose |
|---|---|
| `workout_current_plan` | The active `WorkoutPlan` during a workout |
| `workout_current_idx` | Current exercise index (0-based) |

---

## 5. Screen-by-Screen Functionality

### 5.0 Home (`/`)

- Large centered circular **"Workout Now"** button → navigates to `/plan`
- Hamburger menu (☰) in top-right toggles a dropdown with links:
  - Planning → `/planning`
  - Tracking → `/tracking`
  - App Settings → `/settings`
  - Account → `/account`

### 5.1a Plan a Workout (`/plan`)

- **Time slider:** Range input, 5–90 minutes, step 5. Displays current value.
- **Location picker:** ◀/▶ scroll buttons cycle through available locations (filtered by `available: true`). Displays current location name.
- **Customize button:** Expands equipment checkbox list pre-populated from the selected location's defaults. Changes create an `equipOverride` that supersedes location defaults for this workout only.
- **Specific Goals:** Collapses to "Plan For Me" by default. Tapping expands checkboxes for `resistance`, `mobility`, `cardio`, plus all specific goals from DB 3A (breath hold, surf, shoulder, back, joints).
- **Start button:** Calls `generateWorkout()` with current selections, saves plan to localStorage, navigates to `/workout`.

### 5.1b Today's Workout (`/workout`)

- Displays bullet-point list of planned exercises with name and detail (time or sets×reps).
- Shows location, estimated total time, and exercise count.
- **Start Workout** button sets exercise index to 0 and navigates to `/exercise`.

### 5.1c Exercise Screen (`/exercise`)

- **Progress bar:** Fixed vertical bar on left edge showing `(currentExercise / totalExercises) × 100%`.
- **Exercise header:** Name + position indicator ("Exercise 3 of 8").
- **Time-based exercises:** Digital clock showing `elapsed / target`. Play/Pause and Stop buttons. Optional goal reps displayed.
- **Rep-based exercises:** Set counter ("Set 2 / 3") with reps-per-set display. "Log Set ✓" button increments set counter.
- **Next button (bottom-right):**
  - **Green** when exercise is complete (timer ≥ target, or all sets logged).
  - **Red** when incomplete.
  - On tap: records actual time spent on the exercise in the plan, advances to next exercise or navigates to `/summary` if last.
- **"Scroll down for details"** text: toggles a detail panel with exercise illustration placeholder (emoji), description, body area, and type.

### 5.1d Summary (`/summary`)

- Shows "Workout Complete!" header with location, total time, and date.
- Table listing each exercise with name, detail, and actual time.
- On mount: creates a `WorkoutLog` from the current plan, saves to DB 2, and clears the current plan from localStorage.
- **Done** button returns to home.

### 5.2 Planning Hub (`/planning`)

- 2×2 grid of navigation cards: Library, Breakdown, Specific Goals, Locations.
- Each card has an emoji icon and label, linking to the respective sub-screen.

### 5.2a Library (`/planning/library`)

- **Tab toggle:** "Exercise Library" (DB 1A) vs "Workout Library" (DB 1B).
- **Exercise tab:** Each exercise as an expandable card showing body area, type, equipment, setting, applications, and default reps/time. In edit mode, inline text inputs for name, type, and body area.
- **Workout tab:** Each group as an expandable card with types, body areas, and applications on the summary line. Expanded view shows member exercises with their details.
- **Edit Library** toggle button at bottom switches between view and edit modes.

### 5.2b Breakdown (`/planning/breakdown`)

- Frequency sliders (1–7x/week) for each main exercise type and each specific goal.
- Changes save immediately to DB 3A.
- Split into "main types" (resistance, mobility, cardio) and "specific goals" sections.

### 5.2c Specific Goals (`/planning/goals`)

- Checkbox + frequency slider for each goal type: breath hold, surf, shoulder, back, joints.
- Checking adds the goal to DB 3A with frequency 1; unchecking removes it entirely.
- Slider adjusts frequency (1–7x/week) for checked goals.

### 5.2d Locations & Equipment (`/planning/locations`)

- Left column: availability checkbox per location.
- Tapping a location name expands equipment checkboxes.
- Equipment list is dynamically constructed from `getAllEquipment()` (union of `ALL_EQUIPMENT` + any equipment values from DB 1A and 1B).
- **Add Custom Location** input at bottom creates a new location with all equipment unchecked.
- All changes save immediately to DB 3B.

### 5.3 Tracking (`/tracking`)

- Reverse-chronological list of past workouts from DB 2.
- Each row: date, short summary (first exercise name @ location), total minutes.
- Tapping expands to show each exercise with reps or time.

### 5.4 App Settings (`/settings`)

- Placeholder screen with two informational cards:
  - "Display & Tracking" — future options for workout screen appearance.
  - "Uploads & Sync" — future data sync options.
- No functional controls yet.

### 5.5 Account (`/account`)

- Editable name and email fields (local state only, not persisted).
- Read-only password field with "Change Password" button (non-functional).
- Subscription tiers placeholder.
- Credit card info placeholder.

---

## 6. Core Algorithm — Workout Generation

**File:** `src/lib/generateWorkout.ts`

### Inputs
- `totalTimeSec` — user-selected time in seconds
- `locationName` — selected location
- `equipmentOverride` — custom equipment list (null = use location defaults)
- `selectedGoals` — user-selected goal types (empty = "Plan For Me")

### Algorithm Steps

**Step 1 — Time cap:**  
`usableTime = floor(totalTimeSec × 0.9)` — reserves 10% for setup/cleanup.

**Step 2 — Resolve equipment:**  
Use `equipmentOverride` if provided; otherwise extract checked equipment from the selected location in DB 3B.

**Step 3 — Filter eligible exercises (from DB 1A):**
- Exercise `setting` must be `"any"` OR match the selected location name (case-insensitive).
- Every item in the exercise's `equipment[]` must be in the available equipment list. Exercises with empty equipment are always eligible.

**Step 4 — Determine target types:**
- **If goals selected:** Each selected goal becomes a target with weight 1.
- **If "Plan For Me":** Call `pickTypesFromHistory()`:
  - For each breakdown preference: `intervalDays = 7 / frequency`
  - Scan all logs to find the most recent workout containing that type (matching on `exercise.type` or `exercise.applications`)
  - `overdueFactor = daysSinceLast / intervalDays` (999 days if never done)
  - Return types sorted descending by `overdueFactor` (most overdue first)

**Step 5 — Select exercises per target type:**
For each target type (in priority order), while `remainingTime > 0`:
1. **Try group match:** Find the first `WorkoutGroup` whose `types` or `applications` contain the target type. Use that group's exercises (filtered to eligible pool).
2. **Fallback:** Filter all eligible exercises by matching type or application.
3. **Shuffle** candidates randomly.
4. **Fill:** Skip duplicates. Skip if exercise time > remaining. Rep-based exercises get 3 sets (time = `defaultTimeSec × 3`). Time-based exercises get 1 set (time = `defaultTimeSec`).

**Step 6 — Pad remaining time:**
If `remainingTime > 60s`, fill with shuffled eligible mobility exercises not yet selected.

**Step 7 — Return** a `WorkoutPlan` object.

### Key Behaviors
- **Groups stay together** — when a group matches, all its eligible exercises are candidates before falling back to individual matching.
- **History-aware** — "Plan For Me" mode prioritizes exercise types the user hasn't done recently relative to their desired frequency.
- **Equipment-safe** — no exercise requiring unavailable equipment will appear.
- **Setting-safe** — pool exercises won't appear at home, gym exercises won't appear outdoors.

---

## 7. Persistence Architecture

### Current: localStorage

All data is stored in the browser's `localStorage` via generic `load<T>(key, fallback)` / `save<T>(key, value)` helpers. Seven keys are used:

| Key | Database |
|---|---|
| `workout_db1a_exercises` | Exercise Library |
| `workout_db1b_groups` | Workout Groups |
| `workout_db2_logs` | Tracking History |
| `workout_db3a_breakdown` | Breakdown Preferences |
| `workout_db3b_locations` | Locations & Equipment |
| `workout_current_plan` | Active Workout (transient) |
| `workout_current_idx` | Current Exercise Index (transient) |

On first load, each database falls back to hard-coded defaults from `src/data/`.

### Limitations
- Data is browser-local only — no cross-device sync.
- No authentication — single implicit user.
- No backup/recovery — clearing browser data loses everything.
- No data validation on load.

---

## 8. Styling System

- **Dark theme only** via CSS custom properties (`:root` variables).
- **Mobile-first layout** — root container capped at 480px width, centered.
- **Component classes:** `.btn-primary`, `.btn-secondary`, `.btn-big`, `.card`, `.slider-track`, `.back-btn`.
- **Scroll-snap:** `.snap-container` and `.snap-page` for exercise detail view.
- **No component library** — all styling is inline styles + global CSS classes.

---

## 9. Known Issues & Technical Debt

| Issue | Severity | Location |
|---|---|---|
| `types` variable declared but never used in `summarize()` | Low | `tracking/page.tsx` |
| `saveWorkoutGroups` imported but never called | Low | `planning/library/page.tsx` |
| `"rehabilitation"` ExerciseType defined but unused by any exercise | Low | `types.ts` |
| Account name/email are local state only — not persisted | Medium | `account/page.tsx` |
| No error boundaries or loading states | Medium | All pages |
| No form validation anywhere | Medium | All input screens |
| Library edit mode only supports 3 fields (name, type, bodyArea) — missing equipment, setting, applications, etc. | Medium | `planning/library/page.tsx` |
| `components/` directory is empty — all UI is inline in page files | Medium | Architecture |
| Workout summary in tracking shows first exercise name, not workout type | Low | `tracking/page.tsx` |
| No prevention of double-saving from concurrent summary renders (React Strict Mode) | Medium | `summary/page.tsx` |

---

## 10. Roadmap to Production

### Phase 1 — Data Foundation (Est. 1–2 weeks)

| Task | Priority | Notes |
|---|---|---|
| **Parse & import Fitness library document** | Critical | Replace placeholder seed data with real exercises. Populate all columns (body area, type, equipment, setting, time estimates, applications). |
| **Data validation layer** | High | Add Zod or similar schema validation on load/save. Prevent corrupted localStorage from crashing the app. |
| **Migrate to Supabase/Firebase** | High | Replace localStorage with cloud database. Enable cross-device sync. This is the single highest-impact infrastructure change. |
| **Authentication** | High | Email/password auth via Supabase Auth or Firebase Auth. Link all data to user accounts. |

### Phase 2 — Algorithm Refinement (Est. 1–2 weeks)

| Task | Priority | Notes |
|---|---|---|
| **Resistance day balancing** | High | Spec requires legs / upper pull / upper push on separate days in equal proportions. Currently algorithm picks first matching group. Needs explicit rotation tracking. |
| **Strict group cohesion** | High | Spec requires McGill exercises always appear together, breath hold group stays together. Current algorithm uses groups as candidate pools but doesn't guarantee all members are included. |
| **Time estimation accuracy** | Medium | For rep-based exercises: `defaultTimeSec * 3` (3 sets) is rough. Should account for rest periods between sets (60-90 sec each). |
| **Adaptive time-per-rep** | Medium | Spec requires recording actual time/rep from the exercise screen and using it to improve future estimates. The data is saved in DB 2 but never read back into planning. |
| **Edge cases** | Medium | Handle: no eligible exercises for a filter combo, very short time windows (< 10 min), only 1 available location with no equipment. |

### Phase 3 — UX & Polish (Est. 2–3 weeks)

| Task | Priority | Notes |
|---|---|---|
| **Extract shared components** | High | Nav header, back button, card, slider, expandable list item, timer display. The `components/` directory is ready. |
| **Exercise illustrations** | Medium | Replace emoji placeholders with SVG or image files for each exercise movement. |
| **Real scroll-snap for exercise screen** | Medium | Currently uses a state toggle. Should use native CSS scroll-snap with two full-viewport pages. |
| **Responsive improvements** | Medium | Current 480px container works on mobile. Add tablet/desktop layouts. |
| **Loading & error states** | Medium | Skeleton screens for data loading. Error boundaries for crashes. |
| **Tracking summary improvement** | Medium | Show workout type summary ("Resistance at Gym") instead of first exercise name. Aggregate exercise types from the log. |
| **Animations & transitions** | Low | Smooth expand/collapse, page transitions, slider feedback. |
| **PWA manifest & service worker** | Medium | Offline support for using during workouts. Add to home screen capability. |

### Phase 4 — Feature Completion (Est. 2–3 weeks)

| Task | Priority | Notes |
|---|---|---|
| **Full library editing (Screen 2a3)** | High | Current edit mode only supports name/type/bodyArea. Need spreadsheet-like editing for all fields: equipment, setting, reps, time, applications, group membership. |
| **Exercise/group CRUD** | High | Add new exercises, delete exercises, create new workout groups, reorder group members. |
| **Upload exercise library** | Medium | Allow users to upload a document/spreadsheet and parse it into DB 1A/1B. |
| **App Settings (Screen 4)** | Medium | Implement display preferences: exercise screen layout, timer sounds, auto-advance, rest period settings. |
| **Account persistence** | Medium | Persist name, email to cloud DB. Implement actual password change flow. |
| **Workout editing** | Low | Allow reordering or swapping exercises on the Today's Workout screen before starting. |

### Phase 5 — Testing & Quality (Est. 1–2 weeks)

| Task | Priority | Notes |
|---|---|---|
| **Unit tests** | High | Test generateWorkout algorithm with various input combos. Test store serialization. |
| **Integration tests** | High | Test full workout flow: plan → workout → exercise → summary → tracking. |
| **E2E tests (Playwright/Cypress)** | Medium | Automated browser tests for critical paths. |
| **Accessibility** | High | ARIA labels, keyboard navigation, focus management, screen reader testing. Color contrast for dark theme. |
| **Performance audit** | Medium | Check localStorage read patterns. Optimize re-renders. Audit bundle size. |

### Phase 6 — Deployment & Beta (Est. 1–2 weeks)

| Task | Priority | Notes |
|---|---|---|
| **Deploy to Vercel** | High | Connect GitHub repo. Set up preview deployments for PRs. |
| **Custom domain** | Low | Optional: set up a branded domain. |
| **Analytics** | Medium | Basic usage tracking: workouts generated, completion rate, popular exercises. Privacy-respecting. |
| **Feedback mechanism** | Medium | In-app feedback form or link to external survey. |
| **Alpha testing (personal)** | High | Use daily for 2 weeks. Log all issues. |
| **Closed beta (5–10 users)** | High | Recruit testers, collect structured feedback. |

### Phase 7 — iOS Adaptation (Est. 3–4 weeks)

| Task | Priority | Notes |
|---|---|---|
| **Choose native approach** | High | Options: React Native (port components), Capacitor (wrap web app), or Expo. Capacitor is fastest. |
| **Native features** | Medium | Push notifications ("time for mobility day"), haptic feedback on set logging. |
| **Apple Health integration** | Low | Log workouts to HealthKit. |
| **TestFlight beta** | High | Distribute via Apple's TestFlight for iOS beta testers. |
| **App Store submission** | High | Prepare screenshots, descriptions, privacy policy. Submit for review. |

---

## 11. Environment Requirements

| Requirement | Current |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Browser | Any modern browser with localStorage |
| OS | Any (dev container runs Ubuntu 24.04) |

### Local Development

```bash
cd workout-app
npm install
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run start        # Serve production build
```

---

## 12. File Inventory

| File | Lines | Purpose |
|---|---|---|
| `src/lib/types.ts` | ~100 | Type definitions for all databases |
| `src/lib/store.ts` | ~110 | localStorage CRUD operations |
| `src/lib/generateWorkout.ts` | ~160 | Workout generation algorithm |
| `src/data/exercises.ts` | ~500 | 37 exercises + 11 groups seed data |
| `src/data/defaults.ts` | ~65 | Default locations + breakdown prefs |
| `src/app/page.tsx` | ~95 | Home screen |
| `src/app/plan/page.tsx` | ~175 | Plan a Workout screen |
| `src/app/workout/page.tsx` | ~80 | Today's Workout screen |
| `src/app/exercise/page.tsx` | ~200 | Exercise screen (timer, sets, details) |
| `src/app/summary/page.tsx` | ~105 | Summary screen |
| `src/app/planning/page.tsx` | ~50 | Planning hub |
| `src/app/planning/library/page.tsx` | ~155 | Library (exercises + groups) |
| `src/app/planning/breakdown/page.tsx` | ~85 | Breakdown (frequency sliders) |
| `src/app/planning/goals/page.tsx` | ~100 | Specific Goals |
| `src/app/planning/locations/page.tsx` | ~120 | Locations & Equipment |
| `src/app/tracking/page.tsx` | ~95 | Tracking |
| `src/app/settings/page.tsx` | ~40 | App Settings (placeholder) |
| `src/app/account/page.tsx` | ~95 | Account (placeholder) |
| `src/app/globals.css` | ~120 | Global styles |
| `src/app/layout.tsx` | ~30 | Root layout |
