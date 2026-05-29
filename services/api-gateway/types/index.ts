// Standard envelope for every API response
// Keeps frontend integration predictable — same shape every time
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// What we store inside a JWT access token
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Attached to every authenticated request after token verification
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}