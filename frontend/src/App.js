import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ChatBox from './components/ChatBox';
import { v4 as uuidv4 } from 'uuid';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
`;

const Header = styled.header`
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

function App() {
  const [chatId] = useState(() => {
    // Get existing chatId from localStorage or create new one
    const savedChatId = localStorage.getItem('chatId');
    if (savedChatId) return savedChatId;
    const newChatId = uuidv4();
    localStorage.setItem('chatId', newChatId);
    return newChatId;
  });

  return (
    <AppContainer>
      <Header>
        <h1>AI Chat Interface</h1>
      </Header>
      <MainContent>
        <ChatBox chatId={chatId} />
      </MainContent>
    </AppContainer>
  );
}

export default App; 