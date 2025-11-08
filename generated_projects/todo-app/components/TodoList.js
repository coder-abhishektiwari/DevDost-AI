import React, { Component } from 'react';
import * as tasks from '../tasks';
import TodoItem from './TodoItem';
import './styles.css';

class TodoList extends Component {
  state = {
    tasks: [],
    newTaskText: '',
  };

  componentDidMount() {
    this.loadTasks();
  }

  loadTasks = async () => {
    try {
      const tasks = await tasks.getTasks();
      this.setState({ tasks });
    } catch (error) {
      console.error('Failed to load tasks', error);
    }
  };

  handleAddTask = async () => {
    const { newTaskText } = this.state;
    if (!newTaskText.trim()) return;
    try {
      const addedTask = await tasks.addTask(newTaskText.trim());
      this.setState(prevState => ({
        tasks: [...prevState.tasks, addedTask],
        newTaskText: '',
      }));
    } catch (error) {
      console.error('Failed to add task', error);
    }
  };

  handleDeleteTask = async id => {
    try {
      await tasks.deleteTask(id);
      this.setState(prevState => ({
        tasks: prevState.tasks.filter(task => task.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete task', error);
    }
  };

  handleToggleTask = async id => {
    try {
      const updatedTask = await tasks.toggleTask(id);
      this.setState(prevState => ({
        tasks: prevState.tasks.map(task =>
          task.id === id ? updatedTask : task
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle task', error);
    }
  };

  handleInputChange = e => {
    this.setState({ newTaskText: e.target.value });
  };

  render() {
    const { tasks, newTaskText } = this.state;
    return (
      <div className="todo-list">
        <h2>Todo List</h2>
        <div className="add-task">
          <input
            type="text"
            value={newTaskText}
            onChange={this.handleInputChange}
            placeholder="New task"
          />
          <button onClick={this.handleAddTask}>Add</button>
        </div>
        <ul>
          {tasks.map(task => (
            <TodoItem
              key={task.id}
              task={task}
              onDelete={() => this.handleDeleteTask(task.id)}
              onToggle={() => this.handleToggleTask(task.id)}
            />
          ))}
        </ul>
      </div>
    );
  }
}

export default TodoList;
