import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Header } from "./Header";
import { useAuth } from "@/data/auth";

/**
 * Layout route for everything behind the login screen: waits for the account
 * table, bounces signed-out visitors to /login, then renders the app shell
 * (header + page + footer) around the child route.
 */
export function RequireAuth() {
  const { ready, currentUser } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}

/** Wrap supervisor-only pages (user management). Operators land back on "/". */
export function RequireSupervisor({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (currentUser?.role !== "supervisor") return <Navigate to="/" replace />;
  return children;
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-4">
      <div className="flex items-center px-4 text-[11px] text-muted-foreground sm:px-6 lg:px-8">
        <span className="font-mono">
          UBE · Container Lock Verification System
        </span>
      </div>
    </footer>
  );
}
