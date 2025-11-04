import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ChatService from '../../src/application/chatService.js';

// Mock dependencies
jest.mock('../../src/infrastructure/ollamaClient.js');
jest.mock('../../src/domain/chatHistory.js');
jest.mock('../../src/infrastructure/seleniumService.js');
jest.mock('../../src/infrastructure/webBrowsingTool.js');
jest.mock('json-fixer');

describe('ChatService', () => {
    let chatService;
    let mockOllamaClient;
    let mockChatHistory;
    let mockSeleniumService;
    let mockWebBrowsingTool;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockOllamaClient = {
            sendMessage: jest.fn(),
            sendMessageSSE: jest.fn()
        };

        mockChatHistory = {
            addMessage: jest.fn(),
            getMessages: jest.fn(),
            clearHistory: jest.fn()
        };

        mockSeleniumService = {
            browse: jest.fn(),
            close: jest.fn()
        };

        mockSeleniumChatAdapter = {
            browse: jest.fn()
        };

        // Mock the constructors
        const OllamaClient = require('../../src/infrastructure/ollamaClient.js');
        const ChatHistory = require('../../src/domain/chatHistory.js');
        const SeleniumService = require('../../src/infrastructure/seleniumService.js');
        const WebBrowsingTool = require('../../src/infrastructure/webBrowsingTool.js');

        OllamaClient.mockImplementation(() => mockOllamaClient);
        ChatHistory.mockImplementation(() => mockChatHistory);
        SeleniumService.mockImplementation(() => mockSeleniumService);
        WebBrowsingTool.mockImplementation(() => mockWebBrowsingTool);

        chatService = new ChatService();
    });

    describe('constructor', () => {
        it('should initialize all dependencies', () => {
            expect(chatService.ollamaClient).toBe(mockOllamaClient);
            expect(chatService.chatHistory).toBe(mockChatHistory);
            expect(chatService.seleniumService).toBe(mockSeleniumService);
            expect(chatService.webBrowsingTool).toBe(mockWebBrowsingTool);
        });
    });

    describe('sendMessage', () => {
        it('should process a regular message successfully', async () => {
            const userInput = 'Hello, how are you?';
            const mockResponse = { content: 'I am doing well, thank you!' };
            const mockHistory = [{ role: 'human', content: userInput }];

            mockChatHistory.getMessages.mockReturnValue(mockHistory);
            mockOllamaClient.sendMessage.mockResolvedValue(mockResponse);

            const result = await chatService.sendMessage(userInput);

            expect(mockChatHistory.addMessage).toHaveBeenCalledWith('human', userInput);
            expect(mockOllamaClient.sendMessage).toHaveBeenCalledWith(mockHistory, userInput);
            expect(mockChatHistory.addMessage).toHaveBeenCalledWith('ai', mockResponse.content);
            expect(result).toBe(mockResponse);
        });

        it('should handle browsing requests', async () => {
            const userInput = 'browse https://example.com';
            const mockBrowsingResult = { title: 'Example', content: 'Some content' };
            const mockResponse = { content: 'Here is the browsing result' };
            const mockHistory = [{ role: 'human', content: userInput }];

            mockChatHistory.getMessages.mockReturnValue(mockHistory);
            mockSeleniumService.browse.mockResolvedValue(mockBrowsingResult);
            mockOllamaClient.sendMessage.mockResolvedValue(mockResponse);

            const result = await chatService.sendMessage(userInput);

            expect(mockSeleniumService.browse).toHaveBeenCalled();
            expect(mockChatHistory.addMessage).toHaveBeenCalledWith('system', expect.stringContaining('Web browsing result'));
            expect(result).toBe(mockResponse);
        });

        it('should throw error when processing fails', async () => {
            const userInput = 'Hello';
            const error = new Error('Processing failed');

            mockOllamaClient.sendMessage.mockRejectedValue(error);

            await expect(chatService.sendMessage(userInput))
                .rejects.toThrow('Failed to process message: Processing failed');
        });
    });

    describe('sendMessageSSE', () => {
        it('should process a regular message with SSE successfully', async () => {
            const userInput = 'Hello, how are you?';
            const mockResponse = [
                { content: 'I am' },
                { content: ' doing well!' }
            ];
            const mockHistory = [{ role: 'human', content: userInput }];
            const onMessage = jest.fn();

            mockChatHistory.getMessages.mockReturnValue(mockHistory);
            mockOllamaClient.sendMessageSSE.mockResolvedValue(mockResponse);

            const result = await chatService.sendMessageSSE(userInput, onMessage);

            expect(mockChatHistory.addMessage).toHaveBeenCalledWith('human', userInput);
            expect(mockOllamaClient.sendMessageSSE).toHaveBeenCalledWith(mockHistory, userInput);
            expect(onMessage).toHaveBeenCalledWith({ type: 'ai', content: 'I am' });
            expect(onMessage).toHaveBeenCalledWith({ type: 'ai', content: ' doing well!' });
            expect(mockChatHistory.addMessage).toHaveBeenCalledWith('ai', 'I am doing well!');
            expect(result).toBe('I am doing well!');
        });

        it('should handle browsing requests with SSE', async () => {
            const userInput = 'search for information about AI';
            const mockBrowsingResult = { title: 'AI Information', content: 'AI details' };
            const mockResponse = [{ content: 'Based on the search results...' }];
            const mockHistory = [{ role: 'human', content: userInput }];
            const onMessage = jest.fn();

            mockChatHistory.getMessages.mockReturnValue(mockHistory);
            mockSeleniumChatAdapter.browse.mockResolvedValue(mockBrowsingResult);
            mockOllamaClient.sendMessageSSE.mockResolvedValue(mockResponse);

            const result = await chatService.sendMessageSSE(userInput, onMessage);

            expect(mockSeleniumChatAdapter.browse).toHaveBeenCalled();
            expect(mockChatHistory.addMessage).toHaveBeenCalledWith('human', expect.stringContaining('browsing capabilities'));
            expect(result).toBe('Based on the search results...');
        });

        it('should handle errors in SSE and call onMessage with error', async () => {
            const userInput = 'Hello';
            const error = new Error('SSE processing failed');
            const onMessage = jest.fn();

            mockOllamaClient.sendMessageSSE.mockRejectedValue(error);

            await expect(chatService.sendMessageSSE(userInput, onMessage))
                .rejects.toThrow('Failed to process message: SSE processing failed');

            expect(onMessage).toHaveBeenCalledWith({ type: 'error', content: 'SSE processing failed' });
        });
    });

    describe('parseBrowsingInstructions', () => {
        it('should parse URL from message with https', () => {
            const message = 'browse https://example.com for information';
            const result = chatService.parseBrowsingInstructions(message);

            expect(result).toEqual({
                target: {
                    url: 'https://example.com',
                    description: 'URL automatically detected from user input.'
                },
                flows: expect.any(Array)
            });
        });

        it('should parse URL from message with http', () => {
            const message = 'search http://test.com';
            const result = chatService.parseBrowsingInstructions(message);

            expect(result).toEqual({
                target: {
                    url: 'http://test.com',
                    description: 'URL automatically detected from user input.'
                },
                flows: expect.any(Array)
            });
        });

        it('should return null when no URL found', () => {
            const message = 'just a regular message';
            const result = chatService.parseBrowsingInstructions(message);

            expect(result).toBeNull();
        });

        it('should return null for empty message', () => {
            const result = chatService.parseBrowsingInstructions('');

            expect(result).toBeNull();
        });
    });

    describe('getChatHistory', () => {
        it('should return chat history', () => {
            const mockHistory = [{ role: 'human', content: 'Hello' }];
            mockChatHistory.getMessages.mockReturnValue(mockHistory);

            const result = chatService.getChatHistory();

            expect(mockChatHistory.getMessages).toHaveBeenCalled();
            expect(result).toBe(mockHistory);
        });
    });

    describe('clearChatHistory', () => {
        it('should clear chat history', () => {
            const mockClearedHistory = [];
            mockChatHistory.clearHistory.mockReturnValue(mockClearedHistory);

            const result = chatService.clearChatHistory();

            expect(mockChatHistory.clearHistory).toHaveBeenCalled();
            expect(result).toBe(mockClearedHistory);
        });
    });

    describe('cleanup', () => {
        it('should cleanup selenium service', async () => {
            await chatService.cleanup();

            expect(mockSeleniumService.close).toHaveBeenCalled();
        });
    });
});
