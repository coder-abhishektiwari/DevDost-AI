```javascript
import React from 'react';
import TodoItem from './TodoItem.js';

function TodoList({ todos, handleToggle, handleRemove }) {
  const todoList = todos.map((todo) => (
    <TodoItem
      key={todo.id}
      todo={todo}
      handleToggle={handleToggle}
      handleRemove={handleRemove}
    />
  ));

  return <ul>{todoList}</ul>;
}

export default TodoList;
```