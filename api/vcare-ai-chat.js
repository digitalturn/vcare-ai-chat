export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
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

  try {
    const body = req.body || {};
    const customerMessage = String(body.customer_message || "").trim();
    const page = body.page || {};
    const product = body.product || null;
    const memory = body.memory || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    function clean(v) {
      return typeof v === "string" ? v.trim() : "";
    }

    const productSummary = product
      ? {
          handle: clean(product.handle),
          title: clean(product.title),
          description: clean(product.description).slice(0, 3000),
          type: clean(product.type),
          vendor: clean(product.vendor),
          tags: Array.isArray(product.tags) ? product.tags.slice(0, 30) : [],
          price: clean(product.price),
          compare_at_price: clean(product.compare_at_price),
          available: !!product.available,
          used_by: clean(product.used_by),
          age_restriction: clean(product.age_restriction),
          short_benefits: clean(product.short_benefits),
          usage_notes: clean(product.usage_notes)
        }
      : null;

    const systemPrompt = `
You are a warm, natural, human-like female sales advisor for an e-commerce store.

Your job:
- answer naturally like a real helpful sales girl
- sound human, not robotic
- keep the customer engaged
- build trust
- guide toward purchase softly
- help close the sale when suitable

Strict rules:
- Never say you are AI.
- Never sound scripted, overly polished, or too formal.
- Reply in the same language style as the customer:
  - Urdu -> Urdu
  - English -> English
  - Roman Urdu -> Roman Urdu
  - Mixed -> Mixed
- Keep replies short to medium.
- First answer the question properly, then ask at most one relevant follow-up.
- Use only the provided page/product/store context.
- Do not invent product claims, ingredients, guarantees, delivery promises, or medical claims.
- Do not overpromise.
- Do not push WhatsApp too early.
- If the customer is ready, move naturally toward add to cart, order, or WhatsApp help.
- If the customer is unsure, reduce confusion and build trust.

Intent values allowed:
product_info
suitability
usage
price
trust
comparison
objection
ready_to_buy
wants_human
shipping_or_cod
greeting
unclear

Return strict JSON only in this format:
{
  "reply": "text",
  "intent": "product_info|suitability|usage|price|trust|comparison|objection|ready_to_buy|wants_human|shipping_or_cod|greeting|unclear",
  "language_style": "english|urdu|roman_urdu|mixed",
  "stage": "cold|warm|hot",
  "should_offer_whatsapp": true,
  "should_offer_add_to_cart": false,
  "captured_concern": "",
  "captured_objection": ""
}
`.trim();

    const payload = {
      store: {
        brand: "VCARE",
        tone: "warm, natural, female sales support"
      },
      page: {
        type: clean(page.type),
        url: clean(page.url),
        title: clean(page.title)
      },
      product: productSummary,
      memory: {
        language_style: clean(memory.language_style),
        concern: clean(memory.concern),
        objection: clean(memory.objection),
        stage: clean(memory.stage || "cold")
      },
      recent_messages: messages.slice(-10),
      customer_message: customerMessage
    };

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5",
        input: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: JSON.stringify(payload)
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "sales_chat_response",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                reply: { type: "string" },
                intent: {
                  type: "string",
                  enum: [
                    "product_info",
                    "suitability",
                    "usage",
                    "price",
                    "trust",
                    "comparison",
                    "objection",
                    "ready_to_buy",
                    "wants_human",
                    "shipping_or_cod",
                    "greeting",
                    "unclear"
                  ]
                },
                language_style: {
                  type: "string",
                  enum: ["english", "urdu", "roman_urdu", "mixed"]
                },
                stage: {
                  type: "string",
                  enum: ["cold", "warm", "hot"]
                },
                should_offer_whatsapp: { type: "boolean" },
                should_offer_add_to_cart: { type: "boolean" },
                captured_concern: { type: "string" },
                captured_objection: { type: "string" }
              },
              required: [
                "reply",
                "intent",
                "language_style",
                "stage",
                "should_offer_whatsapp",
                "should_offer_add_to_cart",
                "captured_concern",
                "captured_objection"
              ]
            }
          }
        }
      })
    });

    const raw = await openaiRes.json();

    let out;
    try {
      out = JSON.parse(raw.output_text);
    } catch (e) {
      out = {
        reply: "Ji, main aapki help karti hun. Aap apna concern bata dein.",
        intent: "unclear",
        language_style: clean(memory.language_style) || "mixed",
        stage: clean(memory.stage) || "cold",
        should_offer_whatsapp: false,
        should_offer_add_to_cart: false,
        captured_concern: clean(memory.concern),
        captured_objection: clean(memory.objection)
      };
    }

    if (!out.reply) {
      out.reply = "Ji, main aapki help karti hun. Aap apna concern bata dein.";
    }

    return res.status(200).json(out);
  } catch (error) {
    return res.status(200).json({
      reply: "Ji, ek second please. Main aapki help karti hun. Agar chahein tou WhatsApp support par connect kar deti hun.",
      intent: "unclear",
      language_style: "mixed",
      stage: "cold",
      should_offer_whatsapp: true,
      should_offer_add_to_cart: false,
      captured_concern: "",
      captured_objection: ""
    });
  }
}
