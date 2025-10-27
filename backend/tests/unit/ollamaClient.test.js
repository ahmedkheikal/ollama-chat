import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import OllamaClient from '../../src/infrastructure/ollamaClient.js';

// Mock the LangChain modules
jest.mock('@langchain/community/chat_models/ollama', () => ({
    ChatOllama: jest.fn().mockImplementation(() => ({
        invoke: jest.fn(),
        stream: jest.fn(),
    }))
}));

jest.mock('@langchain/core/prompts', () => ({
    ChatPromptTemplate: {
        fromMessages: jest.fn()
    },
    MessagesPlaceholder: jest.fn()
}));

jest.mock('@langchain/core/runnables', () => ({
    RunnableSequence: {
        from: jest.fn()
    }
}));

jest.mock('@langchain/core/messages', () => ({
    HumanMessage: jest.fn(),
    AIMessage: jest.fn(),
    SystemMessage: jest.fn()
}));

describe('OllamaClient', () => {
    let ollamaClient;
    let mockModel;
    let mockChain;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create mock model
        mockModel = {
            invoke: jest.fn(),
            stream: jest.fn()
        };
        
        // Create mock chain
        mockChain = {
            invoke: jest.fn(),
            stream: jest.fn()
        };

        // Mock the ChatOllama constructor
        const { ChatOllama } = require('@langchain/community/chat_models/ollama');
        ChatOllama.mockImplementation(() => mockModel);

        // Mock RunnableSequence.from
        const { RunnableSequence } = require('@langchain/core/runnables');
        RunnableSequence.from.mockReturnValue(mockChain);

        ollamaClient = new OllamaClient();
    });

    describe('constructor', () => {
        it('should initialize with default parameters', () => {
            const { ChatOllama } = require('@langchain/community/chat_models/ollama');
            expect(ChatOllama).toHaveBeenCalledWith({
                baseUrl: 'http://localhost:11434',
                model: 'openchat:latest',
                streaming: true,
                temperature: 1,
            });
        });

        it('should initialize with custom parameters', () => {
            const customClient = new OllamaClient('http://custom:11434', 'custom-model', false);
            const { ChatOllama } = require('@langchain/community/chat_models/ollama');
            expect(ChatOllama).toHaveBeenCalledWith({
                baseUrl: 'http://custom:11434',
                model: 'custom-model',
                streaming: false,
                temperature: 1,
            });
        });
    });

    describe('formatMessages', () => {
        it('should format human messages correctly', () => {
            const { HumanMessage } = require('@langchain/core/messages');
            const chatHistory = [{ role: 'human', content: 'Hello' }];
            
            ollamaClient.formatMessages(chatHistory);
            
            expect(HumanMessage).toHaveBeenCalledWith('Hello');
        });

        it('should format AI messages correctly', () => {
            const { AIMessage } = require('@langchain/core/messages');
            const chatHistory = [{ role: 'ai', content: 'Hi there!' }];
            
            ollamaClient.formatMessages(chatHistory);
            
            expect(AIMessage).toHaveBeenCalledWith('Hi there!');
        });

        it('should format system messages correctly', () => {
            const { SystemMessage } = require('@langchain/core/messages');
            const chatHistory = [{ role: 'system', content: 'System message' }];
            
            ollamaClient.formatMessages(chatHistory);
            
            expect(SystemMessage).toHaveBeenCalledWith('System message');
        });

        it('should default to HumanMessage for unknown roles', () => {
            const { HumanMessage } = require('@langchain/core/messages');
            const chatHistory = [{ role: 'unknown', content: 'Unknown message' }];
            
            ollamaClient.formatMessages(chatHistory);
            
            expect(HumanMessage).toHaveBeenCalledWith('Unknown message');
        });

        it('should handle multiple messages', () => {
            const { HumanMessage, AIMessage } = require('@langchain/core/messages');
            const chatHistory = [
                { role: 'human', content: 'Hello' },
                { role: 'ai', content: 'Hi!' }
            ];
            
            ollamaClient.formatMessages(chatHistory);
            
            expect(HumanMessage).toHaveBeenCalledWith('Hello');
            expect(AIMessage).toHaveBeenCalledWith('Hi!');
        });
    });

    describe('sendMessage', () => {
        it('should send message successfully', async () => {
            const mockResponse = { content: 'AI response' };
            mockChain.invoke.mockResolvedValue(mockResponse);
            
            const chatHistory = [{ role: 'human', content: 'Hello' }];
            const input = 'Test input';
            
            const result = await ollamaClient.sendMessage(chatHistory, input);
            
            expect(mockChain.invoke).toHaveBeenCalledWith({
                chat_history: expect.any(Array),
                input: 'Test input'
            });
            expect(result).toBe(mockResponse);
        });

        it('should throw error when chain invoke fails', async () => {
            const error = new Error('Network error');
            mockChain.invoke.mockRejectedValue(error);
            
            const chatHistory = [{ role: 'human', content: 'Hello' }];
            const input = 'Test input';
            
            await expect(ollamaClient.sendMessage(chatHistory, input))
                .rejects.toThrow('Failed to send message to Ollama: Network error');
        });
    });

    describe('sendMessageSSE', () => {
        it('should send streaming message successfully', async () => {
            const mockStream = [
                { content: 'Hello' },
                { content: ' world' }
            ];
            mockChain.stream.mockResolvedValue(mockStream);
            
            const chatHistory = [{ role: 'human', content: 'Hello' }];
            const input = 'Test input';
            
            const result = await ollamaClient.sendMessageSSE(chatHistory, input);
            
            expect(mockChain.stream).toHaveBeenCalledWith({
                chat_history: expect.any(Array),
                input: 'Test input'
            });
            expect(result).toBe(mockStream);
        });

        it('should throw error when chain stream fails', async () => {
            const error = new Error('Streaming error');
            mockChain.stream.mockRejectedValue(error);
            
            const chatHistory = [{ role: 'human', content: 'Hello' }];
            const input = 'Test input';
            
            await expect(ollamaClient.sendMessageSSE(chatHistory, input))
                .rejects.toThrow('Failed to send message to Ollama: Streaming error');
        });
    });
});
