export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  code: string;
  data: T;
  timestamp: string;
}
