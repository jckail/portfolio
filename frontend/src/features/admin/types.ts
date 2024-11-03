export interface AdminState {
  isLoggedIn: boolean;
  token?: string;
}

export interface AdminLoginRequest {
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AdminSession {
  token: string;
  expiresAt: number;
}

export interface AdminPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  permissions: AdminPermissions;
  lastLogin?: string;
}
