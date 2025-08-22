import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const headers = { "Content-Type": "application/json" };
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    const body = await req.json();

    // Check last report timestamp for this user
    const { data: lastReports, error: fetchError } = await supabase
      .from("reports")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers }
      );
    }

    if (lastReports && lastReports.length > 0) {
      const last = new Date(lastReports[0].created_at as string);
      const diff = Date.now() - last.getTime();
      if (diff < 3 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: "Please wait before submitting another report." }),
          { status: 429, headers }
        );
      }
    }

    const { error: insertError } = await supabase.from("reports").insert({
      vehicle_number: body.vehicle_number,
      incident_type: body.incident_type,
      description: body.description,
      location: body.location ?? null,
      reporter_name: body.reporter_name ?? null,
      reporter_contact: body.reporter_contact ?? null,
      user_id: user.id,
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers }
      );
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers }
    );
  }
});
