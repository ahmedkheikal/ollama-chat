import { describe, it, expect, beforeEach } from '@jest/globals';
import ChatHistory from '../../src/domain/chatHistory.js';

describe('ChatHistory', () => {
    let chatHistory;

    beforeEach(() => {
        chatHistory = new ChatHistory();
    });

    describe('constructor', () => {
        it('should initialize with empty messages array', () => {
            expect(chatHistory.getMessages()).toEqual([]);
        });
    });

    describe('addMessage', () => {
        it('should add a message to the history', () => {
            const result = chatHistory.addMessage('human', 'Hello');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                role: 'human',
                content: 'Hello'
            });
        });

        it('should add multiple messages in order', () => {
            chatHistory.addMessage('human', 'Hello');
            chatHistory.addMessage('ai', 'Hi there!');
            chatHistory.addMessage('system', 'System message');
            
            const messages = chatHistory.getMessages();
            expect(messages).toHaveLength(3);
            expect(messages[0].role).toBe('human');
            expect(messages[1].role).toBe('ai');
            expect(messages[2].role).toBe('system');
        });

        it('should return the updated messages array', () => {
            const result = chatHistory.addMessage('human', 'Test message');
            expect(result).toBe(chatHistory.getMessages());
        });
    });

    describe('getMessages', () => {
        it('should return empty array when no messages', () => {
            expect(chatHistory.getMessages()).toEqual([]);
        });

        it('should return all messages in order', () => {
            chatHistory.addMessage('human', 'First message');
            chatHistory.addMessage('ai', 'AI response');
            
            const messages = chatHistory.getMessages();
            expect(messages).toHaveLength(2);
            expect(messages[0].content).toBe('First message');
            expect(messages[1].content).toBe('AI response');
        });
    });

    describe('clearHistory', () => {
        it('should clear all messages', () => {
            chatHistory.addMessage('human', 'Message 1');
            chatHistory.addMessage('ai', 'Message 2');
            
            expect(chatHistory.getMessages()).toHaveLength(2);
            
            const result = chatHistory.clearHistory();
            
            expect(result).toEqual([]);
            expect(chatHistory.getMessages()).toEqual([]);
        });

        it('should return empty array after clearing', () => {
            chatHistory.addMessage('human', 'Test message');
            const result = chatHistory.clearHistory();
            
            expect(result).toEqual([]);
        });
    });

    describe('getLastMessage', () => {
        it('should return undefined when no messages', () => {
            expect(chatHistory.getLastMessage()).toBeUndefined();
        });

        it('should return the last added message', () => {
            chatHistory.addMessage('human', 'First message');
            chatHistory.addMessage('ai', 'Last message');
            
            const lastMessage = chatHistory.getLastMessage();
            expect(lastMessage).toEqual({
                role: 'ai',
                content: 'Last message'
            });
        });

        it('should return the correct last message after multiple additions', () => {
            chatHistory.addMessage('human', 'Message 1');
            chatHistory.addMessage('ai', 'Message 2');
            chatHistory.addMessage('system', 'Message 3');
            
            const lastMessage = chatHistory.getLastMessage();
            expect(lastMessage.content).toBe('Message 3');
            expect(lastMessage.role).toBe('system');
        });
    });
});
