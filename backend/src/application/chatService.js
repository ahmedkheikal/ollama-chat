import OllamaClient from '../infrastructure/ollamaClient.js';
import ChatHistory from '../domain/chatHistory.js';
import ToolManager from './toolManager.js';

class ChatService {
    constructor(ollamaClient = null, chatHistory = null, toolManager = null) {
        this.ollamaClient = ollamaClient || new OllamaClient();
        this.chatHistory = chatHistory || new ChatHistory();
        this.toolManager = toolManager || new ToolManager();
    }

    async sendMessage(userInput) {
        try {
            // Add user message to history
            this.chatHistory.addMessage('human', userInput);

            // Check for tool usage and execute tools
            const toolResults = await this.executeTools(userInput);
            
            // Get AI response
            const response = await this.ollamaClient.sendMessage(
                this.chatHistory.getMessages(),
                userInput
            );

            // Add AI response to history
            this.chatHistory.addMessage('ai', response.content);

            return response;
        } catch (error) {
            throw new Error(`Failed to process message: ${error.message}`);
        }
    }

    async sendMessageSSE(userInput, onMessage) {
        try {
            // Add user message to history
            this.chatHistory.addMessage('human', userInput);
            
            // Check for tool usage and execute tools
            const toolResults = await this.executeTools(userInput, onMessage);

            // if (toolResults.length > 0) {
            //     return toolResults;
            // }

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