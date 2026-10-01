import React, { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { useAdminStore } from '../../../shared/stores/admin-store';
import { useFocusTrap } from '../../../shared/hooks/use-focus-trap';
import '../../../styles/components/admin/admin-login.css';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

// AdminLogin is mounted from more than one place (the Ctrl+Shift+A handler
// and the /admin route). Only one copy may show at a time, otherwise two
// stacked forms with the same field ids appear. The first open copy owns the
// dialog; another copy that is asked to open waits until the owner closes.
let owner: symbol | null = null;
const ownerListeners = new Set<() => void>();
const setOwner = (next: symbol | null) => {
  owner = next;
  ownerListeners.forEach(listener => listener());
};
const subscribeOwner = (listener: () => void) => {
  ownerListeners.add(listener);
  return () => {
    ownerListeners.delete(listener);
  };
};
const getOwner = () => owner;

const AdminLogin: React.FC<AdminLoginProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, isLoading, error: loginError } = useAdminStore();
  //const { fetchLogs, error: telemetryError } = useTelemetryStore();

  const [instance] = useState(() => Symbol('admin-login'));
  const currentOwner = useSyncExternalStore(subscribeOwner, getOwner, getOwner);
  const isShown = isOpen && currentOwner === instance;

  // Claim the dialog when asked to open and nobody else holds it
  useEffect(() => {
    if (isOpen && currentOwner === null) setOwner(instance);
  }, [isOpen, currentOwner, instance]);

  // Release it on close or unmount
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      if (getOwner() === instance) setOwner(null);
    };
  }, [isOpen, instance]);

  const trapRef = useFocusTrap(isShown, onClose);
  const titleId = useId();
  const emailId = useId();
  const passwordId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      const success = await login({ email, password });
      if (success) {
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

  if (!isShown) return null;

  const displayError = localError || loginError; // || telemetryError;

  return createPortal(
    <div
      className="admin-login-overlay"
      role="presentation"
      onClick={(e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className="admin-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>Admin Login</h2>
        {displayError && (
          <div className="error-message" role="alert">
            {displayError}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor={emailId} className="visually-hidden">Email</label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="username"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor={passwordId} className="visually-hidden">Password</label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
              disabled={isLoading}
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
        {/* Last in DOM order (it is positioned top-right) so the focus trap's
            initial focus lands on the email field, not on Close */}
        <button
          className="close-button"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >×</button>
      </div>
    </div>,
    document.body
  );
};

export default AdminLogin;
