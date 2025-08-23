import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import notificationapi from 'npm:notificationapi-node-server-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WarningRequest {
  vehicle_number: string;
  reason: string;
  report_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicle_number, reason, report_id }: WarningRequest = await req.json();

    console.log('Processing warning request:', { vehicle_number, reason, report_id });

    // Validate inputs
    if (!vehicle_number || !reason || !report_id) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: vehicle_number, reason, report_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up driver by vehicle number
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, driver_name, phone_number, vehicle_number')
      .eq('vehicle_number', vehicle_number)
      .single();

    if (driverError || !driver) {
      console.error('Driver not found:', driverError);
      return new Response(
        JSON.stringify({ error: 'Driver not found for vehicle number' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!driver.phone_number) {
      console.error('No phone number for driver');
      return new Response(
        JSON.stringify({ error: 'No phone number found for driver' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare SMS message
    const message = `Driver ${driver.vehicle_number} Warning: An anonymous Report was made in regard to your driving ${reason} , please refrain from continuing to drive in this manner an adhere to the rally rules`;

    console.log('Sending SMS to:', driver.phone_number, 'Message:', message);

    // Initialize NotificationAPI with client credentials
    const notificationApiClientId = Deno.env.get('NOTIFICATIONAPI_CLIENT_ID');
    const notificationApiClientSecret = Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET');
    
    if (!notificationApiClientId || !notificationApiClientSecret) {
      console.error('NotificationAPI credentials not found');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize NotificationAPI
    notificationapi.init(notificationApiClientId, notificationApiClientSecret);

    console.log('Sending SMS to:', driver.phone_number, 'Message:', message);

    let deliveryStatus = 'failed';
    let smsResult: any = null;

    try {
      // Send SMS via NotificationAPI SDK
      await notificationapi.send({
        type: 'rally_watchdog_warning',
        to: {
          id: driver.phone_number, // Use phone number as ID
          number: driver.phone_number
        }
      });
      
      deliveryStatus = 'sent';
      smsResult = { success: true };
      console.log('SMS sent successfully via NotificationAPI SDK');
    } catch (smsError: any) {
      console.error('SMS sending failed:', smsError);
      smsResult = { error: smsError.message };
    }

    // Record warning in database
    const { error: warningError } = await supabase
      .from('warnings')
      .insert({
        driver_id: driver.id,
        report_id: report_id,
        warning_type: 'driving_violation',
        message: message,
        delivery_status: deliveryStatus,
      });

    if (warningError) {
      console.error('Error recording warning:', warningError);
    }

    if (deliveryStatus === 'failed') {
      console.error('SMS sending failed:', smsResult);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS',
          details: smsResult,
          warning_recorded: !warningError
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Warning sent successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Warning sent to ${driver.driver_name} at ${driver.phone_number}`,
        driver_name: driver.driver_name,
        phone_number: driver.phone_number
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in warning function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);