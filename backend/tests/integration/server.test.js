import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock the ChatService
jest.mock('../../src/application/chatService.js');

describe('Server Integration Tests', () => {
    let app;
    let mockChatService;
    let chatServices;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock chat service
        mockChatService = {
            sendMessageSSE: jest.fn(),
            getChatHistory: jest.fn(),
            clearChatHistory: jest.fn(),
            cleanup: jest.fn()
        };

        // Mock ChatService constructor
        const ChatService = require('../../src/application/chatService.js');
        ChatService.mockImplementation(() => mockChatService);

        // Create Express app similar to server.js
        app = express();
        app.use(cors());
        app.use(express.json());

        // Store active chat services by chat ID
        chatServices = new Map();

        // Helper to get or create chat service
        const getChatService = (chatId) => {
            if (!chatServices.has(chatId)) {
                chatServices.set(chatId, mockChatService);
            }
            return chatServices.get(chatId);
        };

        // SSE endpoint for chat
        app.get('/chat/:chatId/stream', (req, res) => {
            const { chatId } = req.params;
            
            // Set headers for SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // Send initial connection message
            res.write(`data: ${JSON.stringify({ type: 'connected', chatId })}\n\n`);
            
            // Handle client disconnect
            req.on('close', () => {
                console.log(`Client disconnected from chat ${chatId}`);
            });
        });

        // SSE endpoint for sending messages
        app.post('/chat/:chatId/sse', async (req, res) => {
            const { chatId } = req.params;
            const { prompt } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ error: 'Prompt is required' });
            }
            
            // Set headers for SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            try {
                const chatService = getChatService(chatId);
                
                // Create message handler for SSE
                const onMessage = (message) => {
                    res.write(`data: ${JSON.stringify({
                        ...message,
                        chatId
                    })}\n\n`);
                };
                
                // Send message and handle streaming response
                await chatService.sendMessageSSE(prompt, onMessage);
                
                // End the response
                res.end();
            } catch (error) {
                console.error('Error processing message:', error);
                res.write(`data: ${JSON.stringify({
                    type: 'error',
                    content: error.message,
                    chatId
                })}\n\n`);
                res.end();
            }
        });

        // Endpoint to get chat history
        app.get('/chat/:chatId/history', (req, res) => {
            const { chatId } = req.params;
            const chatService = getChatService(chatId);
            const history = chatService.getChatHistory();
            res.json({ history });
        });

        // Endpoint to clear chat history
        app.delete('/chat/:chatId/history', (req, res) => {
            const { chatId } = req.params;
            const chatService = getChatService(chatId);
            chatService.clearChatHistory();
            res.json({ message: 'Chat history cleared' });
        });
    });

    afterEach(() => {
        chatServices.clear();
    });

    describe('GET /chat/:chatId/stream', () => {
        it('should establish SSE connection', async () => {
            const chatId = 'test-chat-id';
            
            const response = await request(app)
                .get(`/chat/${chatId}/stream`)
                .expect(200)
                .expect('Content-Type', 'text/event-stream');

            expect(response.text).toContain('data: {"type":"connected","chatId":"test-chat-id"}');
        });
    });

    describe('POST /chat/:chatId/sse', () => {
        it('should process message successfully', async () => {
            const chatId = 'test-chat-id';
            const prompt = 'Hello, how are you?';
            const mockResponse = [
                { content: 'I am doing well!' }
            ];

            mockChatService.sendMessageSSE.mockImplementation(async (userInput, onMessage) => {
                // Simulate streaming response
                for (const chunk of mockResponse) {
                    onMessage({ type: 'ai', content: chunk.content });
                }
                return 'I am doing well!';
            });

            const response = await request(app)
                .post(`/chat/${chatId}/sse`)
                .send({ prompt })
                .expect(200)
                .expect('Content-Type', 'text/event-stream');

            expect(mockChatService.sendMessageSSE).toHaveBeenCalledWith(prompt, expect.any(Function));
            expect(response.text).toContain('data: {"type":"ai","content":"I am doing well!","chatId":"test-chat-id"}');
        });

        it('should return 400 when prompt is missing', async () => {
            const chatId = 'test-chat-id';

            await request(app)
                .post(`/chat/${chatId}/sse`)
                .send({})
                .expect(400)
                .expect('Content-Type', /json/)
                .expect({ error: 'Prompt is required' });
        });

        it('should handle errors gracefully', async () => {
            const chatId = 'test-chat-id';
            const prompt = 'Hello';
            const error = new Error('Processing failed');

            mockChatService.sendMessageSSE.mockRejectedValue(error);

            const response = await request(app)
                .post(`/chat/${chatId}/sse`)
                .send({ prompt })
                .expect(200)
                .expect('Content-Type', 'text/event-stream');

            expect(response.text).toContain('data: {"type":"error","content":"Processing failed","chatId":"test-chat-id"}');
        });

        it('should handle streaming response', async () => {
            const chatId = 'test-chat-id';
            const prompt = 'Tell me a story';
            const mockResponse = [
                { content: 'Once' },
                { content: ' upon' },
                { content: ' a time' }
            ];

            mockChatService.sendMessageSSE.mockImplementation(async (userInput, onMessage) => {
                for (const chunk of mockResponse) {
                    onMessage({ type: 'ai', content: chunk.content });
                }
                return 'Once upon a time';
            });

            const response = await request(app)
                .post(`/chat/${chatId}/sse`)
                .send({ prompt })
                .expect(200);

            expect(response.text).toContain('data: {"type":"ai","content":"Once","chatId":"test-chat-id"}');
            expect(response.text).toContain('data: {"type":"ai","content":" upon","chatId":"test-chat-id"}');
            expect(response.text).toContain('data: {"type":"ai","content":" a time","chatId":"test-chat-id"}');
        });
    });

    describe('GET /chat/:chatId/history', () => {
        it('should return chat history', async () => {
            const chatId = 'test-chat-id';
            const mockHistory = [
                { role: 'human', content: 'Hello' },
                { role: 'ai', content: 'Hi there!' }
            ];

            mockChatService.getChatHistory.mockReturnValue(mockHistory);

            const response = await request(app)
                .get(`/chat/${chatId}/history`)
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({ history: mockHistory });
            expect(mockChatService.getChatHistory).toHaveBeenCalled();
        });
    });

    describe('DELETE /chat/:chatId/history', () => {
        it('should clear chat history', async () => {
            const chatId = 'test-chat-id';

            mockChatService.clearChatHistory.mockReturnValue([]);

            const response = await request(app)
                .delete(`/chat/${chatId}/history`)
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({ message: 'Chat history cleared' });
            expect(mockChatService.clearChatHistory).toHaveBeenCalled();
        });
    });

    describe('CORS', () => {
        it('should handle CORS preflight requests', async () => {
            await request(app)
                .options('/chat/test-id/sse')
                .expect(204);
        });
    });
});
