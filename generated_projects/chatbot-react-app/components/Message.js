```javascript
import React from 'react';

function Message({ messageText, isUserMessage }) {
  const className = isUserMessage ? 'message user-message' : 'message bot-message';
  return <div className={className}>{messageText}</div>;
}

export default Message;
```