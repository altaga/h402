import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import Anthropic from '@anthropic-ai/sdk';

/**
 * 🧠 MINIMAX-M3 FRONTIER TIER (Protected - JS Edition)
 * Price: 1.0 HBAR (~$0.05 - $0.10) per inference
 */

const minimaxApp = new Hono();

minimaxApp.post('/', requirePayment("0.05", "0.10"), async (c) => {
    try {
        const body = await c.req.json();
        const messages = body.messages || [{ role: "user", content: body.prompt || "Hello!" }];
        const toolsEnabled = c.req.header("X-Tools-Enabled") === "true";

        console.log(`[MINIMAX_INFERENCE] Routing to MiniMax-M3 API (Anthropic Compatible)`);

        const client = new Anthropic({
            baseURL: "https://api.minimax.io/anthropic",
            apiKey: process.env.MINIMAX_API_KEY,
        });

        // Initialize Anthropic call
        const response = await client.messages.create({
            model: "MiniMax-M3",
            max_tokens: body.max_tokens || 4096,
            messages: messages,
            // You can easily pass tools array here if toolsEnabled is true!
        });

        console.log(`[MINIMAX_SUCCESS] Inference complete. Decoding blocks...`);

        let finalAnswer = "";
        let thinkingProcess = "";

        // MiniMax M3 Anthropic endpoint returns interleaved blocks (thinking + text)
        for (const block of response.content) {
            if (block.type === "thinking") {
                thinkingProcess += block.thinking + "\n";
            } else if (block.type === "text") {
                finalAnswer += block.text + "\n";
            }
        }

        return c.json({
            status: "SUCCESS",
            message: finalAnswer.trim(),
            thinking: thinkingProcess.trim() || null,
            traceId: `minimax-${Date.now()}`,
            model: "MiniMax-M3",
            cost: "1.0 HBAR"
        });

    } catch (err) {
        console.error(`❌ [MINIMAX_CRASH]:`, err.message);

        if (err.message.includes("402") || err.message.includes("insufficient balance") || err.message.includes("1008")) {
            return c.json({
                status: "SUCCESS",
                message: "⚠️ **MiniMax API Balance Depleted**\n\nMy MiniMax API key has run out of credits (Error 1008). Please add balance to your MiniMax account to continue generating responses. \n\n*The x402 payment infrastructure is working perfectly, but the downstream AI provider rejected the request.*",
                thinking: null,
                traceId: `minimax-${Date.now()}`,
                model: "MiniMax-M3",
                cost: "1.0 HBAR"
            });
        }

        return c.json({ status: "ERROR", error: err.message }, 500);
    }
});

export default minimaxApp;
