import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 ADVANCE TIER (Protected - JS Edition)
 */

const advanceApp = new Hono();
advanceApp.post('/', requirePayment("0.001", "0.003"), (c) =>
  handleAgentRequest(c, "Advance", "MiniMax-M3", "You are ħ402 (Advance). You are a standard assistant. YOU MUST USE TOOLS for real-time information, stock prices, weather, and current events. If a user asks about an entity (e.g., 'A16Z', 'Nvidia'), translate it into the correct search query or stock ticker (e.g., 'NVDA') and trigger the appropriate tool immediately. You can use markdown for formatting when helpful, but keep your responses concise and middle-of-the-road.")
);

export default advanceApp;
