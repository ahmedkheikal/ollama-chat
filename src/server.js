import express from 'express';
import cors from 'cors';
import ChatService from './application/chatService.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store active chat services by chat ID
const chatServices = new Map();

// Helper to get or create chat service
const getChatService = (chatId) => {
    if (!chatServices.has(chatId)) {
        chatServices.set(chatId, new ChatService());
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

// Cleanup on server shutdown
process.on('SIGTERM', async () => {
    for (const chatService of chatServices.values()) {
        await chatService.cleanup();
    }
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 