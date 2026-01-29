import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, driverId } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch report details
    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      throw new Error('Failed to fetch report');
    }

    const targetDriverId = driverId || report.driver_id;

    if (!targetDriverId) {
      throw new Error('Driver not assigned to report');
    }

    const { data: driverRecord, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', targetDriverId)
      .single();

    if (driverError) {
      console.error('Error fetching driver:', driverError);
      throw new Error('Failed to fetch driver');
    }

    if (!driverRecord?.phone_number) {
      throw new Error('Driver phone number not found');
    }

    // Create warning message
    const warningMessage = `Rally Warning: You have been reported for ${report.incident_type}. Please drive safely and follow rally regulations. Report #${report.report_number}`;

    const notificationClientId = Deno.env.get('NOTIFICATIONAPI_CLIENT_ID');
    const notificationClientSecret = Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET');
    let deliveryStatus: 'sent' | 'skipped' | 'failed' = 'sent';
    let notificationError: string | undefined;

    if (!notificationClientId || !notificationClientSecret) {
      deliveryStatus = 'skipped';
      notificationError = 'NotificationAPI credentials are not configured';
    } else {
      try {
        // Send SMS via NotificationAPI REST API
        const notificationPayload = {
          type: 'rally_watchdog_warning',
          to: {
            id: driverRecord.driver_name || 'driver',
            number: driverRecord.phone_number
          },
          parameters: {
            comment: warningMessage,
            incident_type: report.incident_type,
            report_number: report.report_number,
            vehicle_number: report.vehicle_number
          }
        };

        const notificationResponse = await fetch(
          `${Deno.env.get('NOTIFICATIONAPI_BASE_URL') || 'https://api.notificationapi.com'}/${notificationClientId}/sender`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${notificationClientId}:${notificationClientSecret}`)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notificationPayload),
          }
        );

        if (!notificationResponse.ok) {
          const errorText = await notificationResponse.text();
          console.error('NotificationAPI error response:', errorText);
          deliveryStatus = 'failed';
          notificationError = `NotificationAPI request failed with status ${notificationResponse.status}`;
        }
      } catch (notificationErr) {
        console.error('NotificationAPI error:', notificationErr);
        deliveryStatus = 'failed';
        notificationError = notificationErr instanceof Error ? notificationErr.message : 'Unknown notification error';
      }
    }

    // Record the warning in the database
    const { error: warningError } = await supabase
      .from('warnings')
      .insert({
        report_id: reportId,
        driver_id: targetDriverId,
        warning_type: 'sms',
        message: warningMessage,
        delivery_status: deliveryStatus
      });

    if (warningError) {
      console.error('Error recording warning:', warningError);
    }

    const responseBody = {
      success: deliveryStatus === 'sent',
      delivery_status: deliveryStatus,
      message:
        deliveryStatus === 'sent'
          ? 'Warning SMS sent successfully'
          : notificationError ??
            (deliveryStatus === 'skipped'
              ? 'SMS skipped'
              : 'Failed to send SMS'),
    };

    if (notificationError) {
      responseBody['reason'] = notificationError;
    }

    return new Response(JSON.stringify({
      ...responseBody
    }), {
      status: deliveryStatus === 'sent' ? 200 : 202,
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
