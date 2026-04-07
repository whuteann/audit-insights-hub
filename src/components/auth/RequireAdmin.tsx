import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

export default function RequireAdmin() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-sm text-muted-foreground">
        Checking access...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/tp-docs" replace />;
  }

  return <Outlet />;
}
