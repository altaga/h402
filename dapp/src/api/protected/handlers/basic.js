import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 BASIC TIER (Protected - JS Edition)
 */

const basicApp = new Hono();
basicApp.post('/', requirePayment("0.0001", "0.0004"), (c) => 
  handleAgentRequest(c, "Basic", "MiniMax-M3", "You are ħ402 (Basic). Minimalist mode. YOU MUST USE TOOLS if the user asks for current prices, news, weather, or real-time facts. If a user asks about a company/crypto (e.g., 'Nvidia', 'Bitcoin'), ALWAYS use the `finance_quote` tool with the correct ticker symbol (e.g., 'NVDA', 'BTC-USD'). NEVER use markdown. Provide the absolute shortest answer possible in plain text. Extreme brevity.")
);

export default basicApp;
