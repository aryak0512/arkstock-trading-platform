package com.arkstock.model;

import java.util.List;

public class MarketData {
    public List<Stock> stocks;
    public List<MarketIndex> indices;
    public String timestamp;
    public String marketStatus;

    public MarketData(List<Stock> stocks, List<MarketIndex> indices,
                      String timestamp, String marketStatus) {
        this.stocks = stocks;
        this.indices = indices;
        this.timestamp = timestamp;
        this.marketStatus = marketStatus;
    }
}
