import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const { user, login, error, setError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear auth context errors on load
    setError(null);
    setFormError('');
  }, [setError]);

  useEffect(() => {
    // If user is already logged in, redirect them
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!username.trim() || !password.trim()) {
      setFormError('Please enter both username and password.');
      return;
    }

    try {
      const loggedInUser = await login(username, password);
      if (loggedInUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      // Handled by auth context error, but captured in catch block
    }
  };

  return (
    <div className="login-container">
      <div className="glass-card login-card">
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Account Sign In</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Log in to view Docker guides or inspect admin logs.
        </p>

        {(formError || error) && (
          <div className="alert-error">
            {formError || error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="submit-btn">
            Sign In
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'left', fontSize: '0.85rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Default Seed Credentials (if not overwritten by env):</p>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <li>Admin: <strong style={{ color: 'var(--text-heading)' }}>admin</strong> / <strong style={{ color: 'var(--text-heading)' }}>admin123</strong></li>
            <li>Standard: <strong style={{ color: 'var(--text-heading)' }}>user</strong> / <strong style={{ color: 'var(--text-heading)' }}>user123</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
