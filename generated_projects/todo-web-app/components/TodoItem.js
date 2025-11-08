```javascript
import React from 'react';

function TodoItem({ todo, handleToggle, handleRemove }) {
  const todoText = todo.text;
  const todoChecked = todo.checked;

  return (
    <li>
      <input 
        type="checkbox" 
        checked={todoChecked} 
        onChange={() => handleToggle(todo.id)}
      />
      <span style={{ textDecoration: todoChecked ? 'line-through' : 'none' }}>
        {todoText}
      </span>
      <button onClick={() => handleRemove(todo.id)}>Remove</button>
    </li>
  );
}

export default TodoItem;
```