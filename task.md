# Task List – Ad Shield Feature Completion

## Backend
- [x] Cases module (CRUD + AI analyze + status update)
- [x] Block module (block/case/:id)
- [x] AI module (proxy to cases.analyzeCase)
- [x] Auth, Domains, Laws, AuditLogs modules
- [x] Add `POST /risk/logs` endpoint (receive auto-detect log from extension)
- [x] Add `POST /blocks` endpoint (alias compatible with plan - tabId, url, caseId)
- [x] Expose `GET /risk/logs` for dashboard to fetch system scan history
- [x] Add `GET /config/risk-level` + `PUT /config/risk-level` for global config
- [x] Wire real AI API key slot (env var placeholder) in ai.service.ts
- [x] Wire real SMTP config slot (env var) in email.util.ts

## Shared Types
- [x] UserRole, CaseStatus, ProductType, CaseDto, AuditLogDto
- [x] Add RiskLevel enum (MANUAL, AUTO_DETECT, AUTO_BLOCK)
- [x] Add BlockStatus enum (NONE, BLOCKED)
- [x] Update reporterRole type to include 'SYSTEM'
- [x] Add RiskLogDto interface
- [x] Add GlobalConfigDto interface

## Browser Extension
- [x] background.ts: Auto scan alarm + Auto block + chrome notifications
- [x] popup.tsx: RiskLevelSelector (settings panel), RiskLog viewer, Mode toggle
- [x] content.ts: Block screen overlay
- [x] Fix: popup.tsx title fixed to "SENTINEL ADS"
- [x] BlockBanner: auto-block shows red notification card in popup
- [x] Real AI API: env config in ai.service.ts ready for plugin

## Dashboard Web
- [x] Add Risk Log page (/risk-logs) – show all SYSTEM-reported cases with score filters
- [x] Add Global Config page (/settings) – admin can set global risk level
- [x] Update navigation in Header to include Risk Logs + Settings pages
- [x] Fix brand name typo in Header (SENTINEL ADS)
- [x] Add Risk Score column to cases list page (nice-to-have)

## Documentation / Config
- [x] Create .env.example for backend (API keys, SMTP, JWT)
- [x] Create README.md update with full setup instructions

## Build Verification
- [x] packages/shared – BUILD PASS
- [x] apps/backend-api – BUILD PASS
- [x] apps/browser-extension – BUILD PASS
- [x] apps/dashboard-web – BUILD PASS (9 routes: /, /cases, /cases/[id], /dashboard, /audit, /risk-logs, /settings)
