import OllamaClient from '../infrastructure/ollamaClient.js';
import ChatHistory from '../domain/chatHistory.js';
import ToolManager from './toolManager.js';
import SystemPromptGenerator from '../infrastructure/systemPromptGenerator.js';

class ChatService {
    constructor(ollamaClient = null, chatHistory = null, toolManager = null) {
        this.toolManager = toolManager || new ToolManager();
        this.chatHistory = chatHistory || new ChatHistory();
        
        // Generate system prompt with tool information
        const systemPromptGenerator = new SystemPromptGenerator(this.toolManager);
        const systemPrompt = systemPromptGenerator.generateSystemPrompt();
        
        // Create OllamaClient with generated system prompt
        // Use undefined to preserve defaults for baseUrl and model
        this.ollamaClient = ollamaClient || new OllamaClient(undefined, undefined, true, systemPrompt);
        
        // If OllamaClient was provided, update its system prompt
        if (ollamaClient) {
            this.ollamaClient.setSystemPrompt(systemPrompt);
        }
    }

    /**
     * Parse structured tool calls from AI response
     * Looks for JSON objects with format: {"action": "tool_call", "tool": "...", "action_name": "...", "params": {...}}
     * The "action_name" field is optional - if omitted, the tool's default action will be used
     */
    parseStructuredToolCalls(responseText) {
        const toolCalls = [];
        
        // First, try to extract JSON from code blocks (most common format)
        const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
        let codeBlockMatch;
        const processedBlocks = new Set();
        
        while ((codeBlockMatch = codeBlockPattern.exec(responseText)) !== null) {
            const jsonStr = codeBlockMatch[1].trim();
            if (processedBlocks.has(jsonStr)) continue;
            processedBlocks.add(jsonStr);
            
            try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.action === 'tool_call' && parsed.tool && parsed.params) {
                    toolCalls.push({
                        tool: parsed.tool,
                        action: parsed.action_name || null, // Support optional action_name field
                        params: parsed.params
                    });
                }
            } catch (e) {
                // Skip invalid JSON
                continue;
            }
        }
        
        // If no tool calls found in code blocks, try to find standalone JSON objects
        if (toolCalls.length === 0) {
            // Look for JSON objects that contain "action": "tool_call"
            const jsonPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*"action"\s*:\s*"tool_call"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
            const matches = responseText.match(jsonPattern);
            
            if (matches) {
                for (const match of matches) {
                    try {
                        const parsed = JSON.parse(match);
                        if (parsed.action === 'tool_call' && parsed.tool && parsed.params) {
                            toolCalls.push({
                                tool: parsed.tool,
                                action: parsed.action_name || null, // Support optional action_name field
                                params: parsed.params
                            });
                        }
                    } catch (e) {
                        // Try a more robust approach: find balanced braces
                        const balancedJson = this.extractBalancedJson(match);
                        if (balancedJson) {
                            try {
                                const parsed = JSON.parse(balancedJson);
                                if (parsed.action === 'tool_call' && parsed.tool && parsed.params) {
                                    toolCalls.push({
                                        tool: parsed.tool,
                                        action: parsed.action_name || null, // Support optional action_name field
                                        params: parsed.params
                                    });
                                }
                            } catch (e2) {
                                // Skip invalid JSON
                                continue;
                            }
                        }
                    }
                }
            }
        }
        
        return toolCalls;
    }
    
    /**
     * Extract balanced JSON object from string
     */
    extractBalancedJson(str) {
        let braceCount = 0;
        let startIndex = -1;
        
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '{') {
                if (startIndex === -1) startIndex = i;
                braceCount++;
            } else if (str[i] === '}') {
                braceCount--;
                if (braceCount === 0 && startIndex !== -1) {
                    return str.substring(startIndex, i + 1);
                }
            }
        }
        
        return null;
    }

    async sendMessage(userInput) {
        try {
            console.log(this.chatHistory);
            // Add user message to history
            this.chatHistory.addMessage('human', userInput);

            // Get AI response
            const response = await this.ollamaClient.sendMessage(
                this.chatHistory.getMessages(),
                userInput
            );

            const responseText = response.content || '';
            
            // Parse structured tool calls from response
            const toolCalls = this.parseStructuredToolCalls(responseText);
            
            if (toolCalls.length > 0) {
                // Execute tools
                const toolResults = [];
                for (const toolCall of toolCalls) {
                    try {
                        const result = await this.toolManager.executeTool(toolCall.tool, toolCall.params, toolCall.action);
                        toolResults.push(result);
                        
                        if (result.success) {
                            const formattedResult = JSON.stringify(result.data, null, 2);
                            this.chatHistory.addMessage('system', `Tool ${toolCall.tool} executed successfully. Result: ${formattedResult}`);
                        } else {
                            this.chatHistory.addMessage('system', `Tool ${toolCall.tool} failed: ${result.error}`);
                        }
                    } catch (error) {
                        this.chatHistory.addMessage('system', `Tool ${toolCall.tool} execution error: ${error.message}`);
                    }
                }
                
                // Get follow-up AI response with tool results
                const followUpResponse = await this.ollamaClient.sendMessage(
                    this.chatHistory.getMessages(),
                    'Please provide a response based on the tool execution results.'
                );
                
                this.chatHistory.addMessage('ai', followUpResponse.content);
                return followUpResponse;
            }

            // Add AI response to history
            this.chatHistory.addMessage('ai', responseText);

            return response;
        } catch (error) {
            throw new Error(`Failed to process message: ${error.message}`);
        }
    }

    async sendMessageSSE(userInput, onMessage) {
        try {
            // Add user message to history
            this.chatHistory.addMessage('human', userInput);

            // Get AI response with streaming
            const response = await this.ollamaClient.sendMessageSSE(
                this.chatHistory.getMessages(),
                userInput
            );

            let fullResponse = '';
            // Handle streaming response
            for await (const chunk of response) {
                const content = chunk.content || '';
                fullResponse += content;
                onMessage({ type: 'ai', content });
            }

            // Parse structured tool calls from complete response
            const toolCalls = this.parseStructuredToolCalls(fullResponse);
            
            if (toolCalls.length > 0) {
                // Send tool call indicators immediately (these will be parsed by frontend)
                for (const toolCall of toolCalls) {
                    // Send as a special message type that frontend can display
                    onMessage({ type: 'tool_call', tool: toolCall.tool, params: toolCall.params });
                }
                
                // Notify that tools are being executed
                onMessage({ type: 'system', content: `Executing ${toolCalls.length} tool(s)...` });
                
                // Execute tools with timeout
                const toolResults = [];
                const TOOL_TIMEOUT = 60000; // 60 seconds timeout
                
                for (const toolCall of toolCalls) {
                    try {
                        onMessage({ type: 'system', content: `Calling tool: ${toolCall.tool}` });
                        
                        // Execute tool with timeout
                        const result = await Promise.race([
                            this.toolManager.executeTool(toolCall.tool, toolCall.params, toolCall.action),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Tool execution timeout')), TOOL_TIMEOUT)
                            )
                        ]);
                        
                        toolResults.push(result);
                        
                        if (result.success) {
                            const formattedResult = JSON.stringify(result.data, null, 2);
                            this.chatHistory.addMessage('system', `Tool ${toolCall.tool} executed successfully. Result: ${formattedResult}`);
                            onMessage({ type: 'system', content: `Tool ${toolCall.tool} completed successfully` });
                        } else {
                            const errorMsg = `Tool ${toolCall.tool} failed: ${result.error}`;
                            this.chatHistory.addMessage('system', errorMsg);
                            onMessage({ type: 'error', content: errorMsg });
                        }
                    } catch (error) {
                        const errorMsg = error.message === 'Tool execution timeout' 
                            ? `Tool ${toolCall.tool} timed out after ${TOOL_TIMEOUT/1000} seconds`
                            : `Tool ${toolCall.tool} execution error: ${error.message}`;
                        this.chatHistory.addMessage('system', errorMsg);
                        onMessage({ type: 'error', content: errorMsg });
                        
                        // Add error result to continue processing
                        toolResults.push({ success: false, error: errorMsg });
                    }
                }
                
                // Get follow-up AI response with tool results
                onMessage({ type: 'system', content: 'Getting response based on tool results...' });
                const followUpResponse = await this.ollamaClient.sendMessageSSE(
                    this.chatHistory.getMessages(),
                    'Please provide a response based on the tool execution results.'
                );
                
                let followUpFullResponse = '';
                for await (const chunk of followUpResponse) {
                    const content = chunk.content || '';
                    followUpFullResponse += content;
                    onMessage({ type: 'ai', content });
                }
                
                this.chatHistory.addMessage('ai', followUpFullResponse);
                return followUpFullResponse;
            }

            // Add final AI response to history
            this.chatHistory.addMessage('ai', fullResponse);

            return fullResponse;
        } catch (error) {
            onMessage({ type: 'error', content: error.message });
            throw new Error(`Failed to process message: ${error.message}`);
        }
    }

    async executeTools(userInput, onMessage = null) {
        const detectedTools = this.toolManager.detectToolUsage(userInput);
        if (detectedTools.length === 0) {
            return [];
        }

        const toolParams = this.toolManager.parseToolParams(userInput, detectedTools);
        const results = [];

        for (const toolParam of toolParams) {
            try {
                const result = await this.toolManager.executeTool(toolParam.tool, toolParam.params);
                
                if (result.success) {
                    const formattedResult = JSON.stringify(result.data, null, 2);
                                        
                    // Add tool result to chat history
                    this.chatHistory.addMessage('human', `Tool ${toolParam.tool} executed successfully. Result: ${formattedResult}`);
                    
                    results.push(result);
                } else {
                    const errorMsg = `Tool ${toolParam.tool} failed: ${result.error}`;
                    this.chatHistory.addMessage('human', errorMsg);
                    
                }
            } catch (error) {
                const errorMsg = `Tool ${toolParam.tool} execution error: ${error.message}`;
                this.chatHistory.addMessage('system', errorMsg);
                
                if (onMessage) {
                    onMessage({ type: 'error', content: errorMsg });
                }
            }
        }

        return results;
    }

    getChatHistory() {
        return this.chatHistory.getMessages();
    }

    clearChatHistory() {
        return this.chatHistory.clearHistory();
    }

    async cleanup() {
        await this.toolManager.cleanup();
    }
}

export default ChatService; 