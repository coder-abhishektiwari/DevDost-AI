import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';
import TodoList from './TodoList';
import config from './config.json';

/**
 * Main application component.
 * Handles user authentication and task management.
 */
function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);

  // Load tasks when a user logs in
  useEffect(() => {
    if (!user) return;

    const stored = localStorage.getItem(`tasks_${user.id}`);
    if (stored) {
      setTasks(JSON.parse(stored));
    } else {
      // Fetch from API if available
      fetch(`${config.apiBase}/tasks?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setTasks(data);
          localStorage.setItem(`tasks_${user.id}`, JSON.stringify(data));
        })
        .catch((err) => console.error('Failed to fetch tasks:', err));
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setTasks([]);
  };

  const addTask = (title) => {
    const newTask = {
      id: Date.now(),
      title,
      completed: false,
      userId: user.id,
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    localStorage.setItem(`tasks_${user.id}`, JSON.stringify(updated));

    // Persist to backend if API exists
    fetch(`${config.apiBase}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    }).catch((err) => console.error('Failed to add task:', err));
  };

  const toggleTask = (id) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    localStorage.setItem(`tasks_${user.id}`, JSON.stringify(updated));

    const toggled = updated.find((t) => t.id === id);
    fetch(`${config.apiBase}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: toggled.completed }),
    }).catch((err) => console.error('Failed to update task:', err));
  };

  const deleteTask = (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    localStorage.setItem(`tasks_${user.id}`, JSON.stringify(updated));

    fetch(`${config.apiBase}/tasks/${id}`, { method: 'DELETE' })
      .catch((err) => console.error('Failed to delete task:', err));
  };

  return (
    <div className="app">
      {user ? (
        <>
          <header>
            <h1>Todo List</h1>
            <button onClick={handleLogout}>Logout</button>
          </header>
          <TodoList
            tasks={tasks}
            addTask={addTask}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
          />
        </>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
