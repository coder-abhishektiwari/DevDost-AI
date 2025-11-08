import React from 'react';
import { TodoProvider } from './TodoContext';
import TodoList from './TodoList';

/**
 * Root application component.
 * Wraps the TodoList with TodoProvider to supply state via context.
 */
const App = () => (
  <TodoProvider>
    <TodoList />
  </TodoProvider>
);

export default App;
