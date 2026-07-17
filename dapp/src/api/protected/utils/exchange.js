/**
 * 💱 HEDERA EXCHANGE RATE ORACLE
 * Fetches the live HBAR/USD conversion rate from the Hedera Mirror Node.
 * Caches the rate for 5 minutes to avoid rate limits and latency.
 */

let cachedRate = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getHbarUsdRate = async () => {
    const now = Date.now();
    
    // Return cache if valid
    if (cachedRate !== null && (now - lastFetchTime) < CACHE_TTL) {
        return cachedRate;
    }

    try {
        const network = process.env.HEDERA_NETWORK || "testnet";
        const mirrorNode = network === "mainnet" 
            ? "https://mainnet-public.mirrornode.hedera.com" 
            : "https://testnet.mirrornode.hedera.com";
            
        const response = await fetch(`${mirrorNode}/api/v1/network/exchangerate`);
        if (!response.ok) throw new Error(`Mirror Node returned ${response.status}`);
        
        const data = await response.json();
        const currentRate = data.current_rate;
        
        // Rate format: 1 HBAR (in tinybars) / hbar_equivalent * cent_equivalent = cents
        // We want: USD per 1 HBAR
        const usdPerHbar = (currentRate.cent_equivalent / 100) / currentRate.hbar_equivalent;
        
        cachedRate = usdPerHbar;
        lastFetchTime = now;
        
        console.log(`[EXCHANGE_ORACLE] Fetched live rate: 1 HBAR = $${usdPerHbar.toFixed(4)} USD`);
        
        return cachedRate;
    } catch (err) {
        console.warn(`[EXCHANGE_ORACLE_ERROR] Failed to fetch rate:`, err.message);
        // Fallback to a safe default ($0.05 per HBAR) if mirror node goes down
        return cachedRate || 0.05; 
    }
};

/**
 * Converts a USD value to tinybars based on the live exchange rate.
 * 1 HBAR = 100,000,000 tinybars.
 * @param {number|string} usdAmount The price in USD
 * @returns {string} The amount in tinybars as a string
 */
export const usdToTinybars = async (usdAmount) => {
    const rate = await getHbarUsdRate();
    const hbarAmount = parseFloat(usdAmount) / rate;
    const tinybars = Math.floor(hbarAmount * 100000000);
    return tinybars.toString();
};

/**
 * Converts a USD value to USDC base units.
 * USDC on Hedera has 6 decimals. (e.g., $1.00 = 1000000)
 * @param {number|string} usdAmount The price in USD
 * @returns {string} The amount in USDC base units as a string
 */
export const usdToUsdcBase = (usdAmount) => {
    const baseUnits = Math.floor(parseFloat(usdAmount) * 1000000);
    return baseUnits.toString();
};
