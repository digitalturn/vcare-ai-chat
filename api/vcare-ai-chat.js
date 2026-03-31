export default async function handler(req, res) {
  res.status(200).json({
    reply: "AI backend connected successfully",
    intent: "greeting",
    language_style: "mixed",
    stage: "cold",
    should_offer_whatsapp: false,
    should_offer_add_to_cart: false,
    captured_concern: "",
    captured_objection: ""
  });
}
