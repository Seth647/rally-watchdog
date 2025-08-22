-- Fix security warnings by updating function search paths

-- Update generate_report_number function
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN 'RPT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
END;
$$;

-- Update handle_new_report function  
CREATE OR REPLACE FUNCTION handle_new_report()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;