// API response types
export interface ApiResponse<T> {
  data: T;
  error: null | {
    message: string;
    code: string;
  };
}
