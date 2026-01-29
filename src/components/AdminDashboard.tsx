import { useState, useEffect, useMemo, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MessageSquare, AlertTriangle, Clock, CheckCircle, Users, Plus, Pencil, Trash2, Loader2, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface Report {
  id: string;
  report_number: string;
  vehicle_number: string;
  driver_name?: string;
  driver_plate_number?: string;
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

type ReportsQueryResult = Database["public"]["Tables"]["reports"]["Row"] & {
  reporter_email?: string | null;
  drivers?: {
    driver_name?: string | null;
    phone_number?: string | null;
    vehicle_number?: string | null;
  } | null;
};

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

interface Driver {
  id: string;
  driver_name: string;
  email?: string | null;
  phone_number: string;
  vehicle_number: string;
  license_plate_number?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
}

type NavigationTab = "warnings" | "drivers";

interface DriverFormState {
  driver_name: string;
  email: string;
  phone_number: string;
  vehicle_number: string;
  license_plate_number: string;
}

const createEmptyDriverForm = (): DriverFormState => ({
  driver_name: "",
  email: "",
  phone_number: "",
  vehicle_number: "",
  license_plate_number: "",
});

export function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "all" | "resolved" | "ignored">("pending");
  const [isReportsLoading, setIsReportsLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isDriversLoading, setIsDriversLoading] = useState(true);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>("warnings");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverFormMode, setDriverFormMode] = useState<"add" | "edit">("add");
  const [driverFormValues, setDriverFormValues] = useState<DriverFormState>(createEmptyDriverForm());
  const [driverBeingEdited, setDriverBeingEdited] = useState<Driver | null>(null);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [isDeletingDriver, setIsDeletingDriver] = useState(false);
  const { toast } = useToast();
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const navigationItems: { id: NavigationTab; label: string; description: string; icon: LucideIcon }[] = [
    {
      id: "warnings",
      label: "Warnings",
      description: "Incident queue & actions",
      icon: AlertTriangle,
    },
    {
      id: "drivers",
      label: "Drivers",
      description: "Full rally roster",
      icon: Users,
    },
  ];
  const warningFilters: { label: string; value: "pending" | "all" | "resolved" | "ignored" }[] = [
    { label: "Pending", value: "pending" },
    { label: "All", value: "all" },
    { label: "Warned", value: "resolved" },
    { label: "Ignored", value: "ignored" },
  ];
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    logout();
    setIsMobileNavOpen(false);
    navigate("/");
  }, [logout, navigate]);
  const renderNavigationButtons = (onSelect?: () => void) => (
    <div className="space-y-3">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeTab;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              onSelect?.();
            }}
            className={`w-full text-left border rounded-xl p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? "border-primary bg-card shadow-[var(--shadow-card)]"
                : "border-border bg-muted/40 hover:bg-muted/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`p-2 rounded-lg ${
                  isActive
                    ? "bg-[hsl(var(--primary)_/_0.1)] text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </button>
        );
      })}
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
  const fetchReports = useCallback(async () => {
    setIsReportsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          drivers (
            driver_name,
            phone_number,
            vehicle_number
          )
        `)
        .order("created_at", { ascending: false })
        .returns<ReportsQueryResult[]>();

      if (error) throw error;
      if (!data) {
        setReports([]);
        return;
      }

      const reportsWithDrivers: Report[] = data.map((report) => ({
        id: report.id,
        report_number: report.report_number || '',
        vehicle_number: report.vehicle_number,
        incident_type: report.incident_type,
        description: report.description,
        location: report.location || undefined,
        status: report.status,
        created_at: report.created_at,
        driver_id: report.driver_id || undefined,
        reporter_name: report.reporter_name || undefined,
        reporter_email: report.reporter_email || undefined,
        incident_time: report.incident_time || undefined,
        media_url: report.media_url || undefined,
        reporter_contact: report.reporter_contact || undefined,
        updated_at: report.updated_at,
        user_id: report.user_id || undefined,
        driver_name: report.drivers?.driver_name || undefined,
        phone_number: report.drivers?.phone_number || undefined,
        driver_plate_number: report.drivers?.vehicle_number || undefined,
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
      setIsReportsLoading(false);
    }
  }, [toast]);

  const fetchDrivers = useCallback(async () => {
    setIsDriversLoading(true);
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("driver_name", { ascending: true })
        .returns<DriverRow[]>();

      if (error) throw error;
      if (!data) {
        setDrivers([]);
        return;
      }

      const mappedDrivers: Driver[] = data.map((driver) => ({
        id: driver.id,
        driver_name: driver.driver_name,
        email: driver.email ?? driver.emergency_contact,
        phone_number: driver.phone_number,
        vehicle_number: driver.vehicle_number,
        license_plate_number: driver.license_plate_number ?? driver.vehicle_number,
        vehicle_make: driver.vehicle_make,
        vehicle_model: driver.vehicle_model,
      }));

      setDrivers(mappedDrivers);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast({
        title: "Error",
        description: "Failed to load drivers",
        variant: "destructive",
      });
    } finally {
      setIsDriversLoading(false);
    }
  }, [toast]);

  const openAddDriverForm = () => {
    setDriverFormMode("add");
    setDriverBeingEdited(null);
    setDriverFormValues(createEmptyDriverForm());
    setDriverFormOpen(true);
  };

  const openEditDriverForm = (driver: Driver) => {
    setDriverFormMode("edit");
    setDriverBeingEdited(driver);
    setDriverFormValues({
      driver_name: driver.driver_name,
      email: driver.email || "",
      phone_number: driver.phone_number,
      vehicle_number: driver.vehicle_number,
      license_plate_number: driver.license_plate_number || "",
    });
    setDriverFormOpen(true);
  };

  const closeDriverForm = () => {
    setDriverFormOpen(false);
    setDriverBeingEdited(null);
    setDriverFormValues(createEmptyDriverForm());
  };

  const handleDriverFormChange = (field: keyof DriverFormState, value: string) => {
    setDriverFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDriverFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingDriver(true);

    const payload = {
      driver_name: driverFormValues.driver_name,
      phone_number: driverFormValues.phone_number,
      vehicle_number: driverFormValues.vehicle_number,
      email: driverFormValues.email.trim() || null,
      license_plate_number: driverFormValues.license_plate_number.trim() || null,
    };

    try {
      if (driverFormMode === "add") {
        const { error } = await supabase.from("drivers").insert(payload);
        if (error) throw error;
        toast({
          title: "Driver Added",
          description: `${driverFormValues.driver_name} has been added.`,
        });
      } else if (driverBeingEdited) {
        const { error } = await supabase
          .from("drivers")
          .update(payload)
          .eq("id", driverBeingEdited.id);
        if (error) throw error;
        toast({
          title: "Driver Updated",
          description: `${driverFormValues.driver_name} has been updated.`,
        });
      }

      await fetchDrivers();
      closeDriverForm();
    } catch (error) {
      console.error("Error saving driver:", error);
      toast({
        title: "Error",
        description: "Unable to save driver. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDriver(false);
    }
  };

  const openDeleteDriverDialog = (driver: Driver) => {
    setDriverToDelete(driver);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDriver = async () => {
    if (!driverToDelete) return;
    setIsDeletingDriver(true);

    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driverToDelete.id);

      if (error) throw error;

      toast({
        title: "Driver Removed",
        description: `${driverToDelete.driver_name} has been removed from the roster.`,
      });

      await fetchDrivers();
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast({
        title: "Error",
        description: "Unable to delete driver.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingDriver(false);
      setDriverToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchDrivers();
  }, [fetchReports, fetchDrivers]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        !searchTerm ||
        report.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.incident_type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  const updateReportStatus = useCallback(
    async (reportId: string, newStatus: string) => {
      try {
        const { error } = await supabase
          .from("reports")
          .update({ status: newStatus })
          .eq("id", reportId);

        if (error) throw error;

        setReports((prev) =>
          prev.map((report) =>
            report.id === reportId ? { ...report, status: newStatus } : report
          )
        );

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
    },
    [toast]
  );

  const sendWarning = useCallback(
    async (report: Report, driverOverrideId?: string) => {
      if (!report.driver_id && !driverOverrideId) {
        toast({
          title: "Assign Driver",
          description: "Select a driver before issuing a warning.",
          variant: "destructive",
        });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("send-warning-sms", {
          body: {
            reportId: report.id,
            driverId: driverOverrideId || report.driver_id,
          },
        });

        if (error) throw error;

        toast({
          title: data?.success ? "Warning Sent" : "Warning Recorded",
          description: data?.message || `SMS warning sent for incident ${report.report_number}`,
          variant: data?.success ? "default" : "secondary",
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
    },
    [toast, updateReportStatus]
  );

  const openDriverDialog = (report: Report) => {
    setSelectedReport(report);
    setDriverDialogOpen(true);
  };

  const handleDriverSelection = async (driver: Driver) => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from("reports")
        .update({ driver_id: driver.id })
        .eq("id", selectedReport.id);

      if (error) throw error;

      const updatedReport: Report = {
        ...selectedReport,
        driver_id: driver.id,
        driver_name: driver.driver_name,
        phone_number: driver.phone_number,
        driver_plate_number: driver.license_plate_number || driver.vehicle_number,
      };

      setReports((prev) =>
        prev.map((report) => (report.id === updatedReport.id ? updatedReport : report))
      );

      await sendWarning(updatedReport, driver.id);
    } catch (error) {
      console.error("Error linking driver:", error);
      toast({
        title: "Error",
        description: "Failed to assign driver",
        variant: "destructive",
      });
    } finally {
      setDriverDialogOpen(false);
      setSelectedReport(null);
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
      case "ignored":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-dashed border-border">Ignored</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isReportsLoading) {
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
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 w-full">
        <div className="lg:hidden border border-border rounded-2xl p-4 bg-card flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rally Control</p>
            <p className="text-lg font-semibold">Navigation</p>
          </div>
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] sm:w-[360px]">
              <SheetHeader className="mb-4">
                <SheetTitle>Rally Control</SheetTitle>
              </SheetHeader>
              {renderNavigationButtons(() => setIsMobileNavOpen(false))}
            </SheetContent>
          </Sheet>
        </div>

        <aside className="hidden lg:block w-full lg:w-64 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Rally Control</p>
            <p className="text-lg font-semibold">Side Menu</p>
          </div>
          {renderNavigationButtons()}
        </aside>

        <section className="flex-1 space-y-6">
          {activeTab === "warnings" ? (
            <Card className="border-border bg-card shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
                  Convoy Warnings
                </CardTitle>
                <CardDescription>
                  Monitor reports and issue driver warnings in real-time
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by vehicle number, report ID, or driver..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-input border-border"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {warningFilters.map((filter) => {
                      const isActive = statusFilter === filter.value;
                      return (
                        <Button
                          key={filter.value}
                          type="button"
                          variant={isActive ? "default" : "outline"}
                          className={isActive ? "" : "bg-muted"}
                          onClick={() => setStatusFilter(filter.value)}
                        >
                          {filter.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No reports found
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <Card key={report.id} className="border-border bg-card">
                        <CardHeader className="pb-0">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <Badge variant="outline" className="bg-[hsl(var(--primary)_/_0.1)] text-primary border-primary font-mono">
                                #{report.report_number}
                              </Badge>
                              {getStatusBadge(report.status)}
                            </div>
                            <div>
                              <CardTitle className="text-xl">
                                {report.incident_type || "Reported Incident"}
                              </CardTitle>
                              <CardDescription>
                                Reported {new Date(report.created_at).toLocaleString()}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vehicle Number</p>
                              <p className="text-lg font-semibold">{report.vehicle_number || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plate Number</p>
                              <p className="text-lg font-semibold">
                                {report.driver_plate_number || report.vehicle_number || "Unassigned"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                              <p className="text-base">{report.location || "Not provided"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Driver</p>
                              <p className="text-base">{report.driver_name || "Unassigned"}</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                            <p className="text-base">{report.description}</p>
                          </div>
                        </CardContent>
                        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                          <div className="text-sm text-muted-foreground">
                            {report.reporter_name || report.reporter_email ? (
                              <>
                                <span className="font-medium text-foreground">Reporter:</span>{" "}
                                {report.reporter_name || "Anonymous"}
                                {report.reporter_email && ` • ${report.reporter_email}`}
                              </>
                            ) : (
                              "Reporter info unavailable"
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              variant="outline"
                              onClick={() => updateReportStatus(report.id, "ignored")}
                            >
                              Ignore
                            </Button>
                            <Button onClick={() => openDriverDialog(report)}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Issue Warning
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
                    Driver Registry
                  </CardTitle>
                  <CardDescription>Roster of all registered rally drivers</CardDescription>
                </div>
                <Button onClick={openAddDriverForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Driver
                </Button>
              </CardHeader>
              <CardContent>
                {isDriversLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      Loading drivers...
                    </div>
                  </div>
                ) : drivers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No drivers have been registered yet.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/10">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Vehicle Number</TableHead>
                          <TableHead>License Plate</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map((driver) => (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{driver.driver_name}</p>
                                {(driver.vehicle_make || driver.vehicle_model) && (
                                  <p className="text-xs text-muted-foreground">
                                    {[driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(" ")}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {driver.email || "Not provided"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {driver.phone_number}
                            </TableCell>
                            <TableCell className="font-mono">
                              {driver.vehicle_number}
                            </TableCell>
                            <TableCell className="font-mono">
                              {driver.license_plate_number || "N/A"}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDriverForm(driver)}
                              >
                                <Pencil className="w-4 h-4" />
                                <span className="sr-only">Edit driver</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => openDeleteDriverDialog(driver)}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="sr-only">Delete driver</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableCaption>{drivers.length} driver(s) registered for this rally.</TableCaption>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <Dialog
        open={driverFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDriverForm();
          } else {
            setDriverFormOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{driverFormMode === "add" ? "Add Driver" : "Edit Driver"}</DialogTitle>
            <DialogDescription>
              {driverFormMode === "add"
                ? "Create a new driver entry for this rally."
                : "Update the selected driver's information."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleDriverFormSubmit}>
            <div className="space-y-2">
              <Label htmlFor="driver_name">Driver Name</Label>
              <Input
                id="driver_name"
                value={driverFormValues.driver_name}
                onChange={(e) => handleDriverFormChange("driver_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_email">Email</Label>
              <Input
                id="driver_email"
                type="email"
                value={driverFormValues.email}
                onChange={(e) => handleDriverFormChange("email", e.target.value)}
                placeholder="driver@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_phone">Phone Number</Label>
              <Input
                id="driver_phone"
                type="tel"
                value={driverFormValues.phone_number}
                onChange={(e) => handleDriverFormChange("phone_number", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle_number">Vehicle Number</Label>
                <Input
                  id="vehicle_number"
                  value={driverFormValues.vehicle_number}
                  onChange={(e) => handleDriverFormChange("vehicle_number", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_plate_number">License Plate</Label>
                <Input
                  id="license_plate_number"
                  value={driverFormValues.license_plate_number}
                  onChange={(e) => handleDriverFormChange("license_plate_number", e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeDriverForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingDriver}>
                {isSavingDriver && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {driverFormMode === "add" ? "Save Driver" : "Update Driver"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={driverDialogOpen}
        onOpenChange={(open) => {
          setDriverDialogOpen(open);
          if (!open) {
            setSelectedReport(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select driver to issue warning</DialogTitle>
            <DialogDescription>
              {selectedReport
                ? `${selectedReport.incident_type} • Report #${selectedReport.report_number}`
                : "Choose a driver from the rally registry"}
            </DialogDescription>
          </DialogHeader>
          {isDriversLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading drivers...</div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No drivers have been registered yet.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-2">
              {drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => handleDriverSelection(driver)}
                  className="w-full text-left border border-border rounded-lg p-4 hover:border-primary hover:bg-muted/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <p className="font-semibold text-base">{driver.driver_name}</p>
                  <p className="text-sm text-muted-foreground">Vehicle #{driver.vehicle_number}</p>
                  <p className="text-sm text-muted-foreground">{driver.phone_number}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDriverToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove driver?</AlertDialogTitle>
            <AlertDialogDescription>
              {driverToDelete
                ? `This will permanently remove ${driverToDelete.driver_name} from the rally registry.`
                : "This driver will be removed from the registry."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDriver}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteDriver}
              disabled={isDeletingDriver}
            >
              {isDeletingDriver && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Driver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
