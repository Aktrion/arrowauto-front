export type UserRole = 'admin' | 'operator' | 'supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
}
