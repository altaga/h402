import { parseAgentOutput, MinimaxAgent } from "../../../core/llm";
import { ALL_TOOLS } from "./tools";

/**
 * 🛠️ PROTECTED AGENT HANDLER
 * 
 * Localized logic for protected agent requests.
 * Secured via x402 on the mounting Hub.
 */

export const handleAgentRequest = async (c, tier, modelName, systemPrompt) => {
    const traceId = c.req.header("X-ħ402-Trace-Id") || `trace-${Date.now()}`;
    const toolsEnabled = c.req.header("X-Tools-Enabled") === "true";
    const body = await c.req.json();
    const message = body.message || body.prompt;
    const history = body.history || [];

    console.log(`[HANDLER_START] Tier: ${tier} | Model: ${modelName}`);
    
    // 1. Create Fresh Agent (REUSED across iterations)
    let agent = null;

    try {
        let currentMessages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        const config = {
            tools: toolsEnabled ? ALL_TOOLS.map(t => ({
                type: "function",
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            })) : []
        };

        let iteration = 0;
        const maxIterations = 5;
        let finalContent = "";
        let lastReceipt = null;

        // Initialize agent once
        agent = new MinimaxAgent({ agentName: `ħ402-${tier}` });
        await agent.create(modelName);

        while (iteration < maxIterations) {
            iteration++;
            
            // 2. Perform ONE LLM Turn
            const turn = await agent.invoke(currentMessages, config);
            lastReceipt = turn.receipt;
            
            console.log(`[HANDLER_TURN_COMPLETE] Iteration ${iteration} turn complete.`);

            currentMessages.push(turn.message);
            
            if (turn.toolCalls.length === 0) {
                finalContent = turn.content;
                break;
            }

            // 3. Execute Tools Independently (PARALLELIZED)
            console.log(`[HANDLER_TOOLS] Executing ${turn.toolCalls.length} tools...`);
            const toolResults = await Promise.all(turn.toolCalls.map(async (toolCall) => {
                const name = toolCall.function.name;
                const args = toolCall.function.arguments;
                
                try {
                    const tool = ALL_TOOLS.find(t => t.name === name);
                    const result = tool ? await tool.execute(JSON.parse(args)) : `Tool ${name} not found.`;

                    return {
                        type: "tool_result",
                        tool_use_id: toolCall.id,
                        content: typeof result === "string" ? result : JSON.stringify(result)
                    };
                } catch (err) {
                    return { 
                        type: "tool_result", 
                        tool_use_id: toolCall.id, 
                        content: `Error: ${err.message}`,
                        is_error: true
                    };
                }
            }));

            for (const res of toolResults) {
                currentMessages.push({
                    role: "tool",
                    tool_call_id: res.tool_use_id,
                    name: turn.toolCalls.find(tc => tc.id === res.tool_use_id)?.function?.name || "tool",
                    content: res.content
                });
            }
            console.log(`[HANDLER_ITERATION_${iteration}_COMPLETE] Ready for re-invocation.`);
        }

        const parsed = parseAgentOutput(finalContent);

        return c.json({
            status: "SUCCESS",
            message: parsed.content,
            traceId: traceId,
            receipt: lastReceipt
        });

    } catch (err) {
        console.error(`❌ [${tier}_CRASH]:`, err.message);

        // Gracefully handle MiniMax API balance issues so the app doesn't crash
        if (err.message.includes("402") || err.message.includes("insufficient balance") || err.message.includes("1008")) {
            return c.json({
                status: "SUCCESS",
                message: "⚠️ **MiniMax API Balance Depleted**\n\nMy MiniMax API key has run out of credits (Error 1008). Please add balance to your MiniMax account to continue generating responses. \n\n*The x402 payment infrastructure is working perfectly, but the downstream AI provider rejected the request.*",
                traceId: traceId,
                receipt: null
            });
        }

        return c.json({ status: "ERROR", error: err.message, traceId }, 500);
    } finally {
        if (agent) await agent.destroy();
    }
};
