import { Hono } from 'hono';
import * as handlers from '../../../api/protected/handlers';
import { cors } from 'hono/cors'; 

/**
 * 🧠 PROTECTED API HUB (JS Edition)
 */

const app = new Hono().basePath('/api/protected');

// 1. GLOBAL MIDDLEWARE
app.use('*', async (c, next) => {
  c.set('logger', (msg) => console.log(`[SYS]: ${msg}`));
  await next();
});

app.use('*', cors({
  origin: (origin) => {
    const allowed = ['https://h402.expo.app', 'http://localhost:8090', 'http://localhost:8081'];
    return allowed.includes(origin) ? origin : 'https://h402.expo.app';
  },
  exposeHeaders: ['PAYMENT-RESPONSE', 'PAYMENT-REQUIRED'],
}));

// 2. ROOT DISCOVERY ROUTE
app.get('/', (c) => {
  return c.json({
    status: "PROTECTED",
    message: "Welcome to the Hedera x402 AI Gateway.",
    architecture: "The AI endpoints are FULLY PROTECTED and locked behind Hedera smart contract settlement. The only public endpoint is the Facilitator.",
    endpoints: {
      facilitator: "POST /api/public/settle (PUBLIC - Handles USDC payments)",
      basic: "POST /api/protected/basic (PROTECTED - 0.0001 USDC)",
      advance: "POST /api/protected/advance (PROTECTED - 0.02 USDC)",
      expert: "POST /api/protected/expert (PROTECTED - 0.05 USDC)"
    },
    documentation: "You must first settle payment via the public Facilitator to receive an X-Signature. Attach the X-Signature to access the protected AI routes."
  });
});

// 3. AUTO-MOUNT THE ROUTES
Object.entries(handlers).forEach(([routeName, subApp]) => {
  app.route(`/${routeName}`, subApp);
});

// 3. EXPORT TO EXPO ROUTER
export const GET = (req) => app.fetch(req);
export const POST = (req) => app.fetch(req);
export const PUT = (req) => app.fetch(req);
export const DELETE = (req) => app.fetch(req);
