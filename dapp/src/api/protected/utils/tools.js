import yahooFinance from "yahoo-finance2";
import stockDb from "./stock-db.json";

/**
 * 🛠️ ħ402 AGENT TOOLS
 * 
 * Production-ready tools for search, finance, and weather.
 */

// 1. WEB SEARCH (Wikipedia & Yahoo News Fallback)
export const searchTool = {
    name: "web_search",
    description: "Search for real-time information, news, and facts.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query" }
        },
        required: ["query"]
    },
    execute: async ({ query }) => {
        try {
            // First try Yahoo Finance News for recent business/finance context
            try {
                const yfSearch = await yahooFinance.search(query);
                if (yfSearch && yfSearch.news && yfSearch.news.length > 0) {
                    return JSON.stringify(yfSearch.news.slice(0, 3).map(n => ({
                        title: n.title,
                        snippet: n.publisher || "Yahoo Finance News",
                        url: n.link
                    })));
                }
            } catch (e) {
                console.warn("[WEB_SEARCH] Yahoo search failed, falling back to Wikipedia", e.message);
            }

            // Fallback to Wikipedia for general facts
            const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`);
            const data = await res.json();
            
            if (data.query && data.query.search && data.query.search.length > 0) {
                return JSON.stringify(data.query.search.slice(0, 3).map(r => ({
                    title: r.title,
                    snippet: r.snippet.replace(/<[^>]*>?/gm, '').trim(),
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`
                })));
            }
            
            return `No search results found for: ${query}`;
        } catch (err) {
            return `Search failed: ${err.message}`;
        }
    }
};

// 2. FINANCE (Yahoo Finance)
export const financeTool = {
    name: "finance_quote",
    description: "Get real-time stock prices, market data, and financial info.",
    parameters: {
        type: "object",
        properties: {
            symbol: { type: "string", description: "The stock symbol (e.g., AAPL, BTC-USD)" }
        },
        required: ["symbol"]
    },
    execute: async ({ symbol }) => {
        try {
            const upperSymbol = symbol.toUpperCase();
            
            // 1. Check local DB first (Top 50 + Crypto)
            if (stockDb[upperSymbol]) {
                const entry = stockDb[upperSymbol];
                return JSON.stringify({
                    symbol: entry.symbol,
                    price: entry.price,
                    change: entry.change,
                    currency: entry.currency,
                    marketState: entry.marketState,
                    displayName: entry.displayName,
                    source: "Finance API Tool",
                    updatedAt: entry.updatedAt
                });
            }

            // 2. Fallback to Live Yahoo Finance for other symbols
            const quote = await yahooFinance.quote(upperSymbol);
            return JSON.stringify({
                symbol: quote.symbol,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChangePercent,
                currency: quote.currency,
                marketState: quote.marketState,
                displayName: quote.displayName || quote.shortName || upperSymbol,
                source: "Finance API Tool",
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            return `Finance lookup failed: ${err.message}`;
        }
    }
};

// 3. WEATHER (Open-Meteo)
export const weatherTool = {
    name: "get_weather",
    description: "Get current weather for a city or coordinates.",
    parameters: {
        type: "object",
        properties: {
            location: { type: "string", description: "City name or 'lat,lon'" }
        },
        required: ["location"]
    },
    execute: async ({ location }) => {
        try {
            // Simplified: Geocode city name if possible, or assume it's coordinates
            // For now, let's just use a public weather API directly
            const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
            const data = await response.json();
            const current = data.current_condition[0];
            return JSON.stringify({
                temp_C: current.temp_C,
                condition: current.weatherDesc[0].value,
                humidity: current.humidity,
                wind: current.windspeedKmph
            });
        } catch (err) {
            return `Weather lookup failed: ${err.message}`;
        }
    }
};

export const ALL_TOOLS = [searchTool, financeTool, weatherTool];

export const executeTool = async (toolCall) => {
    const tool = ALL_TOOLS.find(t => t.name === toolCall.function.name);
    if (!tool) return `Tool ${toolCall.function.name} not found.`;

    try {
        const args = JSON.parse(toolCall.function.arguments);
        return await tool.execute(args);
    } catch (err) {
        return `Error executing ${toolCall.function.name}: ${err.message}`;
    }
};
