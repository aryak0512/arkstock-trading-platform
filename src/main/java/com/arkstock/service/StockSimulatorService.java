package com.arkstock.service;

import com.arkstock.model.MarketData;
import com.arkstock.model.MarketIndex;
import com.arkstock.model.Stock;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class StockSimulatorService {

    private final LinkedHashMap<String, Stock> stocks = new LinkedHashMap<>();
    private final List<MarketIndex> indices = new ArrayList<>();
    private final DateTimeFormatter timeFormat = DateTimeFormatter.ofPattern("HH:mm:ss");
    private final Flux<MarketData> marketDataFlux;

    public StockSimulatorService() {
        initStocks();
        initIndices();
        marketDataFlux = Flux.interval(Duration.ofSeconds(1))
                .map(tick -> {
                    tick();
                    return snapshot();
                })
                .share();
    }

    private void initStocks() {
        add("RELIANCE",   "Reliance Industries",        "Energy",          2850.50, 0.0028, 8_500_000, 3217.00, 2220.30, "19.6L Cr");
        add("TCS",        "Tata Consultancy Services",  "IT",              3720.00, 0.0022, 3_200_000, 4255.00, 3311.00, "13.5L Cr");
        add("INFY",       "Infosys",                    "IT",              1520.75, 0.0030, 12_000_000,1888.00, 1358.35, "6.3L Cr");
        add("HDFCBANK",   "HDFC Bank",                  "Banking",         1695.30, 0.0025, 11_000_000,1880.00, 1363.55, "12.9L Cr");
        add("ICICIBANK",  "ICICI Bank",                 "Banking",         1240.50, 0.0028, 18_000_000,1345.00,  898.55, "8.7L Cr");
        add("SBIN",       "State Bank of India",        "Banking",          825.60, 0.0035, 35_000_000, 912.00,  543.20, "7.4L Cr");
        add("WIPRO",      "Wipro",                      "IT",               485.20, 0.0030,  8_000_000, 571.00,  408.00, "2.5L Cr");
        add("BAJFINANCE", "Bajaj Finance",              "NBFC",            7150.00, 0.0038,  2_500_000,8192.00, 6187.80, "4.4L Cr");
        add("ADANIENT",   "Adani Enterprises",         "Conglomerate",    2450.75, 0.0050,  4_500_000,3743.90, 2026.00, "2.8L Cr");
        add("MARUTI",     "Maruti Suzuki",              "Auto",           12450.00, 0.0025,    800_000,13680.00,9832.00, "3.9L Cr");
        add("TATAMOTORS", "Tata Motors",                "Auto",             975.80, 0.0040, 22_000_000,1179.00,  609.00, "3.6L Cr");
        add("LT",         "Larsen & Toubro",            "Infra",           3650.20, 0.0022,  3_000_000,3912.00, 2841.00, "5.1L Cr");
        add("ASIANPAINT", "Asian Paints",               "Consumer",        2860.40, 0.0022,  1_800_000,3394.55, 2671.45, "2.7L Cr");
        add("SUNPHARMA",  "Sun Pharmaceutical",        "Pharma",           1785.60, 0.0028,  5_500_000,1960.00, 1125.00, "4.3L Cr");
        add("TITAN",      "Titan Company",              "Consumer",        3520.00, 0.0028,  3_500_000,3886.00, 3056.00, "3.1L Cr");
    }

    private void add(String sym, String name, String sector, double prev,
                     double vol, long baseVol, double wkH, double wkL, String mktCap) {
        stocks.put(sym, new Stock(sym, name, sector, prev, vol, baseVol, wkH, wkL, mktCap));
    }

    private void initIndices() {
        indices.add(new MarketIndex("NIFTY 50",      "NIFTY",     24500.00));
        indices.add(new MarketIndex("SENSEX",         "SENSEX",    80450.00));
        indices.add(new MarketIndex("NIFTY BANK",     "BANK NF",   52100.00));
        indices.add(new MarketIndex("NIFTY IT",       "NIFTY IT",  38500.00));
        indices.add(new MarketIndex("NIFTY AUTO",     "AUTO",      23200.00));
        indices.add(new MarketIndex("NIFTY PHARMA",   "PHARMA",    19800.00));
    }

    private synchronized void tick() {
        ThreadLocalRandom rng = ThreadLocalRandom.current();

        // Market-wide factor gives correlated moves across stocks
        double marketFactor = rng.nextGaussian() * 0.0008;

        for (Stock s : stocks.values()) {
            double idio = rng.nextGaussian() * s.volatility;
            double pctMove = 0.5 * marketFactor + 0.5 * idio;

            // Tiny mean-reversion pull toward open
            double revert = 0.00005 * (s.open - s.price) / s.open;
            double newPrice = s.price * (1.0 + pctMove + revert);
            newPrice = Math.max(1.0, Math.round(newPrice * 20.0) / 20.0); // 5-paise tick

            if (newPrice > s.high) s.high = newPrice;
            if (newPrice < s.low)  s.low  = newPrice;
            if (newPrice > s.weekHigh52) s.weekHigh52 = newPrice;
            if (newPrice < s.weekLow52)  s.weekLow52  = newPrice;

            s.price = newPrice;
            s.change = Math.round((newPrice - s.prev) * 100.0) / 100.0;
            s.changePercent = Math.round(((newPrice - s.prev) / s.prev) * 10000.0) / 100.0;

            long volAdd = (long) (s.baseVolume / 23400.0 * (1 + Math.abs(rng.nextGaussian()) * 1.5));
            s.volume += volAdd;

            s.sparkline.add(newPrice);
            if (s.sparkline.size() > 50) s.sparkline.remove(0);
        }

        // Update indices based on weighted average stock movement
        updateIndices();
    }

    private void updateIndices() {
        double[] baseValues = {24500.0, 80450.0, 52100.0, 38500.0, 23200.0, 19800.0};
        String[][] constituents = {
            {"RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BAJFINANCE","LT","TITAN","MARUTI"},
            {"RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BAJFINANCE","WIPRO","LT","SUNPHARMA"},
            {"HDFCBANK","ICICIBANK","SBIN","BAJFINANCE"},
            {"TCS","INFY","WIPRO"},
            {"MARUTI","TATAMOTORS"},
            {"SUNPHARMA"}
        };

        for (int i = 0; i < indices.size(); i++) {
            MarketIndex idx = indices.get(i);
            double avgPct = 0;
            int count = 0;
            for (String sym : constituents[i]) {
                Stock s = stocks.get(sym);
                if (s != null) { avgPct += s.changePercent; count++; }
            }
            if (count > 0) avgPct /= count;
            idx.value = Math.round(baseValues[i] * (1.0 + avgPct / 100.0) * 100.0) / 100.0;
            idx.change = Math.round((idx.value - baseValues[i]) * 100.0) / 100.0;
            idx.changePercent = Math.round(avgPct * 100.0) / 100.0;
        }
    }

    private MarketData snapshot() {
        ZonedDateTime ist = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
        String time = ist.format(timeFormat) + " IST";
        int hour = ist.getHour(), min = ist.getMinute();
        boolean open = (hour > 9 || (hour == 9 && min >= 15)) && (hour < 15 || (hour == 15 && min <= 30));
        return new MarketData(new ArrayList<>(stocks.values()), new ArrayList<>(indices), time, open ? "OPEN" : "CLOSED");
    }

    public Flux<MarketData> getMarketDataFlux() {
        return marketDataFlux;
    }

    public MarketData getCurrentSnapshot() {
        return snapshot();
    }
}
