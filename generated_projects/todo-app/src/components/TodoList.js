import React, { useState, useContext, useMemo } from 'react';
import { TodoContext } from './TodoContext';

/**
 * TodoList component renders a list of todos using a JavaScript Map for
 * iteration. The Map provides O(1) lookup by id and preserves insertion order,
 * which is useful if we later need to access a specific todo directly.
 */
const TodoList = () => {
  const { todos, addTodo, toggleTodo, removeTodo } = useContext(TodoContext);
  const [input, setInput] = useState('');

  // Convert the todos array into a Map where the key is the todo id.
  // useMemo ensures the Map is only recreated when the todos array changes.
  const todoMap = useMemo(() => {
    const map = new Map();
    todos.forEach((todo) => {
      map.set(todo.id, todo);
    });
    return map;
  }, [todos]);

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      addTodo(trimmed);
      setInput('');
    }
  };

  return (
    <div>
      <h2>Todo List</h2>
      <form onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Enter a new todo"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {/* Iterate over the Map entries to render each todo item */}
        {Array.from(todoMap.entries()).map(([id, todo]) => (
          <li key={id} style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            <span
              onClick={() => toggleTodo(id)}
              style={{ cursor: 'pointer' }}
            >
              {todo.text}
            </span>
            <button
              onClick={() => removeTodo(id)}
              style={{ marginLeft: '8px' }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
