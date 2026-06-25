# Multi‑Level Risk Management & AI Analysis

## Goal Description
Implement three configurable risk handling levels for the Ad Shield system:
1. **Manual Check** – system only logs potential risk and waits for officer action.
2. **Auto Detect & Risk Report** – system continuously scans, logs incidents, evaluates severity, and sends a risk report to officers.
3. **Auto Block & Protect** – system automatically blocks offending user/device/session on high‑severity findings and then sends a summary report.

The UI theme remains the existing blue gradient theme. AI analysis will be applied to both consumer‑submitted data and officer‑submitted investigations.

## User Review Required
- **Risk Level Configuration**: Should the officer be able to select the active risk level globally (e.g., via a dropdown in the extension settings) or per‑case?
- **Block Action**: What specific actions constitute “block” (e.g., revoke Chrome extension permissions, disable the tab, send a message to a backend block‑list API)?
- **AI Model**: Use the existing AI endpoint `/cases/:id/analyze` or create a new endpoint `/ai/evaluate` that accepts both consumer and officer data?
- **Notification Channel**: Email only, or also push notification via browser API?
- **Persistence**: Add a `riskLevel` column to the `Case` table and a `blockStatus` flag.

## Open Questions
> [!IMPORTANT]
> - Which storage should hold the global risk level? (Chrome storage vs. backend config endpoint?)
> - Do we need a UI screen for officers to view a live risk log list?
> - For “Auto Block”, should the extension call a backend `POST /blocks` to register the block, or can it simply close the tab?
> - Should the AI analysis be triggered automatically on every page load when the level is set to Auto Detect, or only on explicit “Scan” button?
> - Do you want a toggle in the extension UI to enable/disable Auto Block per user?

## Proposed Changes
---
### Front‑end (browser‑extension)
#### New UI Elements
- **Settings Panel** (accessible from the popup header) with a dropdown to select the risk handling level (Manual, Auto Detect, Auto Block).
- **Risk Log Viewer**: a collapsible section showing recent auto‑detected logs (timestamp, URL, severity).
- **Block Indicator**: when Auto Block is active and a block occurs, show a red banner and a “Unblock” button for the officer.

#### New Components
- `src/components/RiskLevelSelector.tsx` – dropdown that saves the selected level to `chrome.storage.local` (key: `riskLevel`).
- `src/components/RiskLog.tsx` – list component rendering logs received from backend `/risk/logs`.
- `src/components/BlockBanner.tsx` – UI shown when a block is enforced.

#### Logic Updates
- On extension load, read `riskLevel` from storage and set a global state (`riskLevel`).
- **Manual Check**: keep existing behavior – only manual submit.
- **Auto Detect**: add a recurring background script (`src/background.ts`) that runs every **5 minutes** (using `chrome.alarms`) to:
  1. Execute a script on the active tab to gather page text.
  2. POST to `/cases` with `reporterRole: 'SYSTEM'` and `riskLevel: 'AUTO_DETECT'`.
  3. Receive AI risk score, store in a new `riskScore` field, and push a notification via `chrome.notifications`.
- **Auto Block**: extend the background script to evaluate the returned `aiRiskScore`. If `score >= 80` (configurable threshold), call a new backend endpoint `POST /blocks` with the tab ID, URL, and user identifier, then close the tab (`chrome.tabs.remove`). Show `BlockBanner`.
- After any AI analysis (manual or auto), call the existing `sendEmailNotification` helper to email the officer.

#### New Helper Files
- `src/api/risk.ts` – functions `logRisk`, `fetchRiskLogs`, `submitBlock`.
- `src/api/email.ts` – already present, will be reused.

### Back‑end (backend‑api)
#### Prisma Schema Updates (`prisma/schema.prisma`)
```prisma
model Case {
  id               Int      @id @default(autoincrement())
  title            String
  url              String
  productType      ProductType
  productLicenseNumber String?
  evidenceText     String?
  evidenceImage    String?
  reporterRole     ReporterRole
  reporterId       Int?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  riskScore        Int?     // AI risk score (0‑100)
  riskLevel        RiskLevel @default(MANUAL) // NEW
  blockStatus      BlockStatus @default(NONE)   // NEW
}

enum RiskLevel {
  MANUAL
  AUTO_DETECT
  AUTO_BLOCK
}

enum BlockStatus {
  NONE
  BLOCKED
}

enum ReporterRole {
  CONSUMER
  INSPECTOR
  SYSTEM
}
```

#### New Service Methods (`cases.service.ts`)
- Extend `create` DTO to accept `riskLevel?: RiskLevel` and `riskScore?: number`.
- Add method `logRisk(data: { url: string; score: number; level: RiskLevel })` that creates a `Case` with `reporterRole: 'SYSTEM'`.
- Add method `blockUser(caseId: number)` that updates `blockStatus` to `BLOCKED` and triggers any external block‑list integration.

#### New Controller Endpoints (`cases.controller.ts`)
- `POST /risk/logs` → accepts payload from extension for auto‑detect logs.
- `POST /blocks` → receives block requests (tabId, url) and returns success.

#### New Notification Service (`notification.service.ts`)
- Re‑use existing email helper or integrate with a push‑notification service to send real‑time alerts.

### Shared Types (`@kp-ads/shared`)
Add new enums:
```ts
export enum RiskLevel { MANUAL = 'MANUAL', AUTO_DETECT = 'AUTO_DETECT', AUTO_BLOCK = 'AUTO_BLOCK' }
export enum BlockStatus { NONE = 'NONE', BLOCKED = 'BLOCKED' }
```
Update DTO definitions accordingly.

## Verification Plan
### Automated Tests
- Unit test for `RiskLevelSelector` saving and retrieving from Chrome storage.
- Integration test for `background.ts` alarm triggering and calling `/risk/logs`.
- Backend tests:
  * Creating a case with `riskLevel` and `riskScore`.
  * `blockUser` updates `blockStatus` and returns 200.
  * Email notification is sent when `riskLevel` is `AUTO_BLOCK` and score ≥ threshold.

### Manual QA
1. Set risk level to **Manual Check** – verify extension behaves as before (no auto scans).
2. Set to **Auto Detect** – wait for alarm, check that a case appears in backend with a risk score and that a browser notification is shown.
3. Set to **Auto Block** – trigger a page with a high‑risk ad (simulate by sending a high score from backend). Verify the tab is closed, a red block banner appears, and an email is received.
4. Verify the UI theme (gradient background) is unchanged.

---
