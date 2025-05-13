import OllamaClient from '../infrastructure/ollamaClient.js';
import ChatHistory from '../domain/chatHistory.js';
import SeleniumService from '../infrastructure/seleniumService.js';

class ChatService {
    constructor() {
        this.ollamaClient = new OllamaClient();
        this.chatHistory = new ChatHistory();
        this.seleniumService = new SeleniumService();
    }

    async sendMessage(userInput) {
        try {
            // Add user message to history
            this.chatHistory.addMessage('human', userInput);

            // Check if the message is a web browsing request
            if (userInput.toLowerCase().includes('browse') || userInput.toLowerCase().includes('search')) {
                // Extract URL and instructions from the message
                const browsingInstructions = this.parseBrowsingInstructions(userInput);
                if (browsingInstructions) {
                    const htmlResult = await this.seleniumService.browse(browsingInstructions);
                    this.chatHistory.addMessage('system', `Web browsing result: ${htmlResult}`);
                    console.log("System:", htmlResult);
                }
            }

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

    parseBrowsingInstructions(message) {
        // Simple URL extraction - you might want to enhance this
        const urlMatch = message.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            return {
                url: urlMatch[0],
                actions: [],
                waitForSelector: 'body', // Wait for body to load
                extractSelector: 'body' // Extract body content
            };
        }
        return null;
    }

    getChatHistory() {
        return this.chatHistory.getMessages();
    }

    clearChatHistory() {
        return this.chatHistory.clearHistory();
    }

    async cleanup() {
        await this.seleniumService.close();
    }
}

export default ChatService; 