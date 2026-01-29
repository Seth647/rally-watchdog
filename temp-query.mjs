import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const { data, error } = await supabase.from("reports").select("id, report_number, driver_id, vehicle_number").limit(5);
console.log("error", error);
console.log("data", data);

