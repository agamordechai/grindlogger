/**
 * Auth-related type definitions.
 */

export interface User {
  id: number;
  email: string;
  name: string;
  picture_url: string | null;
  role: string;
  cycle_length: number;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
}
