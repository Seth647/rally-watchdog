import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MapPin, Phone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

const INCIDENT_TYPES = [
  "Speeding",
  "Reckless Driving",
  "Improper Overtaking",
  "Not Following Route",
  "Unsafe Behavior",
  "Equipment Violation",
  "Other",
];

interface ReportFormProps {
  onReportSubmitted?: () => void;
}

type ReportInsertPayload = Omit<Database["public"]["Tables"]["reports"]["Insert"], "report_number"> & {
  report_number?: string;
};

export function ReportForm({ onReportSubmitted }: ReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientFingerprint, setClientFingerprint] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    incidentType: "",
    description: "",
    location: "",
    reporterName: "",
    reporterContact: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const STORAGE_KEY = "rw_client_fingerprint";
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) {
        setClientFingerprint(existing);
        return;
      }
      const newId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(STORAGE_KEY, newId);
      setClientFingerprint(newId);
    } catch (error) {
      console.error("Unable to initialize client fingerprint", error);
    }
  }, []);

  const enforceRateLimits = async (fingerprint: string, userId?: string) => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const identifierColumn = userId ? "user_id" : "client_fingerprint";
    const identifierValue = userId ?? fingerprint;

    const { count: count3h, error: error3h } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq(identifierColumn, identifierValue)
      .gte("created_at", threeHoursAgo);

    if (error3h) throw error3h;
    if ((count3h ?? 0) >= 3) {
      throw new Error("You can only submit 3 incident reports every 3 hours. Please wait before submitting another report.");
    }

    const { count: count24h, error: error24h } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq(identifierColumn, identifierValue)
      .gte("created_at", twentyFourHoursAgo);

    if (error24h) throw error24h;
    if ((count24h ?? 0) >= 6) {
      throw new Error("You can only submit 6 incident reports within 24 hours. Please wait before submitting again tomorrow.");
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicleNumber.trim()) newErrors.vehicleNumber = "Vehicle number is required.";
    if (!formData.incidentType.trim()) newErrors.incidentType = "Select an incident type.";
    if (!formData.description.trim()) newErrors.description = "Description is required.";
    if (!formData.location.trim()) newErrors.location = "Location is required.";
    if (!formData.reporterName.trim()) newErrors.reporterName = "Your name is required.";
    if (!formData.reporterContact.trim()) newErrors.reporterContact = "Contact information is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!clientFingerprint) {
      toast({
        title: "Please try again",
        description: "We couldn't generate a secure client identifier. Refresh and try once more.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await enforceRateLimits(clientFingerprint, user?.id);

      const payload: ReportInsertPayload = {
        vehicle_number: formData.vehicleNumber,
        incident_type: formData.incidentType,
        description: formData.description,
        location: formData.location || null,
        reporter_name: formData.reporterName || null,
        reporter_contact: formData.reporterContact || null,
        client_fingerprint: clientFingerprint,
        ...(user?.id ? { user_id: user.id } : {}),
      };

      const { error } = await supabase.from("reports").insert(payload);

      if (error) throw error;

      toast({
        title: "Report Submitted Successfully",
        description: "Your incident report has been received and will be reviewed.",
      });

      setFormData({
        vehicleNumber: "",
        incidentType: "",
        description: "",
        location: "",
        reporterName: "",
        reporterContact: "",
      });
      setErrors({});

      onReportSubmitted?.();
    } catch (error) {
      console.error("Error submitting report:", error);
      const message = error instanceof Error ? error.message : "Unable to submit report. Please try again.";
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <Card className="border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
              Report Driver Misconduct
            </CardTitle>
            <CardDescription>Help maintain rally safety by reporting incidents</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber" className="text-sm font-medium">
                  Vehicle Number *
                </Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, vehicleNumber: e.target.value });
                    if (errors.vehicleNumber) setErrors({ ...errors, vehicleNumber: "" });
                  }}
                  placeholder="e.g., 007"
                  className={`bg-input border ${errors.vehicleNumber ? "border-destructive" : "border-border"} focus:ring-[hsl(var(--primary))]`}
                  required
                />
                {errors.vehicleNumber && <p className="text-sm text-destructive">{errors.vehicleNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentType" className="text-sm font-medium">
                  Incident Type *
                </Label>
                <Select
                  value={formData.incidentType}
                  onValueChange={(value) => {
                    setFormData({ ...formData, incidentType: value });
                    if (errors.incidentType) setErrors({ ...errors, incidentType: "" });
                  }}
                >
                  <SelectTrigger className={`bg-input border ${errors.incidentType ? "border-destructive" : "border-border"}`}>
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.incidentType && <p className="text-sm text-destructive">{errors.incidentType}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors({ ...errors, description: "" });
                  }}
                  placeholder="Describe what happened..."
                  className={`bg-input border ${errors.description ? "border-destructive" : "border-border"} focus:ring-[hsl(var(--primary))] min-h-[100px] resize-none`}
                  required
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (errors.location) setErrors({ ...errors, location: "" });
                  }}
                  placeholder="e.g., Mile marker 45"
                  className={`bg-input border ${errors.location ? "border-destructive" : "border-border"}`}
                  required
                />
                {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reporterName" className="text-sm font-medium">
                    Your Name
                  </Label>
                  <Input
                    id="reporterName"
                    value={formData.reporterName}
                    onChange={(e) => {
                      setFormData({ ...formData, reporterName: e.target.value });
                      if (errors.reporterName) setErrors({ ...errors, reporterName: "" });
                    }}
                    placeholder="Your name"
                    className={`bg-input border ${errors.reporterName ? "border-destructive" : "border-border"}`}
                    required
                  />
                  {errors.reporterName && <p className="text-sm text-destructive">{errors.reporterName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterContact" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Your Contact
                  </Label>
                  <Input
                    id="reporterContact"
                    value={formData.reporterContact}
                    onChange={(e) => {
                      setFormData({ ...formData, reporterContact: e.target.value });
                      if (errors.reporterContact) setErrors({ ...errors, reporterContact: "" });
                    }}
                    placeholder="Phone or email"
                    className={`bg-input border ${errors.reporterContact ? "border-destructive" : "border-border"}`}
                    required
                  />
                  {errors.reporterContact && <p className="text-sm text-destructive">{errors.reporterContact}</p>}
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} variant="rally" size="lg" className="w-full">
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
