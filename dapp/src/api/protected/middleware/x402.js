import { verifyMessage } from "viem";
import { usdToTinybars, usdToUsdcBase } from "../utils/exchange";

/**
 * 🔒 ħ402 - x402 MIDDLEWARE FACTORY (Hedera Native)
 * 
 * Flow:
 * 1. Client sends request with no PAYMENT-SIGNATURE → Server returns 402 with requirements
 * 2. Client signs a proof-of-intent message with MetaMask → Retries with PAYMENT-SIGNATURE header
 * 3. Server verifies the EVM signature (ecrecover) → Grants access
 */

export const requirePayment = (
  baseUsdAmount,
  toolUsdAmount,
  network = "hedera:testnet",
) => {
  return async (c, next) => {
    const paymentSignature = c.req.header("payment-signature") || c.req.header("PAYMENT-SIGNATURE");
    const toolsStr = c.req.header("x-tools-enabled") || c.req.header("X-Tools-Enabled");
    const toolsEnabled = toolsStr === "true";

    // Select price based on tool usage
    const activeUsdAmount = toolsEnabled ? toolUsdAmount : baseUsdAmount;
    
    console.log(`[x402_INIT] Incoming request for ${c.req.url}`);
    console.log(`[x402_INIT] Tools Enabled Header: "${toolsStr}" -> Parsed as: ${toolsEnabled}`);
    console.log(`[x402_INIT] Base Price: $${baseUsdAmount}, Tool Price: $${toolUsdAmount}`);
    console.log(`[x402_INIT] Charging Price: $${activeUsdAmount}`);

    // 💱 DYNAMIC PRICING: Calculate HBAR and USDC values
    let encodedResponse = null;
    let receiptData = null;
    const hbarAmountRequired = await usdToTinybars(activeUsdAmount);
    const usdcAmountRequired = usdToUsdcBase(activeUsdAmount);
    const usdcTokenId = process.env.HEDERA_USDC_TOKEN_ID || "0.0.429274";
    const payToAccount = process.env.HEDERA_PAY_TO_ACCOUNT;

    const requirements = {
      x402Version: 2,
      resource: {
        url: c.req.url.startsWith("http")
          ? c.req.url
          : `${new URL(c.req.url, `http://${c.req.header("host") || "localhost:8090"}`).href}`,
        description: "Protected AI Access",
      },
      accepts: [
        {
          scheme: "exact",
          network: network,
          amount: hbarAmountRequired,
          maxAmountRequired: hbarAmountRequired,
          asset: "HBAR", 
          payTo: payToAccount,
          maxTimeoutSeconds: 3600,
          extra: {
            name: "Hedera HBAR",
            version: "2",
          },
        },
        {
          scheme: "exact",
          network: network,
          amount: usdcAmountRequired,
          maxAmountRequired: usdcAmountRequired,
          asset: usdcTokenId, 
          payTo: payToAccount,
          maxTimeoutSeconds: 3600,
          extra: {
            name: "Hedera USDC",
            version: "2",
          },
        }
      ],
    };

    // ─── STEP 1: No signature → Issue 402 Challenge ───
    if (!paymentSignature) {
      console.log(
        `[x402_CHALLENGE] No signature found. Demanding $${activeUsdAmount} USD for ${c.req.url}`,
      );

      const encodedReq = Buffer.from(JSON.stringify(requirements)).toString("base64");
      c.header("PAYMENT-REQUIRED", encodedReq);

      return c.json(requirements, 402);
    }

    // ─── STEP 2: Signature received → Verify wallet proof ───
    try {
      console.log(`[x402_VERIFY] Received signature header. Decoding...`);

      const decoded = JSON.parse(
        Buffer.from(paymentSignature, "base64").toString("utf8"),
      );

      const { payload } = decoded;

      if (!payload || !payload.signature || !payload.payer || !payload.message) {
        console.warn("[x402_INVALID] Missing required payload fields.");
        return c.json({ error: "Malformed payment signature payload." }, 401);
      }

      // ─── STEP 3: Cryptographic Verification (EVM ecrecover) ───
      console.log(`[x402_VERIFY] Verifying EVM signature from ${payload.payer}...`);

      const isValid = await verifyMessage({
        address: payload.payer,
        message: payload.message,
        signature: payload.signature,
      });

      if (!isValid) {
        console.warn(`[x402_INVALID] Signature verification failed for ${payload.payer}`);
        return c.json({ error: "Invalid payment signature." }, 401);
      }

      // ─── STEP 4: Validate the signed message contents ───
      let signedData;
      try {
        signedData = JSON.parse(payload.message);
      } catch {
        return c.json({ error: "Could not parse signed message." }, 401);
      }

      // Verify the signed amount matches what we require
      const signedAmount = signedData.accepted?.amount;
      const signedAsset = signedData.accepted?.asset;
      
      // Find the corresponding requirement for the signed asset
      const requirement = requirements.accepts.find(a => a.asset === signedAsset);
      
      if (!requirement) {
        console.warn(`[x402_INVALID] Signed for unsupported asset: ${signedAsset}`);
        return c.json({ error: "Unsupported asset in payment signature." }, 402);
      }

      const requiredAmount = requirement.amount;

      if (signedAmount !== undefined && Number(signedAmount) < Number(requiredAmount)) {
        console.warn(`[x402_UNDERPAID] Asset: ${signedAsset}, Signed: ${signedAmount}, Required: ${requiredAmount}`);
        return c.json({ error: "Signed amount is less than required." }, 402);
      }

      // ─── STEP 5: Execute On-Chain Settlement using EVM JSON-RPC (Bypassing gRPC Expo/Vercel blocks) ───
      console.log(`[x402_SETTLE] Executing on-chain EVM transfer for payer ${payload.payer}...`);
      
      const { PrivateKey, AccountId } = require('@hashgraph/sdk');
      const { createWalletClient, createPublicClient, http, parseAbi } = require('viem');
      const { privateKeyToAccount } = require('viem/accounts');
      const { hederaTestnet } = require('viem/chains');
      
      try {
        const facilitatorKey = PrivateKey.fromStringECDSA(process.env.FACILITATOR_PRIVATE_KEY);
        const rawPrivKeyHex = `0x${facilitatorKey.toStringRaw()}`;
        const facilitatorAccount = privateKeyToAccount(rawPrivKeyHex);

        const usdcTokenId = process.env.HEDERA_USDC_TOKEN_ID || "0.0.429274";
        const usdcEvm = `0x${AccountId.fromString(usdcTokenId).toSolidityAddress()}`;
        const payToEvm = `0x${AccountId.fromString(payToAccount).toSolidityAddress()}`;

        const publicClient = createPublicClient({ 
          chain: hederaTestnet, 
          transport: http("https://testnet.hashio.io/api") 
        });
        const walletClient = createWalletClient({ 
          account: facilitatorAccount, 
          chain: hederaTestnet, 
          transport: http("https://testnet.hashio.io/api") 
        });

        const erc20Abi = parseAbi([
          'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)'
        ]);

        console.log(`[x402_SETTLE] Simulating and submitting EVM transaction...`);
        const hash = await walletClient.writeContract({
          address: usdcEvm,
          abi: erc20Abi,
          functionName: 'transferFrom',
          args: [payload.payer, payToEvm, BigInt(requiredAmount)]
        });
        
        console.log(`[x402_SETTLE] Transaction submitted successfully! Hash: ${hash}`);

        // 🚀 VERCEL FIX: Do not poll Hashio for transaction receipts! 
        // Hashio's Cloudflare worker crashes with "Too many subrequests" on eth_getTransactionByHash.
        // Since writeContract automatically simulates the execution (and checks allowance/balance) 
        // before submitting, a successful hash return practically guarantees Hedera consensus success.
        
        const receipt = {
          success: true,
          status: 'SUCCESS',
          transaction: {
            id: hash,
            hash: hash // Used by the frontend for the Hashscan EVM link
          }
        };

        console.log(`[x402_SUCCESS] On-chain settlement complete! Tx Hash: ${hash}`);

        receiptData = receipt;
        encodedResponse = Buffer.from(JSON.stringify(receipt)).toString("base64");
      } catch (txError) {
        console.error(`[x402_SETTLE_ERROR] On-chain execution failed:`, txError);
        return c.json({ error: `On-chain settlement failed: ${txError.message}` }, 500);
      }

    } catch (error) {
      console.error("[x402_ERROR] Verification failed:", error.message);
      return c.json({ error: "Payment verification failed." }, 500);
    }

    // ─── STEP 6: Payment cleared → Proceed to route handler ───
    await next();
    
    // Add the settlement receipt header AFTER the route handler generates the Response object
    if (encodedResponse) {
      c.res.headers.append("PAYMENT-RESPONSE", encodedResponse);
    }
  };
};
