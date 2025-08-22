import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Edit, Trash2, Car, Phone, User } from "lucide-react";

interface Driver {
  id: string;
  vehicle_number: string;
  driver_name: string;
  phone_number: string;
  vehicle_make?: string;
  vehicle_model?: string;
  emergency_contact?: string;
  created_at: string;
}

export function DriverRegistry() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    vehicle_number: "",
    driver_name: "",
    phone_number: "",
    vehicle_make: "",
    vehicle_model: "",
    emergency_contact: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("vehicle_number");

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast({
        title: "Error",
        description: "Failed to load drivers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterDrivers = () => {
    if (!searchTerm) {
      setFilteredDrivers(drivers);
      return;
    }

    const filtered = drivers.filter(driver => 
      driver.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone_number.includes(searchTerm) ||
      driver.vehicle_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredDrivers(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_number || !formData.driver_name || !formData.phone_number) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingDriver) {
        const { error } = await supabase
          .from("drivers")
          .update(formData)
          .eq("id", editingDriver.id);

        if (error) throw error;
        
        toast({
          title: "Driver Updated",
          description: "Driver information has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from("drivers")
          .insert(formData);

        if (error) throw error;
        
        toast({
          title: "Driver Added",
          description: "New driver has been added to the registry.",
        });
      }

      setIsDialogOpen(false);
      setEditingDriver(null);
      setFormData({
        vehicle_number: "",
        driver_name: "",
        phone_number: "",
        vehicle_make: "",
        vehicle_model: "",
        emergency_contact: ""
      });
      fetchDrivers();
    } catch (error: unknown) {
      console.error("Error saving driver:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error && error.message.includes("duplicate")
            ? "Vehicle number already exists"
            : "Failed to save driver information",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      vehicle_number: driver.vehicle_number,
      driver_name: driver.driver_name,
      phone_number: driver.phone_number,
      vehicle_make: driver.vehicle_make || "",
      vehicle_model: driver.vehicle_model || "",
      emergency_contact: driver.emergency_contact || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (driver: Driver) => {
    if (!confirm(`Are you sure you want to delete driver ${driver.driver_name} (${driver.vehicle_number})?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driver.id);

      if (error) throw error;
      
      toast({
        title: "Driver Deleted",
        description: "Driver has been removed from the registry.",
      });
      
      fetchDrivers();
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast({
        title: "Error",
        description: "Failed to delete driver",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_number: "",
      driver_name: "",
      phone_number: "",
      vehicle_make: "",
      vehicle_model: "",
      emergency_contact: ""
    });
    setEditingDriver(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6 border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
                  Driver Registry
                </CardTitle>
                <CardDescription>
                  Manage rally participants and vehicle information
                </CardDescription>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button variant="rally" className="shrink-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Driver
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-md bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDriver ? "Edit Driver" : "Add New Driver"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingDriver ? "Update driver information" : "Add a new driver to the rally registry"}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_number">Vehicle Number *</Label>
                        <Input
                          id="vehicle_number"
                          value={formData.vehicle_number}
                          onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                          placeholder="007"
                          className="bg-input border-border"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone_number">Phone Number *</Label>
                        <Input
                          id="phone_number"
                          value={formData.phone_number}
                          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                          placeholder="+1234567890"
                          className="bg-input border-border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="driver_name">Driver Name *</Label>
                      <Input
                        id="driver_name"
                        value={formData.driver_name}
                        onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                        placeholder="John Doe"
                        className="bg-input border-border"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_make">Vehicle Make</Label>
                        <Input
                          id="vehicle_make"
                          value={formData.vehicle_make}
                          onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                          placeholder="Toyota"
                          className="bg-input border-border"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_model">Vehicle Model</Label>
                        <Input
                          id="vehicle_model"
                          value={formData.vehicle_model}
                          onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                          placeholder="Land Cruiser"
                          className="bg-input border-border"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact">Emergency Contact</Label>
                      <Input
                        id="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                        placeholder="Emergency contact info"
                        className="bg-input border-border"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="rally">
                        {editingDriver ? "Update" : "Add"} Driver
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by vehicle number, name, phone, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>

            <div className="grid gap-4">
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No matching drivers found" : "No drivers registered"}
                </div>
              ) : (
                filteredDrivers.map((driver) => (
                  <Card key={driver.id} className="border-border bg-card">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-[hsl(var(--primary)_/_0.1)] text-primary px-3 py-1 rounded-full font-mono font-bold">
                              #{driver.vehicle_number}
                            </div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {driver.driver_name}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {driver.phone_number}
                            </div>
                            
                            {(driver.vehicle_make || driver.vehicle_model) && (
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4" />
                                {[driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(" ")}
                              </div>
                            )}
                          </div>
                          
                          {driver.emergency_contact && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Emergency: {driver.emergency_contact}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(driver)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(driver)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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