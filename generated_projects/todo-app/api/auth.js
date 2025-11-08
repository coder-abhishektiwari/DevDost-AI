import axios from 'axios';
import config from '../config.json';

const baseUrl = config.authEndpoint;

/**
 * Logs in a user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} Response data containing user info and token.
 */
const login = async (email, password) => {
  try {
    const response = await axios.post(`${baseUrl}/login`, { email, password });
    return response.data;
  } catch (error) {
    // Propagate server error payload if available
    throw error.response?.data ?? error;
  }
};

/**
 * Registers a new user.
 * @param {Object} userData - Object containing user registration fields.
 * @returns {Promise<Object>} Response data containing newly created user info.
 */
const register = async (userData) => {
  try {
    const response = await axios.post(`${baseUrl}/register`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data ?? error;
  }
};

/**
 * Authenticates a user token and retrieves user profile.
 * @param {string} token - JWT or similar auth token.
 * @returns {Promise<Object>} Response data containing user profile.
 */
const authenticate = async (token) => {
  try {
    const response = await axios.get(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data ?? error;
  }
};

export { login, register, authenticate };
