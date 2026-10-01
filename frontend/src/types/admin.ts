export interface AdminCredentials {
  email: string;
  password: string;
}

export interface AdminState {
  isLoggedIn: boolean;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
