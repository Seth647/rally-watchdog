-- Create drivers table for rally participants
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_number TEXT NOT NULL UNIQUE,
  driver_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  vehicle_make TEXT,
  vehicle_model TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table for incident reporting
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_number TEXT NOT NULL UNIQUE,
  vehicle_number TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  reporter_name TEXT,
  reporter_contact TEXT,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  incident_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warnings table for tracking notifications sent
CREATE TABLE public.warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  warning_type TEXT NOT NULL, -- 'sms' or 'whatsapp'
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivery_status TEXT DEFAULT 'pending'
);

-- Enable Row Level Security
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access to submit reports (reports can be submitted by anyone)
CREATE POLICY "Anyone can submit reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view reports" 
ON public.reports 
FOR SELECT 
USING (true);

-- Create policies for drivers (read-only for public, full access for authenticated users)
CREATE POLICY "Anyone can view drivers" 
ON public.drivers 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage drivers" 
ON public.drivers 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for warnings (admin only)
CREATE POLICY "Authenticated users can manage warnings" 
ON public.warnings 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Function to generate unique report numbers
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RPT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign report number and resolve driver
CREATE OR REPLACE FUNCTION handle_new_report()
RETURNS TRIGGER AS $$
DECLARE
  driver_record public.drivers%ROWTYPE;
BEGIN
  -- Generate unique report number
  NEW.report_number = generate_report_number();
  
  -- Try to find matching driver by vehicle number
  SELECT * INTO driver_record 
  FROM public.drivers 
  WHERE vehicle_number = NEW.vehicle_number;
  
  IF FOUND THEN
    NEW.driver_id = driver_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle new reports
CREATE TRIGGER on_report_created
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION handle_new_report();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.drivers (vehicle_number, driver_name, phone_number, vehicle_make, vehicle_model) VALUES
  ('001', 'Alex Thompson', '+1234567890', 'Toyota', 'Land Cruiser'),
  ('007', 'Sarah Mitchell', '+1234567891', 'Ford', 'Ranger'),
  ('023', 'Mike Rodriguez', '+1234567892', 'Jeep', 'Wrangler'),
  ('045', 'Emma Wilson', '+1234567893', 'Nissan', 'Patrol'),
  ('099', 'James Carter', '+1234567894', 'Volkswagen', 'Amarok');