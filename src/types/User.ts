export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  gamesPlayed: number;
  gamesWon: number;
  rating: number;
  status: 'active' | 'banned';
  createdAt: string;
  lastLogin: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}