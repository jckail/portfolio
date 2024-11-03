export interface AdminCredentials {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
}

export interface AdminState {
  isLoggedIn: boolean;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}
