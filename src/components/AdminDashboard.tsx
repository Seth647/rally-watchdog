import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, MessageSquare, Phone, AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface Report {
  id: string;
  report_number: string;
  vehicle_number: string;
  driver_name?: string;
  incident_type: string;
  description: string;
  location?: string;
  status: string;
  created_at: string;
  driver_id?: string;
  phone_number?: string;
  reporter_name?: string;
  reporter_email?: string;
  incident_time?: string;
  media_url?: string;
  reporter_contact?: string;
  updated_at?: string;
  user_id?: string;
}

export function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          drivers (
            driver_name,
            phone_number
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reportsWithDrivers = data.map(report => ({
        id: report.id,
        report_number: report.report_number || '',
        vehicle_number: report.vehicle_number,
        incident_type: report.incident_type,
        description: report.description,
        location: report.location,
        status: report.status,
        created_at: report.created_at,
        driver_id: report.driver_id,
        reporter_name: report.reporter_name,
        reporter_email: (report as any).reporter_email,
        incident_time: report.incident_time,
        media_url: report.media_url,
        reporter_contact: report.reporter_contact,
        updated_at: report.updated_at,
        user_id: (report as any).user_id,
        driver_name: report.drivers?.driver_name,
        phone_number: report.drivers?.phone_number
      }));

      setReports(reportsWithDrivers);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.incident_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    setFilteredReports(filtered);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;

      setReports(reports.map(report => 
        report.id === reportId ? { ...report, status: newStatus } : report
      ));

      toast({
        title: "Status Updated",
        description: `Report status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const sendWarning = async (report: Report) => {
    if (!report.phone_number) {
      toast({
        title: "No Contact Info",
        description: "Driver phone number not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-warning-sms', {
        body: { reportId: report.id }
      });

      if (error) throw error;

      toast({
        title: "Warning Sent",
        description: `SMS warning sent to ${report.driver_name || 'driver'} at ${report.phone_number}`,
      });
      
      updateReportStatus(report.id, "resolved");
    } catch (error) {
      console.error("Error sending warning:", error);
      toast({
        title: "Error",
        description: "Failed to send warning SMS",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-[hsl(var(--secondary))] text-secondary-foreground"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "investigating":
        return <Badge variant="default" className="bg-[hsl(var(--accent))] text-accent-foreground"><AlertTriangle className="w-3 h-3 mr-1" />Investigating</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-[hsl(140_75%_45%)] text-white border-[hsl(140_75%_45%)]"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6 border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
              Rally Control Dashboard
            </CardTitle>
            <CardDescription>
              Monitor and manage driver incident reports
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vehicle number, report ID, or driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input border-border"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-input border-border">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4">
              {filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reports found
                </div>
              ) : (
                filteredReports.map((report) => (
                  <Card key={report.id} className="border-border bg-card">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="outline" className="bg-[hsl(var(--primary)_/_0.1)] text-primary border-primary">
                              {report.report_number}
                            </Badge>
                            <Badge variant="outline" className="font-mono">
                              #{report.vehicle_number}
                            </Badge>
                            {getStatusBadge(report.status)}
                          </div>
                          
                          <div className="space-y-2">
                            <p className="font-semibold text-lg">
                              {report.driver_name || "Unknown Driver"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-secondary">
                                {report.incident_type}
                              </span>
                              {report.location && ` • ${report.location}`}
                            </p>
                            <p className="text-sm">{report.description}</p>
                            {(report.reporter_name || report.reporter_email) && (
                              <div className="text-xs text-muted-foreground border-l-2 border-border pl-3 bg-muted/30 p-2 rounded">
                                <p className="font-medium">Reported by:</p>
                                {report.reporter_name && <p>{report.reporter_name}</p>}
                                {report.reporter_email && <p>{report.reporter_email}</p>}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Reported: {new Date(report.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 min-w-0 lg:min-w-[200px]">
                          <Select
                            value={report.status}
                            onValueChange={(value) => updateReportStatus(report.id, value)}
                          >
                            <SelectTrigger className="bg-input border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="investigating">Investigating</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {report.phone_number && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => sendWarning(report)}
                              className="w-full"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Send Warning
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}