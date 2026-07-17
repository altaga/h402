import { Hono } from 'hono';

/**
 * ℹ️ INFO SUB-APP (JS Edition)
 */

const infoApp = new Hono();

infoApp.get('/status', async (c) => {
  return c.json({ 
    success: true, 
    status: "ħ402 Node Operational",
    network: "Hedera Testnet",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

infoApp.get('/health', async (c) => {
  return c.json({ status: "healthy", uptime: process.uptime() });
});

export default infoApp;
