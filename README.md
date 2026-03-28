# BuddyBills: Group Expense Tracker

A robust, offline-first group expense splitting application designed to function seamlessly without an internet connection. Built on a **Local-First** architecture to ensure zero data loss and instant UI interactions.

## 🏗 Architecture Philosophy

- **Local-First:** The app writes to the device's database (_RxDB_) first. The UI never waits for the server.
- **Bulletproof Sync:** Data synchronizes with the backend (_NestJS + Postgres_) in the background when connectivity is restored.
- **No Vendor Lock-in:** 100% self-hosted stack. No Firebase, Supabase, or proprietary auth.

## 🛠 Tech Stack

### Frontend (Client)

- **Framework:** Next.js - _Used as a PWA shell._
- **Language:** TypeScript - _Strict mode for shared types._
- **Local Database:** **RxDB** (Reactive Database) - _Wraps IndexedDB for offline persistence and handles replication logic._
- **Styling:** Tailwind CSS + Shadcn/UI - _Fully owned component code._
- **PWA Engine:** `@serwist/next` - _Service Worker management for asset caching._

### Backend (Server)

- **Runtime:** Node.js
- **Framework:** **NestJS** - _Handles auth and custom replication endpoints._
- **Database:** PostgreSQL - _The central source of truth._
- **ORM:** Prisma - _Schema management and type-safe queries._
- **Auth:** JWT / Iron-Session - _Stateless authentication compatible with offline re-hydration._

### Infrastructure

- **Containerization:** Docker & Docker Compose - _Portable deployment._

## 💾 Data Strategy

### Synchronization Protocol

We utilize a **Push/Pull Replication** strategy via HTTP:

1. **Offline Writes:** User actions (add expense, edit trip) are saved to RxDB immediately.
2. **Conflict Handling:** Uses deterministic logic (CRDT concepts) or Last-Write-Wins based on `updatedAt` timestamps.
3. **Soft Deletes:** Data is never physically deleted (`DELETE FROM...`). Instead, a `deleted: true` flag is set to ensure deletion propagates to other devices.

### Database Schema Principles

- **Primary Keys:** strictly **UUIDs** (v7). Auto-incrementing integers (`1, 2, 3`) are strictly forbidden to prevent collision between offline users.
- **Timestamps:** All entities track `updatedAt` (Unix timestamp) to manage sync deltas.

## 🚀 Key Features

- **100% Offline Capability:** Create groups, add members, and split expenses in "Airplane Mode."
- **Instant UI:** Zero latency interactions; the network is strictly a background concern.
- **Cross-Device Sync:** Seamless state merging between multiple users when online.
