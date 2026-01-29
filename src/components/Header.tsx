import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminLoginModal } from "@/components/AdminLoginModal";
import { useAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

export function Header() {
  const [open, setOpen] = useState(false);
  const { isAdmin, logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminArea =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/registry");

  const handleAdminClick = () => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      setOpen(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="fixed top-4 right-4 flex gap-2 z-50">
      {!isAdminArea && (
        <Button variant="outline" size="sm" onClick={handleAdminClick}>
          Admin
        </Button>
      )}
      {!isAdminArea && isAdmin && (
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      )}
      <AdminLoginModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
