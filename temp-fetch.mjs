const resp = await fetch("https://rnomburmcjybehlbzgoy.supabase.co/functions/v1/send-warning-sms", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  },
  body: JSON.stringify({ reportId: "61683fad-06fa-45c8-a522-75781a47f537" })
});
console.log(resp.status, resp.statusText);
const text = await resp.text();
console.log(text);

