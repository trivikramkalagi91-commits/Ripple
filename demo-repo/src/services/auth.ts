import { UserProfile, formatUserId } from '@/types/api';

export function authenticateSession(token: string): UserProfile {
  // Mock authentication logic
  const mockUser: UserProfile = {
    id: 'usr_99182',
    name: 'Shrihari Desai',
    email: 'shrihari@example.com',
    role: 'developer',
  };

  console.log(`Authenticated ${formatUserId(mockUser)}`);
  return mockUser;
}
