import React, { createContext, useState, useCallback } from 'react';

// Create a Context for the todo list
export const TodoContext = createContext();

// Provider component that holds the todo state and actions
export const TodoProvider = ({ children }) => {
  const [todos, setTodos] = useState([]);

  // Add a new todo item
  const addTodo = useCallback((text) => {
    setTodos((prev) => [...prev, { id: Date.now(), text, completed: false }]);
  }, []);

  // Toggle completion status of a todo
  const toggleTodo = useCallback((id) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, []);

  // Remove a todo item
  const removeTodo = useCallback((id) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  const value = {
    todos,
    addTodo,
    toggleTodo,
    removeTodo,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
