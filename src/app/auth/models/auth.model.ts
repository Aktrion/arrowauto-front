export interface LoginResponse {
  message: string;
  user: { id: string; userName: string; name: string };
  token: string;
}
