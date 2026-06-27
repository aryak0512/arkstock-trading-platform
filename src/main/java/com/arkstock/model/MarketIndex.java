package com.arkstock.model;

public class MarketIndex {
    public String name;
    public String shortName;
    public double value;
    public double change;
    public double changePercent;

    public MarketIndex() {}

    public MarketIndex(String name, String shortName, double baseValue) {
        this.name = name;
        this.shortName = shortName;
        this.value = baseValue;
        this.change = 0;
        this.changePercent = 0;
    }
}
