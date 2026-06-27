# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the application (kills any existing process on 8080 first)
lsof -ti :8080 | xargs kill -9 2>/dev/null; mvn spring-boot:run

# Compile only
mvn compile

# Package as JAR
mvn package -DskipTests

# Run the packaged JAR
java -jar target/arkstock-1.0.0.jar
```

There are no tests in this project. The application starts on port 8080; the dashboard is at `http://localhost:8080`.

## Git Conventions

### Branching

```
feature/add-job-filter-sidebar         # New features
fix/employer-route-redirect-loop       # Bug fixes
docs/update-readme                     # Documentation only
chore/upgrade-dependencies             # Maintenance, tooling
refactor/simplify-auth-context         # Code refactoring
style/mobile-job-card-spacing          # Visual/style changes
```

- Branch off `main` for all new work
- Keep branches short-lived; open a PR when ready
- Delete branches after merging

### Commit Messages

Follow **Conventional Commits**:

```
feat: add saved jobs count to navbar
fix: correct role guard on employer routes
docs: update README with localStorage keys
chore: upgrade react-router to v7.8
refactor: extract job card into reusable component
style: fix spacing on mobile job list
```

- Use present tense, lowercase, no period at the end
- Keep the subject line under 72 characters
- Add a body for non-obvious changes

### Pull Requests

- PR title should match the commit message format
- Include a summary and test plan in the PR description
- Target `main` as the base branch

## Architecture

This is a single-module Spring Boot 3 WebFlux application. There is no database — all state is in-memory.

### Data flow

```
StockSimulatorService
  └─ Flux.interval(1s) → tick() mutates stocks map → snapshot() serializes state
       └─ .share()  ← single hot Flux shared across all SSE subscribers

StockController
  ├─ GET /api/snapshot   → Mono<MarketData>  (initial page load)
  └─ GET /api/stream     → Flux<ServerSentEvent<MarketData>>  (SSE, 1 Hz)

Browser (index.html + app.js)
  ├─ fetch /api/snapshot  → seed table rows before SSE arrives
  └─ EventSource /api/stream  → market-update event → render()
```

### Price simulation (`StockSimulatorService.tick`)

Each tick generates one shared **market factor** (Gaussian, σ=0.0008) plus a per-stock **idiosyncratic** term (Gaussian, σ=`stock.volatility`). The actual price move is 50% market + 50% idio, plus a tiny mean-reversion pull toward the opening price. Prices are rounded to 5-paise ticks (`Math.round(x * 20) / 20`). The sparkline keeps the last 50 price points.

Indices (NIFTY, SENSEX, etc.) are derived each tick as the equal-weighted average `changePercent` of their hardcoded constituent lists, applied against the fixed opening base value.

### Frontend update model (`app.js`)

- `initTable()` builds `<tr id="row-{SYMBOL}">` rows once on first data arrival; subsequent ticks call `updateStockRows()` which patches individual cells by `id`.
- Price flash animations (`.flash-up` / `.flash-down` CSS keyframes) are triggered by comparing the new price against `lastPrices[symbol]`.
- Sparklines are drawn on per-row `<canvas id="spark-{SYMBOL}">` elements using the Canvas 2D API; color comes from CSS variables `--green` / `--red` so they respect the active theme.
- The ticker tape is built once (`tickerContent` flag) then updated in-place to avoid resetting the CSS scroll animation.
- Theme (`dark`/`light`) is stored in `localStorage` under key `arkstock-theme` and applied as `data-theme` on `<html>`.

### Key constraints

- **No `spring-boot-starter-web`** — only `spring-boot-starter-webflux`. Adding the MVC starter will cause an application context conflict.
- Static assets are served by Spring Boot's default conventions from `src/main/resources/static/`. Do not add `spring.webflux.static-path-pattern` or `spring.web.resources.static-locations` to `application.properties` — those override the defaults and break asset serving.
- `Stock` fields marked `@JsonIgnore` (`volatility`, `baseVolume`) are internal simulation state; they must not be serialized to the SSE stream.
- The `Flux.share()` on the market data stream means **all SSE subscribers share one timer**. If you need per-subscriber state, switch to `Flux.publish().autoConnect()` or `replay(1).autoConnect()`.

### Adding a new stock

1. Add a row in `StockSimulatorService.initStocks()` using the `add(symbol, name, sector, prevClose, volatility, baseVolume, weekHigh52, weekLow52, marketCap)` helper.
2. If the stock should be included in an index, add its symbol to the relevant array in `updateIndices()`.
3. To include it in the simulated portfolio, add an entry to `PORTFOLIO` in `app.js`.
