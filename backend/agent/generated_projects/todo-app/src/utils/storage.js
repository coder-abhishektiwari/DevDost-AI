/*
 * Utility functions for interacting with the browser's localStorage.
 * All data is stored as JSON strings to preserve type information.
 * The module provides generic get/set/remove helpers as well as
 * convenience functions for persisting the todo list used by the app.
 */

/**
 * Safely stringify a value for storage. Falls back to an empty string on error.
 * @param {any} value - The value to serialize.
 * @returns {string}
 */
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    // In case of circular references or other serialization issues.
    console.error('Failed to stringify value for localStorage:', e);
    return '';
  }
}

/**
 * Safely parse a JSON string from storage. Returns null if parsing fails.
 * @param {string} text - JSON string.
 * @returns {any}
 */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('Failed to parse JSON from localStorage:', e);
    return null;
  }
}

/**
 * Store a value under the specified key in localStorage.
 * The value is serialized to JSON.
 * @param {string} key - Storage key.
 * @param {any} value - Value to store.
 */
export function setItem(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('localStorage is not available.');
    return;
  }
  const serialized = safeStringify(value);
  if (serialized !== '') {
    window.localStorage.setItem(key, serialized);
  }
}

/**
 * Retrieve a value from localStorage and deserialize it.
 * @param {string} key - Storage key.
 * @returns {any|null} - Parsed value or null if missing/invalid.
 */
export function getItem(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  if (raw === null) return null;
  return safeParse(raw);
}

/**
 * Remove a key/value pair from localStorage.
 * @param {string} key - Storage key.
 */
export function removeItem(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(key);
}

/**
 * Persist the entire todo list.
 * @param {Array} todos - Array of todo objects.
 */
export function saveTodos(todos) {
  setItem('todos', todos);
}

/**
 * Load the todo list from storage.
 * Returns an empty array if no data is present.
 * @returns {Array}
 */
export function loadTodos() {
  const data = getItem('todos');
  return Array.isArray(data) ? data : [];
}
