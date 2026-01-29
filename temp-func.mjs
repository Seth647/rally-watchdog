import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const { data, error } = await supabase.functions.invoke("send-warning-sms", { body: { reportId: "61683fad-06fa-45c8-a522-75781a47f537" } });
console.log("error raw", error);
console.log("data", data);

