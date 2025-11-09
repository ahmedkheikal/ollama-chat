import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

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
  word-wrap: break-word;
  white-space: pre-wrap;
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

const FormattedMessage = styled(Message)`
  /* Markdown styling for AI messages */
  p {
    margin: 0.5rem 0;
    line-height: 1.6;
    
    &:first-child {
      margin-top: 0;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  strong {
    font-weight: 600;
  }
  
  em {
    font-style: italic;
  }
  
  code {
    background-color: ${props => props.isUser ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background-color: ${props => props.isUser ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)'};
    padding: 0.75rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0.5rem 0;
    
    code {
      background-color: transparent;
      padding: 0;
    }
  }
  
  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  
  li {
    margin: 0.25rem 0;
  }
  
  blockquote {
    border-left: 3px solid ${props => props.isUser ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.2)'};
    padding-left: 1rem;
    margin: 0.5rem 0;
    font-style: italic;
  }
  
  h1, h2, h3, h4, h5, h6 {
    margin: 0.75rem 0 0.5rem 0;
    font-weight: 600;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; }
  h3 { font-size: 1.1em; }
  
  a {
    color: ${props => props.isUser ? '#ffffff' : '#007bff'};
    text-decoration: underline;
    
    &:hover {
      opacity: 0.8;
    }
  }
  
  hr {
    border: none;
    border-top: 1px solid ${props => props.isUser ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
    margin: 1rem 0;
  }
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

const SystemMessage = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  max-width: 80%;
  align-self: flex-start;
  background-color: #f5f5f5;
  color: #666;
  font-size: 0.9em;
  font-style: italic;
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

  /**
   * Parse tool calls from message content
   * Returns array of { toolCall, remainingContent }
   */
  const parseToolCalls = (content) => {
    const toolCalls = [];
    let remainingContent = content;
    const processedBlocks = new Set();

    // First, try to extract JSON from code blocks (most common format)
    const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
    let codeBlockMatch;
    
    while ((codeBlockMatch = codeBlockPattern.exec(content)) !== null) {
      const jsonStr = codeBlockMatch[1].trim();
      const fullMatch = codeBlockMatch[0];
      
      if (processedBlocks.has(fullMatch)) continue;
      processedBlocks.add(fullMatch);
      
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.action === 'tool_call' && parsed.tool) {
          toolCalls.push({
            tool: parsed.tool,
            params: parsed.params,
            rawJson: fullMatch
          });
          // Remove the code block from remaining content
          remainingContent = remainingContent.replace(fullMatch, '').trim();
        }
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }

    // If no tool calls found in code blocks, try standalone JSON
    if (toolCalls.length === 0) {
      const jsonPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*"action"\s*:\s*"tool_call"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      const matches = remainingContent.match(jsonPattern);
      
      if (matches) {
        for (const match of matches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed.action === 'tool_call' && parsed.tool) {
              toolCalls.push({
                tool: parsed.tool,
                params: parsed.params,
                rawJson: match
              });
              // Remove the tool call from remaining content
              remainingContent = remainingContent.replace(match, '').trim();
            }
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }

    return { toolCalls, remainingContent };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat with a unique ID
    const userMessageId = uuidv4();
    setMessages(prev => [...prev, { id: userMessageId, type: 'user', content: userMessage }]);

    try {
      const response = await fetch(`http://localhost:3001/chat/${chatId}/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentMessageId = null;
      let currentSystemMessageId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle system messages separately (but filter out verbose ones)
              if (data.type === 'system') {
                // Filter out verbose system messages - we'll show tool calls separately
                const isVerboseStatus = data.content.includes('Executing') || 
                                       data.content.includes('Getting response') ||
                                       data.content.includes('completed successfully');
                
                if (!isVerboseStatus) {
                  // Only show non-verbose system messages
                  if (!currentSystemMessageId) {
                    const newSystemMessageId = uuidv4();
                    currentSystemMessageId = newSystemMessageId;
                    setMessages(prev => [...prev, { 
                      id: newSystemMessageId, 
                      type: 'system', 
                      content: data.content 
                    }]);
                  } else {
                    const messageId = currentSystemMessageId;
                    setMessages(prev => prev.map(msg => 
                      msg.id === messageId 
                        ? { ...msg, content: msg.content + data.content }
                        : msg
                    ));
                  }
                }
              } else if (data.type === 'ai') {
                // Handle AI messages
                if (!currentMessageId) {
                  // Create a new message for the first chunk
                  const newMessageId = uuidv4();
                  currentMessageId = newMessageId;
                  setMessages(prev => [...prev, { 
                    id: newMessageId, 
                    type: 'ai', 
                    content: data.content 
                  }]);
                } else {
                  // Concatenate content to the existing message
                  const messageId = currentMessageId;
                  setMessages(prev => prev.map(msg => 
                    msg.id === messageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  ));
                }
              } else if (data.type === 'error') {
                // Handle error messages
                setMessages(prev => [...prev, { 
                  id: uuidv4(), 
                  type: 'error', 
                  content: data.content 
                }]);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
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
        {messages.map((message) => {
          const isUser = message.type === 'user';
          const isAI = message.type === 'ai';
          const isSystem = message.type === 'system';
          const isError = message.type === 'error';
          
          // Handle AI messages - remove tool call JSON from display
          if (isAI) {
            const { toolCalls, remainingContent } = parseToolCalls(message.content);
            // Show remaining content (without tool call JSON) or full content if no tool calls
            const displayContent = toolCalls.length > 0 ? remainingContent : message.content;
            
            return (
              <FormattedMessage key={message.id} isUser={false}>
                {displayContent && <ReactMarkdown>{displayContent}</ReactMarkdown>}
              </FormattedMessage>
            );
          }
          
          // Handle system messages (non-verbose ones that passed the filter)
          if (isSystem) {
            return (
              <SystemMessage key={message.id}>
                {message.content}
              </SystemMessage>
            );
          }
          
          // Handle error messages
          if (isError) {
            return (
              <FormattedMessage key={message.id} isUser={false} style={{ backgroundColor: '#ffebee', color: '#c62828' }}>
                {message.content}
              </FormattedMessage>
            );
          }
          
          // Handle user messages
          return (
            <FormattedMessage key={message.id} isUser={isUser}>
              {message.content}
            </FormattedMessage>
          );
        })}
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