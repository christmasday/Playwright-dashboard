/**
 * PublicOnly - redirects authenticated users away from login/signup
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface PublicOnlyProps {
  children: React.ReactNode;
}

const PublicOnly: React.FC<PublicOnlyProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default PublicOnly;
