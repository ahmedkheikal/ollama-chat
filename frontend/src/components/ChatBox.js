import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Message = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  max-width: 80%;
  ${props => props.isUser ? `
    background-color: #007bff;
    color: white;
    align-self: flex-end;
  ` : `
    background-color: #f1f1f1;
    color: black;
    align-self: flex-start;
  `}
`;

const InputContainer = styled.div`
  display: flex;
  padding: 1rem;
  gap: 1rem;
  border-top: 1px solid #eee;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const SendButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  
  &:hover {
    background-color: #0056b3;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ChatBox = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat with a unique ID
    const userMessageId = uuidv4();
    setMessages(prev => [...prev, { id: userMessageId, type: 'user', content: userMessage }]);

    try {
      const response = await fetch(`http://localhost:3000/chat/${chatId}/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentMessageId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'ai' || data.type === 'system') {
                if (!currentMessageId) {
                  // Create a new message for the first chunk
                  currentMessageId = uuidv4();
                  setMessages(prev => [...prev, { 
                    id: currentMessageId, 
                    type: data.type, 
                    content: data.content 
                  }]);
                } else {
                  // Concatenate content to the existing message
                  setMessages(prev => prev.map(msg => 
                    msg.id === currentMessageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  ));
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        id: uuidv4(), 
        type: 'error', 
        content: 'Failed to send message' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ChatContainer>
      <MessagesContainer>
        {messages.map((message) => (
          <Message key={message.id} isUser={message.type === 'user'}>
            {message.content}
          </Message>
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <InputContainer>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <SendButton onClick={handleSend} disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatBox; 