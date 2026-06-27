# ArkStock Trading Platform

**India's No.1 Stock Trading Platform** — a real-time stock market simulation dashboard built with Spring Boot WebFlux and vanilla JavaScript.

![Java](https://img.shields.io/badge/Java-17-blue) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-brightgreen) ![WebFlux](https://img.shields.io/badge/Reactive-WebFlux-blue)

---

## Features

- **Live price simulation** — 15 NSE-listed Indian stocks updated every second via Server-Sent Events (SSE)
- **Market indices** — NIFTY 50, SENSEX, NIFTY BANK, NIFTY IT, NIFTY AUTO, NIFTY PHARMA updated in real time
- **Portfolio tracker** — simulated holdings with live P&L, day's gain/loss, and total returns
- **Sparkline charts** — per-stock mini price charts rendered on HTML5 Canvas
- **Top Gainers / Top Losers** — live-sorted sidebar updated on every tick
- **Market Breadth** — advance/decline ratio bar
- **Dark & Light mode** — toggle with preference saved to `localStorage`
- **Auto-reconnect** — SSE client reconnects automatically on disconnect
- No database — fully in-memory simulation

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.2.5, Spring WebFlux, Project Reactor |
| Streaming | Server-Sent Events (SSE) |
| Frontend | HTML5, CSS3 (custom properties), Vanilla JS, Canvas API |
| Font | Inter (Google Fonts) |

## Getting Started

**Prerequisites:** Java 17+, Maven 3.8+

```bash
# Clone the repo
git clone https://github.com/aryak0512/arkstock-trading-platform.git
cd arkstock-trading-platform

# Run
mvn spring-boot:run
```

Open **http://localhost:8080** in your browser.

> If port 8080 is already in use: `lsof -ti :8080 | xargs kill -9`

## Simulated Stocks

| Symbol | Company | Sector |
|---|---|---|
| RELIANCE | Reliance Industries | Energy |
| TCS | Tata Consultancy Services | IT |
| INFY | Infosys | IT |
| HDFCBANK | HDFC Bank | Banking |
| ICICIBANK | ICICI Bank | Banking |
| SBIN | State Bank of India | Banking |
| WIPRO | Wipro | IT |
| BAJFINANCE | Bajaj Finance | NBFC |
| ADANIENT | Adani Enterprises | Conglomerate |
| MARUTI | Maruti Suzuki | Auto |
| TATAMOTORS | Tata Motors | Auto |
| LT | Larsen & Toubro | Infra |
| ASIANPAINT | Asian Paints | Consumer |
| SUNPHARMA | Sun Pharmaceutical | Pharma |
| TITAN | Titan Company | Consumer |

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/snapshot` | Current market snapshot (JSON) |
| `GET /api/stream` | Live SSE stream — event: `market-update` at 1 Hz |

## Project Structure

```
src/main/
├── java/com/arkstock/
│   ├── ArkStockApplication.java
│   ├── controller/StockController.java
│   ├── model/
│   │   ├── Stock.java
│   │   ├── MarketIndex.java
│   │   └── MarketData.java
│   └── service/StockSimulatorService.java
└── resources/
    ├── application.properties
    └── static/
        ├── index.html
        ├── css/style.css
        └── js/app.js
```

---

> **Disclaimer:** This is a simulation for demonstration purposes only. Prices are randomly generated and do not reflect real market data. Not financial advice.
