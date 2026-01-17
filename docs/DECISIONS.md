# Implementation decisions & notes

## Initial commands
- `npm install`
- `npm start`

## Goal

Build a “Control Panel” UI (front-end only) that:

- Lets the user select a device
- Lets the user schedule a command for the selected device
- Lists commands and their statuses
- Refreshes status via polling (every 5s)

There is no real backend: the API layer is an in-memory mock.

---

## What I optimized for

I tried to deliver something that is:
- easy to run locally
- small and readable
- correct under async/polling edge-cases
- tested where it matters most (polling + validation)

I intentionally stopped nice-to-have extras once I got close to the ~4 hour mark.

## Stack & structure

- **Angular** with **standalone components**
  - Keeps boilerplate low (no feature modules needed here).
- **RxJS** for async coordination (polling / cancellation / avoiding overlap)
- **Jest** with `jest-preset-angular` for unit tests

Key files:

- `src/app/shared/mock-api/mock-api.service.ts`: in-memory mock API with latency, failures, and status progression.
- `src/app/app.component.*`: main page (device selection, command list, polling).
- `src/app/components/command-scheduler/schedule-command-form/*`: scheduling form.
- `src/app/shared/json-text-validator/json-text.validator.ts`: reusable JSON text validator.

---

## Architecture & folder structure

All architecture decisions (component split, file organization, data flow) were made by me.

High-level approach:
- `AppComponent`:
  - owns the selected device
  - orchestrates polling + refresh triggers
  - holds “page-level” loading/error state
- Smaller focused component for:
  - device selection UI
  - commands list/table (rendering + filter/sort)
  - schedule command form (validation + submit states)

I kept it intentionally single-page because of time constraints.

---

## Mock API: latency, failures and status progression

### Latency
Each request goes through a `delay(...)` using a fixed latency value.

### Failures
- By default, the mock has standard failure rate (0.1).
- There’s also a UI toggle that forces every request to fail.

### Status progression
The mock simulates a typical lifecycle so polling structure is evident:
(Just a small note: I didn't know what polling was exactly, even though I've heard it before, until I build this project)
(I also had to learn what leased meant in this context)

`PENDING -> LEASED -> SUCCEEDED | FAILED`

The progression is time-based and starts when the command is created.
This update happens inside `getCommands(...)`.

---

## Polling & async correctness

Key requirements:

- Poll every 5 seconds while a device is selected
- Avoid overlapping requests (no “stacking”)
- Avoid out-of-order (“stale”) responses when the user switches devices quickly - AI helped me thinking about this edge case
- Stop polling when switching devices

### Approach
I used RxJS in `AppComponent`:

- `merge(timer(0, 5000), refreshCommands$)` generates polling + manual refresh triggers
- `exhaustMap(...)` enforces **no overlap** (if a request is in-flight, the next tick is ignored) - I had AI help to build this
- When the device changes, the old subscription is unsubscribed and a new one is created
  - Because the mock returns Observables with `delay(...)`, unsubscribing cancels the pending timer so a slow response from the previous device can’t update the UI. This avoids stale updates.

Test: `prevents stale results when switching devices quickly` validates that a slow response from device A does not “flash” after switching to device B.

---

## Commands list

- **Sorting**: newest-first (descending by `createdAt`).
- **Filter**:
  - `ALL`
  - `PENDING`
  - `LEASED`
  - `TERMINAL` (SUCCEEDED or FAILED)

Handled UI states:

- Loading (initial load)
- Error (with retry)
- Empty

---

## Scheduling form

- `type`: required
- `params`: optional JSON text
  - if empty/whitespace: use `{}`
  - if present: must be valid JSON

The submit button is disabled while the request is in-flight.

On success:

- Clear only `params` (keep `type` for quick repeat scheduling)
- Emit a `scheduled` event so the parent component can trigger an immediate refresh

---

## Tests

Tooling: Jest (`jest-preset-angular`) + Spectator to diminish boilerplate code

Included tests:

- `jsonTextValidator`:
  - accepts empty
  - accepts valid JSON
  - rejects invalid JSON
- App polling behavior:
  - validates cancellation / “stale protection” when switching devices

If I had more time:

- An integration test for the full flow “schedule -> shows in list”
- More coverage for scheduling error states
- A focused test proving polling does not overlap (e.g. counting calls under slow responses)

---

## Assumptions & trade-offs

- I show `commandId` in the table (not required, but useful for debugging and testing)
- I kept the project intentionally small (no routing, single page)
- Standalone components reduce boilerplate for this scope
- Even though I follow Angular lifecycle standards (using onInit and onDestroy in the `app.component`) this has no practical effect given that this component is never really 'destroyed'. I just wanted to show that it is important to unsubscribe from subscriptions to keep memory usage as light as possible, avoinding any forgotten active subscriptions.

---

## Improvements with more time

- Routing: `/devices/:deviceId`, command details `/commands/:commandId`
- Accessibility: focus the first error, keyboard navigation, `aria-describedby` - if this was a real project, I would probably implement this since the beginning.
- UX: more subtle refresh indicator, success toast after scheduling
- Persist selected device in the URL (or localStorage)
- E2E with Playwright for the full flow - this is what I would do next.

---

## Approximate time

~4 hours (implementation + tests + docs).

---

## Where AI helped

I used AI as a coding assistant mainly for planning and review.

Prompts / notes (examples):

- “Given Angular + RxJS, what would be a safe polling pattern that avoids common edge cases?”
- “Help me to refine layout so the table and form reads well.”
- “Suggest a clean in-memory mock structure + predictable status progression.”
- “Quick review: any problem in this [...] logic?”
- “Suggest a minimal mock API that is test-friendly.”
- “Review this UI flow for missing loading/empty/error states and propose tests to cover them.”

What I accepted:

- Using RxJS `exhaustMap` for “no overlap” polling
- Keeping the mock API deterministic (fixed timings, single latency value) to stabilize tests
- Styling improvements that made the UI clearer and more beautiful
- Mock-API structuring ideas that stayed easy to reason about and test
- AI also scanned my code for possible bugs and edge case suggestions

What I rejected / adjusted:

- Approaches that relied on Promises (kept Observables for real cancellation)
- Suggestions that required extra Angular test or non-standard setup (kept Jest straightforward)
- Anything that added complexity for the time box
- Suggestions that made tests harder/flakier
