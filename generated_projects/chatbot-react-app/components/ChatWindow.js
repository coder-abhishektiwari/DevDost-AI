```javascript
import React, { useState } from 'react';
import Message from './Message';

function ChatWindow() {
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userInput, setUserInput] = useState('');

  const handleUserInput = (input) => {
    setUserInput(input);
  };

  const handleSendMessage = () => {
    if (userInput !== '') {
      setConversationHistory([...conversationHistory, { messageText: userInput, isUserMessage: true }]);
      setUserInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className='chat-window'>
      {conversationHistory.map((message, index) => (
        <Message key={index} messageText={message.messageText} isUserMessage={message.isUserMessage} />
      ))}
      <input
        type='text'
        value={userInput}
        onChange={(e) => handleUserInput(e.target.value)}
        onKeyPress={(e) => handleKeyPress(e)}
        placeholder='Type a message...'
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}

export default ChatWindow;
```