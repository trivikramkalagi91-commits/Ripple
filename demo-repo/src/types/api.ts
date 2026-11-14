export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
}

export function formatUserId(user: UserProfile): string {
  return `USER_${user.id.toUpperCase()}`;
}
