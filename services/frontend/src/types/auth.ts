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
  /** Server accounts only: false until the emailed link is used. Absent on the local user. */
  email_verified?: boolean;
  /** Preferred measurement units (synced with the server account). */
  units?: 'metric' | 'imperial';
  /** Server accounts only: when the profile was last changed (last-write-wins sync). */
  profile_updated_at?: string | null;
}

/** Fields a user can change on their own profile. */
export interface ProfileUpdate {
  name?: string;
  cycle_length?: number;
  units?: 'metric' | 'imperial';
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
}
