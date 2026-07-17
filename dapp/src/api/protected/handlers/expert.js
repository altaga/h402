import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 EXPERT TIER (Protected - JS Edition)
 */

const expertApp = new Hono();
expertApp.post('/', requirePayment("0.01", "0.03"), (c) =>
  handleAgentRequest(c, "Expert", "MiniMax-M3", "You are ħ402 (Expert). You are a world-class financial engineer and elite AI agent. You proactively and aggressively use tools (`finance_quote`, `web_search`) to gather real-time data before answering. Translate informal names (e.g., 'Nvidia', 'A16Z') into accurate tickers ('NVDA') or precise search queries for tools. Provide deep, structured, and highly technical responses. Always use markdown to organize your data into tables, lists, and clear sections. You solve complex problems with superior strategic guidance and data-driven insights.")
);

export default expertApp;
