import React, { useState } from 'react';
import { useAdminStore } from '../stores/admin-store';
import '../styles/admin-login.css';

interface AdminLoginProps {
  onClose: () => void;
}

export function AdminLogin({ onClose }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(password);
    if (!success) {
      setError('Invalid password');
    } else {
      onClose();
    }
  };

  return (
    <div className="admin-login-overlay">
      <div className="admin-login-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
