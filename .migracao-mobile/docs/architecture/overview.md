# Letras Architecture

## Monorepo

- `apps/mobile-app`: React Native (Expo SDK 54) unified app for learner + educator flows using MVVM.
- `apps/api`: NestJS API with Prisma + Socket.IO.
- `packages/shared-types`: cross-app contracts (entities, DTOs, realtime payloads).
- `packages/shared-utils`: shared constants and utilities.

## Mobile (MVVM)

Each mobile app follows:

- `src/views`: visual components/screens.
- `src/viewmodels`: state orchestration + user actions.
- `src/domain`: entities/interfaces.
- `src/data`: repository implementations.
- `src/infra`: API client, socket client, storage.
- `src/navigation`: React Navigation setup.
- `src/hooks`: reusable hooks (realtime integration).
- `src/types`: local TypeScript types.

## Backend (NestJS)

Domain modules:

- `learner`
- `theme`
- `learning-content`
- `session`
- `progress`
- `health`

Realtime modules:

- `realtime/gateway/session.gateway.ts`
- `realtime/presence/presence.service.ts`
- `realtime/realtime.module.ts`

## Domain Model (Prisma)

Main entities:

- `LearnerProfile`
- `Theme`
- `LearnerTheme`
- `LearningUnit`
- `Activity`
- `LearnerSession`
- `SessionState`
- `Completion`

Additional support entity:

- `Educator`

## Realtime Rooms and Events

Room strategy:

- `room = learnerProfileId`

Participants:

- learner device
- educator device

Events:

- `learner_state_update`
- `locked_changed`
- `help_requested`
- `help_received`
- `lock_set`
- `lock_release`

Presence tracking:

- online learners
- online educators

## Persistence and Sync

- Learner device stores persistent IDs in AsyncStorage.
- Educator can join any learner room by `learnerProfileId`.
- State sync uses Socket.IO events, with REST fallback updates for session state.
