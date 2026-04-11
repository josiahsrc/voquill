# Inumaki AI

## Project overview
Inumaki AI is an **open-source, Windows-first internal voice productivity tool** for developers.

Its purpose is to let internal users speak naturally and turn that speech into usable written output across any Windows application.

The product is inspired by tools like Wispr Flow, but the first implementation is focused on internal developer productivity, not a consumer release.

## Core product idea
Inumaki AI acts as a universal voice input layer plus an AI cleanup layer.

A user should be able to:
- press a hotkey
- speak naturally
- have their audio transcribed
- optionally rewrite or clean the text
- paste the result directly into the app they are currently using

The goal is to reduce keyboard friction for:
- notes
- messages
- internal updates
- coding prompts
- lightweight drafting

## Product objectives
The MVP should prove that voice can become a reliable input method for internal developer workflows.

### Primary objectives
- Enable fast push-to-talk dictation on Windows
- Convert speech into usable text across any app
- Support multiple output modes, not just raw transcription
- Restrict access to internal developers only
- Establish a clean open-source project foundation
- Set up repo, branches, CI/CD, and release workflow from the start

### Secondary objectives
- Make the app easy to test internally
- Build clean architecture that can later support macOS, mobile, and additional rewrite modes
- Keep the first version lean and practical

---

# MVP product spec

## MVP users
Internal developers only.

### Access model
- invite-only or allowlisted auth
- internal-only usage at MVP stage
- public/open-source codebase, but restricted hosted/internal usage initially if needed

## MVP success criteria
A developer can:
- sign in
- run the Windows app in background/tray
- press a global hotkey
- speak naturally
- get polished text back quickly
- paste that text into any focused Windows app
- choose at least 3 output modes

---

# MVP feature set

## 1. Internal authentication
Support one simple auth method for MVP:
- Google Workspace allowlist, or
- magic link with allowlisted email domains/invites

### Requirement
Only approved internal users can sign in and use the app.

## 2. Windows desktop app
A Windows desktop client that includes:
- tray app behavior
- global hotkey listener
- microphone capture
- small main panel
- settings panel
- optional preview modal

### Recommended desktop stack
- **Electron + React + TypeScript** for fastest MVP delivery

Alternative later:
- Tauri + React if footprint optimization becomes important

## 3. Push-to-talk recording
Core interaction:
- user presses and holds global shortcut
- audio records while held
- on release, audio is processed

### Requirement
Show clear states:
- idle
- recording
- processing
- success/error

## 4. Speech transcription
Use hosted transcription for MVP.

### Recommendation
Use API-based transcription first.
Reasons:
- faster to ship
- avoids local model deployment issues
- easier for internal rollout
- simpler support burden

## 5. Rewrite / cleanup layer
After transcript is created, run it through a rewrite/cleanup step.

### MVP output modes
- **Raw Transcript**
- **Clean Text**
- **Polished Message**
- **Coding Prompt**
- optional later: Email Draft, Internal Note

### Behavior
- Raw Transcript: minimal cleanup
- Clean Text: remove filler words, punctuation, formatting cleanup
- Polished Message: concise polished communication output
- Coding Prompt: structured prompt for coding tools/models

## 6. Insert into active app
Support:
- copy to clipboard
- auto-paste into active app
- preview before paste

### MVP requirement
At minimum, support:
- copy
- paste into focused window

## 7. User settings
Simple user-configurable settings:
- default mode
- microphone selection
- hotkey
- auto-paste on/off
- preview before paste on/off
- tone preference

## 8. Basic admin layer
Internal admin features:
- invite user
- disable user
- view basic usage totals

Do not overbuild this.

---

# Technical architecture

## High-level architecture
The system has two primary components:

### A. Windows desktop client
Responsibilities:
- authentication flow initiation
- microphone capture
- hotkey listening
- tray UI
- settings UI
- preview modal
- clipboard/paste actions
- sending audio to backend
- receiving transcript / rewritten output

### B. Backend API service
Responsibilities:
- user authentication / session validation
- audio upload handling
- transcription orchestration
- rewrite orchestration
- preferences storage
- admin controls
- usage logging

---

# Recommended stack

## Desktop app
- Electron
- React
- TypeScript
- Electron-builder for packaging

## Backend
- Next.js API routes or lightweight Node/TypeScript API
- TypeScript
- Prisma or equivalent ORM if using SQL

## Auth
- NextAuth/Auth.js or equivalent
- Google Workspace allowlist or magic link auth

## Database
For MVP, use a simple relational DB.

Recommended:
- Postgres

## Suggested tables
- users
- user_preferences
- usage_logs
- invites/admin roles if needed

## AI services
### Service 1: Transcription
- hosted transcription API
- input: recorded audio
- output: transcript

### Service 2: Rewrite
- input: transcript + selected mode
- output: cleaned or transformed text

## Storage
MVP can avoid permanent audio retention.
Store only what is necessary.

### Recommendation
- do not store raw audio by default
- do not store transcript history by default unless explicitly needed
- store only usage metadata and user preferences initially

---

# Suggested data model

## users
- id
- email
- name
- role
- is_active
- created_at
- updated_at

## user_preferences
- id
- user_id
- default_mode
- auto_paste
- preview_before_paste
- hotkey
- microphone_id
- tone_preference
- created_at
- updated_at

## usage_logs
- id
- user_id
- mode
- audio_duration_seconds
- success
- error_code nullable
- created_at

## invites (optional for MVP)
- id
- email
- invited_by
- status
- created_at

---

# UX / screen spec

## 1. Sign-in screen
Purpose:
- authenticate internal user

Includes:
- app branding: Inumaki AI
- sign in with Google or magic link
- short explanation of internal access restriction

## 2. Main mini panel
Purpose:
- give user a simple control center

Includes:
- current mode selector
- record button visual
- current status
- recent output preview
- quick actions: copy, retry

## 3. Settings screen
Includes:
- microphone selector
- hotkey selector
- default mode
- auto-paste toggle
- preview before paste toggle
- tone preference

## 4. Preview modal
Shown when preview mode is enabled.

Includes:
- transcript
- final rewritten output
- buttons:
  - Paste
  - Copy
  - Retry
  - Cancel

## 5. Admin screen
Includes:
- list of approved users
- invite user
- deactivate user
- simple usage counts

---

# Build phases

## Phase 1: Core working loop
1. Auth
2. Electron Windows shell
3. Global hotkey capture
4. Audio recording
5. Transcription API integration
6. Clean text output
7. Copy/paste into focused app

## Phase 2: Better usability
8. Multiple output modes
9. Preview modal
10. Settings screen
11. Tray app behavior
12. Better error handling

## Phase 3: Internal operations
13. Admin screen
14. Invite-only access control
15. Usage logging
16. Basic release automation

---

# Open-source foundation requirements

## Repo setup
Create a dedicated GitHub repository:
- `inumaki-ai`

## Repo contents
Initial structure should include:
- desktop app source
- backend/service source if separate
- docs
- contribution guide
- environment examples
- CI/CD workflows
- issue templates
- PR template
- license

## Recommended top-level structure
```text
inumaki-ai/
  apps/
    desktop/
    web/                # optional admin/auth/backend surface
  packages/
    ui/
    shared/
    config/
  docs/
  .github/
    workflows/
    ISSUE_TEMPLATE/
  README.md
  CONTRIBUTING.md
  LICENSE
  .env.example
  pnpm-workspace.yaml
  package.json
```

## Package management
Recommended:
- pnpm monorepo

Reason:
- shared types/config
- cleaner future expansion
- easier multi-app structure

---

# Branching strategy
Keep it simple.

## Suggested branches
- `main` = stable, releasable branch
- `dev` = active integration branch
- feature branches = short-lived branches off `dev`

### Naming examples
- `feature/windows-hotkey-capture`
- `feature/transcription-service`
- `fix/paste-behavior`
- `chore/github-actions`

## Release flow
- feature branches merge into `dev`
- tested milestones merge from `dev` into `main`
- tagged releases created from `main`

---

# CI/CD setup

## CI requirements
On pull request and push:
- install dependencies
- lint
- typecheck
- run tests
- validate build

## Suggested GitHub Actions workflows
### 1. `ci.yml`
Run on PRs and pushes:
- pnpm install
- lint
- typecheck
- unit tests
- build desktop/web packages

### 2. `release.yml`
Run on tags or manual trigger:
- build Electron app
- create Windows distributable
- attach artifacts to GitHub release

### 3. `preview.yml` (optional)
If web/admin surface exists:
- deploy preview build for internal testing

---

# Testing flows for humans
These are manual test flows internal users should run.

## Test flow 1: Sign in
1. Open app first time
2. Click sign in
3. Authenticate with approved account
4. Return to app signed in

### Expected result
- user lands in app successfully
- unauthorized users cannot proceed

## Test flow 2: Basic dictation
1. Open Notepad or any text field
2. Press and hold hotkey
3. Speak one short sentence
4. Release hotkey

### Expected result
- app records correctly
- transcript is processed
- cleaned output appears
- output pastes into focused app

## Test flow 3: Clean text mode
1. Set mode to Clean Text
2. Speak casually with filler words
3. Release hotkey

### Expected result
- filler words are reduced
- punctuation is added
- output reads naturally

## Test flow 4: Polished message mode
1. Set mode to Polished Message
2. Speak an informal response
3. Release hotkey

### Expected result
- output becomes a concise polished message
- still preserves meaning

## Test flow 5: Coding prompt mode
1. Set mode to Coding Prompt
2. Dictate an engineering request
3. Release hotkey

### Expected result
- output is structured clearly for a coding model
- concise, explicit, usable

## Test flow 6: Preview mode
1. Turn preview mode on
2. Dictate text
3. Wait for modal
4. Edit text
5. Click Paste

### Expected result
- preview opens correctly
- edits are preserved
- final text pastes into target app

## Test flow 7: Auto-paste off
1. Turn auto-paste off
2. Dictate text
3. Receive result

### Expected result
- output is shown or copied, not pasted automatically

## Test flow 8: Microphone selection
1. Change microphone in settings
2. Dictate again

### Expected result
- selected microphone is used
- audio capture remains stable

## Test flow 9: Error handling
1. Disconnect microphone or deny input
2. Try dictation

### Expected result
- clear error message shown
- app does not crash
- retry path exists

## Test flow 10: Admin controls
1. Admin signs in
2. Invites a user
3. Deactivates a user

### Expected result
- invited user can sign in if approved
- deactivated user loses access

---

# Definition of done
Inumaki AI MVP is done when:
- internal users can authenticate
- Windows app runs in background/tray
- hotkey push-to-talk works reliably
- speech is transcribed via API
- at least 3 rewrite modes work
- output can be pasted into any focused Windows app
- settings are persisted
- basic internal admin controls exist
- GitHub repo, branch model, and CI/CD foundations are in place

---

# Non-goals for MVP
Do not build yet:
- macOS app
- iPhone/Android app
- full enterprise admin suite
- local/offline model inference
- advanced analytics dashboards
- shared team dictionaries
- audio history archive
- organization-wide policy engine

---

# Immediate setup tasks
1. Create GitHub repo: `inumaki-ai`
2. Initialize monorepo foundation
3. Add Electron desktop app scaffold
4. Add auth/backend scaffold
5. Set up Postgres schema
6. Add CI GitHub Actions
7. Set up `main` and `dev` branch workflow
8. Add issue templates and PR template
9. Add release packaging flow for Windows builds
10. Implement core dictation loop

---

# One-line product summary
**Inumaki AI is an open-source, Windows-first internal voice productivity tool that turns speech into polished text and pastes it into any app.**