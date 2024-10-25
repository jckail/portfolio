import React, { useState } from 'react';
import '../styles/admin-login.css';
import { API_CONFIG } from '../configs';

const AdminLogin = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.verify}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      console.log('Token verified:', data);
      return true;
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('adminToken');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Store token and verify it
      const token = data.access_token;
      localStorage.setItem('adminToken', token);
      
      const isVerified = await verifyToken(token);
      if (!isVerified) {
        throw new Error('Token verification failed');
      }

      onLoginSuccess?.();
      onClose();
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
      localStorage.removeItem('adminToken');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-login-overlay">
      <div className="admin-login-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Admin Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
