import React from 'react';
import { authenticateSession } from '@/services/auth';

export const UserProfileCard: React.FC<{ token: string }> = ({ token }) => {
  const user = authenticateSession(token);

  return (
    <div className="card">
      <h3>{user.name}</h3>
      <p>ID: {user.id}</p>
      <span>Role: {user.role}</span>
    </div>
  );
};
