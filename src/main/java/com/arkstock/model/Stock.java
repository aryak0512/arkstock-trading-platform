package com.arkstock.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;

public class Stock {
    public String symbol;
    public String name;
    public String sector;
    public double price;
    public double open;
    public double high;
    public double low;
    public double prev;
    public double change;
    public double changePercent;
    public long volume;
    public double weekHigh52;
    public double weekLow52;
    public String marketCap;
    public List<Double> sparkline = new ArrayList<>();

    @JsonIgnore public double volatility;
    @JsonIgnore public long baseVolume;

    public Stock() {}

    public Stock(String symbol, String name, String sector,
                 double prevClose, double volatility, long baseVolume,
                 double weekHigh52, double weekLow52, String marketCap) {
        this.symbol = symbol;
        this.name = name;
        this.sector = sector;
        this.prev = prevClose;
        this.open = prevClose;
        this.price = prevClose;
        this.high = prevClose;
        this.low = prevClose;
        this.change = 0;
        this.changePercent = 0;
        this.volume = 0;
        this.volatility = volatility;
        this.baseVolume = baseVolume;
        this.weekHigh52 = weekHigh52;
        this.weekLow52 = weekLow52;
        this.marketCap = marketCap;
        for (int i = 0; i < 40; i++) sparkline.add(prevClose);
    }
}
