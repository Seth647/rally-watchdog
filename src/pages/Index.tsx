import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportForm } from "@/components/ReportForm";
import { AlertTriangle, Shield, Users, FileText, ArrowRight } from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [showReportForm, setShowReportForm] = useState(false);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const featureGridCols = isAdmin ? "md:grid-cols-3" : "md:grid-cols-2";
  const quickActionCols = isAdmin ? "md:grid-cols-2" : "";

  const handleProtectedNav = (path: string) => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You are not an administrator",
        variant: "destructive",
      });
      return;
    }
    navigate(path);
  };

  if (showReportForm) {
    return <ReportForm onReportSubmitted={() => setShowReportForm(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)_/_0.1)] to-[hsl(var(--primary-glow)_/_0.05)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] p-4 rounded-full shadow-[var(--shadow-glow)]">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
              Montagu Road Rally Watchdog
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Professional incident reporting system for cross-country rally events. 
              Maintain safety and compliance with real-time driver monitoring.
            </p>
          </div>

          {/* Quick Actions */}
          <div className={`grid gap-8 mb-16 ${quickActionCols}`}>
            <Card className="border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-rally)] transition-all duration-300 group">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-[hsl(var(--secondary)_/_0.1)] p-3 rounded-full group-hover:bg-[hsl(var(--secondary)_/_0.2)] transition-colors">
                    <AlertTriangle className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Report Incident</CardTitle>
                    <CardDescription>
                      Submit a driver misconduct report
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Quick and secure incident reporting for rally participants. Help maintain event safety standards.
                </p>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="w-full group"
                  onClick={() => setShowReportForm(true)}
                >
                  Submit Report
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-rally)] transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-[hsl(var(--accent)_/_0.1)] p-3 rounded-full group-hover:bg-[hsl(var(--accent)_/_0.2)] transition-colors">
                      <Shield className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Rally Control</CardTitle>
                      <CardDescription>
                        Admin dashboard for event organizers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Monitor incidents, manage reports, and send warnings to drivers in real-time.
                  </p>
                  <Button
                    variant="rally"
                    size="lg"
                    className="w-full group"
                    onClick={() => handleProtectedNav("/admin")}
                  >
                    Access Dashboard
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Feature Cards */}
          <div className={`grid gap-6 ${featureGridCols}`}>
            <Card className="border-border bg-card shadow-[var(--shadow-card)]">
              <CardHeader className="text-center">
                <div className="bg-[hsl(var(--primary)_/_0.1)] p-3 rounded-full w-fit mx-auto mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Real-time Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Instant incident reporting with automatic driver lookup and unique tracking IDs.
                </p>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="border-border bg-card shadow-[var(--shadow-card)]">
                <CardHeader className="text-center">
                  <div className="bg-[hsl(var(--accent)_/_0.1)] p-3 rounded-full w-fit mx-auto mb-4">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle>Driver Registry</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center">
                    Comprehensive database of all rally participants and their vehicle information.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => handleProtectedNav("/registry")}
                  >
                    View Registry
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-border bg-card shadow-[var(--shadow-card)]">
              <CardHeader className="text-center">
                <div className="bg-[hsl(var(--secondary)_/_0.1)] p-3 rounded-full w-fit mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Warning System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Direct SMS and WhatsApp notifications to drivers for immediate safety interventions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 Montagu Road Rally Watchdog. Professional rally safety management system.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
