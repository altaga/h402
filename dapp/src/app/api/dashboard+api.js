/**
 * 📊 ADMIN DASHBOARD API (ħ402 OPTIMIZED)
 * 
 * Hedera Native Treasury + Facilitator Health Stats
 * Queries the Hedera Mirror Node for real-time on-chain data.
 */

export async function GET(req) {
  try {
    const operatorId = process.env.HEDERA_CLIENT_ID || "0.0.9562514";
    const usdcTokenId = process.env.HEDERA_USDC_TOKEN_ID || "0.0.429274";
    const facilitatorId = process.env.FACILITATOR_ACCOUNT_ID || "0.0.9572127";
    const sellerId = process.env.HEDERA_PAY_TO_ACCOUNT || "0.0.9562775";
    const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";

    // ── OPERATOR TREASURY ──────────────────────────────────────────────────
    const mirrorRes = await fetch(`${MIRROR}/accounts/${operatorId}`);
    const mirrorData = await mirrorRes.json();
    
    let opHbar = 0;
    let opUsdc = 0;
    let opEvmAddress = "N/A";
    let opCreatedAt = null;

    if (mirrorData) {
      opEvmAddress = mirrorData.evm_address || "N/A";
      opCreatedAt = mirrorData.created_timestamp || null;
      if (mirrorData.balance) {
        opHbar = mirrorData.balance.balance / 100000000;
        const usdcToken = mirrorData.balance.tokens?.find(t => t.token_id === usdcTokenId);
        if (usdcToken) opUsdc = usdcToken.balance / 1000000;
      }
    }

    // ── SELLER TREASURY ────────────────────────────────────────────────────
    let sellerEvmAddress = "N/A";
    let sellerHbar = 0;
    let sellerUsdc = 0;
    let sellerCreatedAt = null;

    try {
      const sellerRes = await fetch(`${MIRROR}/accounts/${sellerId}`);
      if (sellerRes.ok) {
        const mirrorData = await sellerRes.json();
        sellerEvmAddress = mirrorData.evm_address || "N/A";
        sellerCreatedAt = mirrorData.created_timestamp || null;
        if (mirrorData.balance) {
          sellerHbar = mirrorData.balance.balance / 100000000;
          const usdcToken = mirrorData.balance.tokens?.find(t => t.token_id === usdcTokenId);
          if (usdcToken) sellerUsdc = usdcToken.balance / 1000000;
        }
      }
    } catch (_) {}

    // ── HBAR MARKET PRICE ──────────────────────────────────────────────────
    let hbarPrice = 0.065; // Fallback
    try {
      const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd", {
        signal: AbortSignal.timeout(3000)
      });
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        if (priceData["hedera-hashgraph"]?.usd) {
          hbarPrice = priceData["hedera-hashgraph"].usd;
        }
      }
    } catch (_) { /* Use fallback */ }

    // ── FACILITATOR HEALTH ─────────────────────────────────────────────────
    let facEvmAddress = "Unknown";
    let facHbar = 0;
    let facUsdc = 0;
    let facTxCount = 0;
    let facVolume = 0;
    let facCreatedAt = null;
    let recentTxs = [];

    try {
      const facRes = await fetch(`${MIRROR}/accounts/${facilitatorId}`);
      if (facRes.ok) {
        const facData = await facRes.json();
        if (facData.evm_address) facEvmAddress = facData.evm_address;
        facCreatedAt = facData.created_timestamp || null;
        if (facData.balance) {
          facHbar = facData.balance.balance / 100000000;
          const usdcToken = facData.balance.tokens?.find(t => t.token_id === usdcTokenId);
          if (usdcToken) facUsdc = usdcToken.balance / 1000000;
        }
      }

      // Fetch recent settlements (Querying Seller ID because EVM spawns child CRYPTOTRANSFERs for token movements)
      const txRes = await fetch(`${MIRROR}/transactions?account.id=${sellerId}&transactiontype=CRYPTOTRANSFER&limit=100&order=desc`);
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.transactions) {
          for (const tx of txData.transactions) {
            if (tx.result === "SUCCESS") {
              facTxCount++;
              let txUsdc = 0;
              for (const transfer of tx.token_transfers) {
                if (transfer.token_id === usdcTokenId && transfer.amount > 0) {
                  txUsdc += transfer.amount / 1000000;
                  facVolume += transfer.amount / 1000000;
                }
              }

              // Collect recent 5 for the activity feed
              if (recentTxs.length < 5 && txUsdc > 0) {
                const txIdStr = tx.transaction_id || "";
                const [accPart, tsPart] = txIdStr.split("-").length > 2 
                  ? [txIdStr.split("-").slice(0, 3).join(".").replace(/\./g, (m, i) => i < 5 ? m : "-"), ""]
                  : [txIdStr, ""];
                
                recentTxs.push({
                  id: tx.transaction_id,
                  hashscanId: tx.transaction_id ? tx.transaction_id.replace(/-(\d+)-(\d+)$/, "-$1-$2") : "",
                  amount: txUsdc.toFixed(6),
                  timestamp: tx.consensus_timestamp,
                  status: tx.result
                });
              }
            }
          }
        }
      }
    } catch (fErr) {
      console.warn("[DASHBOARD] Failed to fetch facilitator data:", fErr.message);
    }

    // ── ASSEMBLE RESPONSE ──────────────────────────────────────────────────
    const result = {
      success: true,
      timestamp: Date.now(),
      network: "testnet",
      usdcTokenId,
      hbarPrice,

      operator: {
        id: operatorId,
        evm: opEvmAddress,
        hbar: opHbar.toFixed(4),
        hbarUsd: (opHbar * hbarPrice).toFixed(2),
        usdc: opUsdc.toFixed(6),
        createdAt: opCreatedAt
      },

      seller: {
        id: sellerId,
        evm: sellerEvmAddress,
        hbar: sellerHbar.toFixed(4),
        hbarUsd: (sellerHbar * hbarPrice).toFixed(2),
        usdc: sellerUsdc.toFixed(6),
        createdAt: sellerCreatedAt
      },

      facilitator: {
        id: facilitatorId,
        evm: facEvmAddress,
        hbar: facHbar.toFixed(4),
        hbarUsd: (facHbar * hbarPrice).toFixed(2),
        usdc: facUsdc.toFixed(6),
        txCount: facTxCount,
        volume: facVolume.toFixed(6),
        createdAt: facCreatedAt,
        endpoint: "https://h402.expo.app/api/public",
        recentTxs
      }
    };

    return Response.json(result);

  } catch (err) {
    console.error("[DASHBOARD_API_ERROR]", err);
    return Response.json({ 
      success: false, 
      error: err.message,
    }, { status: 500 });
  }
}
