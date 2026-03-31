export default async function handler(req, res) {

const allowedOrigin = req.headers.origin || "*";

res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
res.setHeader("Vary", "Origin");
res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
res.setHeader("Access-Control-Max-Age", "86400");

if (req.method === "OPTIONS") {
return res.status(200).end();
}

try {

const userMessage = req.body?.message || "Hello";

const response = await fetch("https://api.openai.com/v1/chat/completions", {
method: "POST",
headers: {
"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
model: "gpt-4o-mini",
messages: [
{
role: "system",
content: "You are Ayesha, a friendly Pakistani female sales assistant helping customers choose intimate wellness products. Reply naturally in Urdu/English mix."
},
{
role: "user",
content: userMessage
}
],
temperature: 0.7
})
});

const data = await response.json();

const reply =
data.choices?.[0]?.message?.content ||
"Ji main yahan hun. Aap apna concern batayein.";

return res.status(200).json({
reply: reply,
intent: "sales",
stage: "engaged",
should_offer_whatsapp: false,
should_offer_add_to_cart: false
});

} catch (error) {

return res.status(200).json({
reply: "Ji ek second please. Main check kar rahi hun.",
error: error.message
});

}

}
