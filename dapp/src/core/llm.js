/**
 * 🤖 ħ402 - LEAN LLM UTILS
 * 
 * Standardized message building and parsing.
 * Implements the MinimaxAgent for Hedera ħ402 using Anthropic API Format.
 */

// ── Chat History Builder ──────────────────────────────────────────────────────
export function buildChatHistory(rawHistory = []) {
  return rawHistory.slice(-10).map(msg => ({
    role: msg.role === "human" || msg.role === "user" ? "user" : "assistant",
    content: msg.content
  }));
}

// ── Output Parser ─────────────────────────────────────────────────────────────
export function parseAgentOutput(output) {
    const stripThink = (text) => text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (typeof output === "string") return { content: stripThink(output) };
    
    const content = output?.text || output?.content || "";
    return { 
        content: stripThink(content) || "Agent responded with an empty message." 
    };
}

// ── MINIMAX AGENT ─────────────────────────────────────────────────────────────
export class MinimaxAgent {
    constructor(config) {
        this.agentName = config.agentName || "Agent";
        this.tracker = config.tracker || null;
        this.currentProvider = "MiniMax";
    }

    async create(modelName) {
        // Upgrade to the frontier M3 model to support Anthropic formats and 1M context
        this.currentModel = "MiniMax-M3"; 
        return this;
    }

    async invoke(messagesOrInput, config = {}) {
        let messages = messagesOrInput.messages || messagesOrInput;
        const tools = config.tools || [];
        
        const apiKey = process.env.MINIMAX_API_KEY;
        const baseUrl = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");

        if (!apiKey) {
            throw new Error("MINIMAX_API_KEY is missing from environment variables.");
        }

        // In OpenAI format, we can just pass the messages array.
        // Make sure system prompt is at the top, which it usually is.

        const body = {
            model: this.currentModel,
            messages: messages,
            stream: false
        };

        if (tools.length > 0) {
            body.tools = tools;
        }

        let endpoint = baseUrl;
        if (!endpoint.includes("/chat/completions")) {
            endpoint = `${baseUrl}/chat/completions`;
        }

        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`MiniMax API Error: ${res.status} ${err}`);
        }

        const data = await res.json();
        
        let finalContent = "";
        let toolCalls = [];
        
        if (data.choices && data.choices[0]) {
            const msg = data.choices[0].message;
            if (msg.content) {
                finalContent = msg.content;
            }
            if (msg.tool_calls) {
                for (const toolCall of msg.tool_calls) {
                    toolCalls.push({
                        id: toolCall.id,
                        function: {
                            name: toolCall.function.name,
                            arguments: toolCall.function.arguments
                        }
                    });
                }
            }
        }

        const responseMessage = {
            role: "assistant",
            content: finalContent // Simplified for OpenAI
        };

        if (toolCalls.length > 0) {
            responseMessage.tool_calls = toolCalls.map(tc => ({
                id: tc.id,
                type: "function",
                function: tc.function
            }));
        }

        return {
            message: responseMessage,
            content: finalContent.trim(),
            toolCalls: toolCalls,
            receipt: data.usage || null
        };
    }

    async destroy() {
        this.tracker = null;
    }
}
