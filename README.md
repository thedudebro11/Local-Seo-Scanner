# Local SEO Scanner

A desktop application that audits local business websites for SEO, conversion, and trust issues — then generates a prioritized, owner-friendly report identifying revenue leaks.

## What it does

Local SEO Scanner crawls a target website with a real Chromium browser (Playwright), extracts over 30 on-page signals, runs them through five category analyzers, scores each category, and produces both a JSON report and a self-contained HTML report. It catches the issues that most commonly cause local businesses to lose Google visibility and leads: missing phone numbers, absent LocalBusiness schema, no contact forms, thin content, and slow page speed (via Lighthouse).

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 28 |
| Build tool | electron-vite 2.x |
| UI framework | React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| State management | Zustand |
| Crawler | Playwright (Chromium) |
| Performance audit | Lighthouse 11 + chrome-launcher |
| HTML parsing | cheerio/slim (avoids undici/Node 18 conflict) |
| File I/O | fs-extra |
| Validation | zod |
| Charts | recharts |
| Routing | react-router-dom (hash router) |

## Quick Start

```bash
npm install
npm run dev          # Launch dev app with HMR
npm run build        # Compile all 3 build targets to out/
npm run typecheck    # Type-check without emitting
npm run dist         # Build + package with electron-builder
```

## Requirements

- Node.js 18 or later
- Playwright installs its own Chromium on `npm install`
- System Chrome is not required (Lighthouse falls back to Playwright's Chromium)

## Documentation

All documentation lives in the `docs/` directory.

| Document | Description |
|---|---|
| [docs/architecture/SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md) | Full system overview and data flow |
| [docs/architecture/SCAN_PIPELINE.md](docs/architecture/SCAN_PIPELINE.md) | Step-by-step scan pipeline with progress % |
| [docs/architecture/DIRECTORY_STRUCTURE.md](docs/architecture/DIRECTORY_STRUCTURE.md) | Every file explained |
| [docs/engine/ENGINE_OVERVIEW.md](docs/engine/ENGINE_OVERVIEW.md) | Engine entry point and pipeline |
| [docs/engine/CRAWLER.md](docs/engine/CRAWLER.md) | BFS crawler, robots, sitemap |
| [docs/engine/EXTRACTORS.md](docs/engine/EXTRACTORS.md) | All 9 extractors |
| [docs/engine/ANALYZERS.md](docs/engine/ANALYZERS.md) | All findings each analyzer produces |
| [docs/engine/SCORING.md](docs/engine/SCORING.md) | Deduction model, weights, bands |
| [docs/engine/REPORTS_AND_PERSISTENCE.md](docs/engine/REPORTS_AND_PERSISTENCE.md) | Report generation and disk storage |
| [docs/app/ELECTRON_SHELL.md](docs/app/ELECTRON_SHELL.md) | main.ts, BrowserWindow, app lifecycle |
| [docs/app/PRELOAD_AND_IPC.md](docs/app/PRELOAD_AND_IPC.md) | IPC channels and contextBridge |
| [docs/app/RENDERER_UI.md](docs/app/RENDERER_UI.md) | Routes, pages, components |
| [docs/app/STATE_MANAGEMENT.md](docs/app/STATE_MANAGEMENT.md) | Zustand store |
| [docs/reference/DATA_MODELS.md](docs/reference/DATA_MODELS.md) | All TypeScript interfaces |
| [docs/reference/IPC_CONTRACTS.md](docs/reference/IPC_CONTRACTS.md) | All IPC channels |
| [docs/reference/REPORT_SCHEMA.md](docs/reference/REPORT_SCHEMA.md) | report.json and index.json structure |
| [docs/status/IMPLEMENTATION_STATUS.md](docs/status/IMPLEMENTATION_STATUS.md) | What is and is not implemented |
| [docs/status/CURRENT_LIMITATIONS.md](docs/status/CURRENT_LIMITATIONS.md) | Known limitations |
| [docs/guides/ADD_NEW_ANALYZER.md](docs/guides/ADD_NEW_ANALYZER.md) | How to add an analyzer |
| [docs/guides/ADD_NEW_EXTRACTOR.md](docs/guides/ADD_NEW_EXTRACTOR.md) | How to add an extractor |
| [docs/guides/ADD_NEW_SCORING_RULE.md](docs/guides/ADD_NEW_SCORING_RULE.md) | How to modify scoring |
| [docs/guides/ADD_NEW_REPORT_SECTION.md](docs/guides/ADD_NEW_REPORT_SECTION.md) | How to add an HTML report section |
| [docs/guides/SAFE_EXTENSION_RULES.md](docs/guides/SAFE_EXTENSION_RULES.md) | Architecture rules for extensions |
| [docs/ai/AI_MEMORY.md](docs/ai/AI_MEMORY.md) | Compact AI context file |
| [docs/ai/AI_HANDOFF.md](docs/ai/AI_HANDOFF.md) | Full AI agent handoff document |

## Reports location

Scan reports are saved under Electron's `userData` directory:

- **macOS**: `~/Library/Application Support/local-seo-scanner/reports/`
- **Windows**: `%APPDATA%\local-seo-scanner\reports\`
- **Linux**: `~/.config/local-seo-scanner/reports/`
