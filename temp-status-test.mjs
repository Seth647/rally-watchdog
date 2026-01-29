import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const { data: reports, error } = await supabase.from("reports").select("id, status").limit(1);
if (error) {
  console.error("fetch error", error);
  process.exit(1);
}
const report = reports?.[0];
if (!report) {
  console.error("no reports");
  process.exit(1);
}
const { data: updated, error: updateError } = await supabase.from("reports").update({ status: report.status }).eq("id", report.id).select("id, status");
console.log({ updateError, updated });

