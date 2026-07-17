import { Hono } from 'hono';
import { x402Facilitator } from '@x402/core/facilitator';
import {
  PrivateKey,
  createHederaClient,
  createHederaPreflightTransfer,
  createHederaSignAndSubmitTransaction,
  toFacilitatorHederaSigner,
} from '@x402/hedera';
import { ExactHederaScheme } from '@x402/hedera/exact/facilitator';
import { cors } from 'hono/cors';

/**
 * 🏭 INTEGRATED X402 FACILITATOR (Hono Edition)
 * Mounts directly into the main app instead of a separate microservice.
 */

const app = new Hono().basePath('/api/facilitator');

// The Facilitator is explicitly PUBLIC. Anyone can orchestrate payments through it.
app.use('*', cors({ origin: '*' }));

const NETWORK = process.env.X402_NETWORK || "hedera:testnet";
const FEE_PAYER_ID = process.env.FACILITATOR_ACCOUNT_ID;
const FEE_PAYER_KEY_STR = process.env.FACILITATOR_PRIVATE_KEY;

let facilitator;
try {
  if (!FEE_PAYER_ID || !FEE_PAYER_KEY_STR) {
    throw new Error("FACILITATOR_ACCOUNT_ID and FACILITATOR_PRIVATE_KEY env vars are required.");
  }
  const FEE_PAYER_KEY = PrivateKey.fromStringECDSA(FEE_PAYER_KEY_STR);

  const buildClient = (network) => {
    const client = createHederaClient(network);
    client.setOperator(FEE_PAYER_ID, FEE_PAYER_KEY);
    return client;
  };

  const signer = toFacilitatorHederaSigner({
    getAddresses: () => [FEE_PAYER_ID],
    signAndSubmitTransaction: createHederaSignAndSubmitTransaction(buildClient, FEE_PAYER_KEY),
    preflightTransfer: createHederaPreflightTransfer(buildClient),
  });

  facilitator = new x402Facilitator().register(
    NETWORK, 
    new ExactHederaScheme(signer, { aliasPolicy: "reject" })
  );
} catch (e) {
  console.error("[FACILITATOR_INIT_ERROR]", e.message);
}


// --- API ROUTES ---

app.get('/health', (c) => {
  return c.json({ status: "ok", network: NETWORK, feePayer: FEE_PAYER_ID });
});

app.get('/supported', (c) => {
  if (!facilitator) return c.json({ error: "Facilitator not initialized" }, 500);
  return c.json(facilitator.getSupported());
});

app.post('/verify', async (c) => {
  if (!facilitator) return c.json({ error: "Facilitator not initialized" }, 500);
  try {
    const body = await c.req.json();
    const result = await facilitator.verify(body.paymentPayload, body.paymentRequirements);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/settle', async (c) => {
  if (!facilitator) return c.json({ error: "Facilitator not initialized" }, 500);
  try {
    const body = await c.req.json();
    const result = await facilitator.settle(body.paymentPayload, body.paymentRequirements);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Expo Router Catch-All
export const GET = (req) => app.fetch(req);
export const POST = (req) => app.fetch(req);
