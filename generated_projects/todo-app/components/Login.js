import React, { Component } from 'react';
import { login } from '../auth.js';
import '../styles.css';

/**
 * Login component renders a simple login form.
 * It manages local state for username, password, loading status and error messages.
 * On form submission it calls the login function from auth.js.
 */
class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      loading: false,
      error: null,
    };
  }

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password } = this.state;
    this.setState({ loading: true, error: null });
    try {
      await login(username, password);
      // On successful login, you might want to redirect or update app state.
      // For this example, we simply log a success message.
      console.log('Login successful');
    } catch (err) {
      this.setState({ error: err.message || 'Login failed' });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const { username, password, loading, error } = this.state;
    return (
      <div className="login-container">
        <h2>Login</h2>
        <form onSubmit={this.handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={this.handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={this.handleChange}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }
}

export default Login;
