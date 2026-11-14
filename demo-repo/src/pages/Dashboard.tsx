import React from 'react';
import { UserProfileCard } from '@/components/UserProfileCard';

export const DashboardPage: React.FC = () => {
  return (
    <main>
      <h1>Developer Console</h1>
      <UserProfileCard token="session_token_xyz" />
    </main>
  );
};
