import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, Camera, MapPin, Phone, Lock } from "lucide-react";

const INCIDENT_TYPES = [
  "Speeding",
  "Reckless Driving", 
  "Improper Overtaking",
  "Not Following Route",
  "Unsafe Behavior",
  "Equipment Violation",
  "Other"
];

interface ReportFormProps {
  onReportSubmitted?: () => void;
}

export function ReportForm({ onReportSubmitted }: ReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    incidentType: "",
    description: "",
    location: "",
    reporterName: "",
    reporterContact: ""
  });
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a report.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.vehicleNumber || !formData.incidentType || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("reports")
        .insert({
          vehicle_number: formData.vehicleNumber,
          incident_type: formData.incidentType,
          description: formData.description,
          location: formData.location || null,
          reporter_name: formData.reporterName || null,
          reporter_contact: formData.reporterContact || null,
        } as any);

      if (error) throw error;

      toast({
        title: "Report Submitted Successfully",
        description: "Your incident report has been received and will be reviewed.",
      });

      // Reset form
      setFormData({
        vehicleNumber: "",
        incidentType: "",
        description: "",
        location: "",
        reporterName: "",
        reporterContact: ""
      });

      onReportSubmitted?.();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Submission Failed",
        description: "Unable to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] p-3 rounded-full">
                <Lock className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please sign in to submit an incident report
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            <CardDescription>
              Help maintain rally safety by reporting incidents
            </CardDescription>
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
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="e.g., 007"
                  className="bg-input border-border focus:ring-[hsl(var(--primary))]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentType" className="text-sm font-medium">
                  Incident Type *
                </Label>
                <Select 
                  value={formData.incidentType} 
                  onValueChange={(value) => setFormData({ ...formData, incidentType: value })}
                >
                  <SelectTrigger className="bg-input border-border">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what happened..."
                  className="bg-input border-border focus:ring-[hsl(var(--primary))] min-h-[100px] resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location (Optional)
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Mile marker 45"
                  className="bg-input border-border"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reporterName" className="text-sm font-medium">
                    Your Name (Optional)
                  </Label>
                  <Input
                    id="reporterName"
                    value={formData.reporterName}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                    placeholder="Your name"
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterContact" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Your Contact (Optional)
                  </Label>
                  <Input
                    id="reporterContact"
                    value={formData.reporterContact}
                    onChange={(e) => setFormData({ ...formData, reporterContact: e.target.value })}
                    placeholder="Phone or email"
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="rally"
                size="lg"
                className="w-full"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}