package com.arkstock.controller;

import com.arkstock.model.MarketData;
import com.arkstock.service.StockSimulatorService;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
public class StockController {

    private final StockSimulatorService simulatorService;

    public StockController(StockSimulatorService simulatorService) {
        this.simulatorService = simulatorService;
    }

    @GetMapping("/snapshot")
    public Mono<MarketData> snapshot() {
        return Mono.just(simulatorService.getCurrentSnapshot());
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<MarketData>> stream() {
        return simulatorService.getMarketDataFlux()
                .map(data -> ServerSentEvent.<MarketData>builder()
                        .event("market-update")
                        .data(data)
                        .build());
    }
}
