export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
