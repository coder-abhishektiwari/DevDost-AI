// api/tasks.js
// Task management API wrapper using axios and configuration from config.json

import axios from 'axios';
import config from '../config.json';

// Create an axios instance with the base URL from config
const api = axios.create({
  baseURL: config.apiEndpoint,
});

/**
 * Fetch all tasks.
 * @returns {Promise<Array>} Array of task objects.
 */
export async function getTasks() {
  const response = await api.get('/tasks');
  return response.data;
}

/**
 * Create a new task.
 * @param {Object} task - Task data to create.
 * @returns {Promise<Object>} The created task.
 */
export async function createTask(task) {
  const response = await api.post('/tasks', task);
  return response.data;
}

/**
 * Update an existing task.
 * @param {string|number} id - Identifier of the task to update.
 * @param {Object} updates - Fields to update.
 * @returns {Promise<Object>} The updated task.
 */
export async function updateTask(id, updates) {
  const response = await api.put(`/tasks/${id}`, updates);
  return response.data;
}

/**
 * Delete a task.
 * @param {string|number} id - Identifier of the task to delete.
 * @returns {Promise<void>}
 */
export async function deleteTask(id) {
  await api.delete(`/tasks/${id}`);
}
