import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import DriverRegistry from "./pages/DriverRegistry";
import NotFound from "./pages/NotFound";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/registry" element={<DriverRegistry />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <AuthModal open={!user && !loading} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
