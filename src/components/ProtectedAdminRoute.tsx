import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";

export function ProtectedAdminRoute({ children }: { children: JSX.Element }) {
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You are not an administrator",
        variant: "destructive",
      });
    }
  }, [isAdmin, toast]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
