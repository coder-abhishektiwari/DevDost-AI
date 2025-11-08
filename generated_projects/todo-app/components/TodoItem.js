import React, { useEffect, useState } from 'react';
import config from '../config.json';
import './styles.css';

/**
 * TodoItem component displays a single todo task with its due date and priority.
 * It also shows a reminder if the task is due within the interval specified in
 * config.dueDateReminderInterval (in days).
 */
const TodoItem = ({ task, dueDate, priority }) => {
  const [isDueSoon, setIsDueSoon] = useState(false);

  useEffect(() => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= config.dueDateReminderInterval && diffDays >= 0) {
      setIsDueSoon(true);
    } else {
      setIsDueSoon(false);
    }
  }, [dueDate]);

  return (
    <div className="todo-item">
      <h3 className="todo-task">{task}</h3>
      <p className="todo-due">Due: {new Date(dueDate).toLocaleDateString()}</p>
      <p className="todo-priority">Priority: {priority}</p>
      {isDueSoon && <p className="todo-reminder">⚠️ Due soon!</p>}
    </div>
  );
};

export default TodoItem;
