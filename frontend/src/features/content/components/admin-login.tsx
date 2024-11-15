import React, { useState } from 'react';
import { useAdminStore } from '../stores/admin-store';
import { useTelemetryStore } from '../stores/telemetry-store';
import '../styles/admin-login.css';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, isLoading, error: loginError } = useAdminStore();
  //const { fetchLogs, error: telemetryError } = useTelemetryStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      const success = await login({ email, password });
      if (success) {
        const token = localStorage.getItem('adminToken');
        // if (token) {
        //   try {
        //     await fetchLogs(token);
        //   } catch (err) {
        //     console.error('Failed to fetch logs:', err);
        //     // Don't block login success if logs fail
        //   }
        // }
        onLoginSuccess();
        onClose();
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLocalError('An unexpected error occurred. Please try again.');
    }
  };

  if (!isOpen) return null;

  const displayError = localError || loginError; // || telemetryError;

  return (
    <div className="admin-login-overlay">
      <div className="admin-login-modal">
        <button 
          className="close-button" 
          onClick={onClose}
          type="button"
          aria-label="Close"
        >×</button>
        <h2>Admin Login</h2>
        {displayError && (
          <div className="error-message" role="alert">
            {displayError}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              disabled={isLoading}
              aria-label="Email"
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
              aria-label="Password"
            />
          </div>
          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
