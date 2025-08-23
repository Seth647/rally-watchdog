import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import notificationapi from 'npm:notificationapi-node-server-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize NotificationAPI
notificationapi.init(
  Deno.env.get('NOTIFICATIONAPI_CLIENT_ID') || '',
  Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET') || ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch report with driver information
    const { data: report, error } = await supabase
      .from('reports')
      .select(`
        *,
        drivers (
          driver_name,
          phone_number
        )
      `)
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      throw new Error('Failed to fetch report');
    }

    if (!report.drivers?.phone_number) {
      throw new Error('Driver phone number not found');
    }

    // Create warning message
    const warningMessage = `Rally Warning: You have been reported for ${report.incident_type}. Please drive safely and follow rally regulations. Report #${report.report_number}`;

    // Send SMS via NotificationAPI
    await notificationapi.send({
      type: 'rally_watchdog_warning',
      to: {
        id: report.drivers.driver_name || 'driver',
        number: report.drivers.phone_number
      },
      parameters: {
        comment: warningMessage,
        incident_type: report.incident_type,
        report_number: report.report_number,
        vehicle_number: report.vehicle_number
      }
    });

    // Record the warning in the database
    const { error: warningError } = await supabase
      .from('warnings')
      .insert({
        report_id: reportId,
        driver_id: report.driver_id,
        warning_type: 'sms',
        message: warningMessage,
        delivery_status: 'sent'
      });

    if (warningError) {
      console.error('Error recording warning:', warningError);
    }

    console.log(`SMS warning sent to ${report.drivers.phone_number} for incident: ${report.incident_type}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Warning SMS sent successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-warning-sms function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});