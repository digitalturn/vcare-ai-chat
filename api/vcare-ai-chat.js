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

  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      mode: "GET",
      reply: "AI backend connected successfully"
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
      product: product
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
        : null,
      memory: {
        language_style: clean(memory.language_style),
        concern: clean(memory.concern),
        objection: clean(memory.objection),
        stage: clean(memory.stage || "cold")
      },
      recent_messages: messages.slice(-10),
      customer_message: customerMessage
    };

    const systemPrompt = `
You are a warm, natural, human-like female sales advisor for an e-commerce store.

Rules:
- Never say you are AI.
- Reply in the same language style as the customer.
- Keep replies short, natural, and human.
- First answer properly, then ask at most one relevant follow-up.
- Use only the provided page/product context.
- Do not invent medical claims or guarantees.
- If the customer seems ready, move softly toward add to cart or WhatsApp help.

Return strict JSON only:
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

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) }
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

    if (!openaiRes.ok) {
      return res.status(200).json({
        reply: "Backend reached OpenAI but OpenAI returned an error.",
        intent: "unclear",
        language_style: "mixed",
        stage: "cold",
        should_offer_whatsapp: true,
        should_offer_add_to_cart: false,
        captured_concern: "",
        captured_objection: "",
        debug: raw
      });
    }

    if (!raw.output_text) {
      return res.status(200).json({
        reply: "OpenAI responded, but output_text was empty.",
        intent: "unclear",
        language_style: "mixed",
        stage: "cold",
        should_offer_whatsapp: true,
        should_offer_add_to_cart: false,
        captured_concern: "",
        captured_objection: "",
        debug: raw
      });
    }

    let out;
    try {
      out = JSON.parse(raw.output_text);
    } catch (e) {
      return res.status(200).json({
        reply: "OpenAI responded, but JSON parsing failed.",
        intent: "unclear",
        language_style: "mixed",
        stage: "cold",
        should_offer_whatsapp: true,
        should_offer_add_to_cart: false,
        captured_concern: "",
        captured_objection: "",
        debug_output_text: raw.output_text
      });
    }

    return res.status(200).json(out);
  } catch (error) {
    return res.status(200).json({
      reply: "Server catch error reached.",
      intent: "unclear",
      language_style: "mixed",
      stage: "cold",
      should_offer_whatsapp: true,
      should_offer_add_to_cart: false,
      captured_concern: "",
      captured_objection: "",
      debug_error: String(error && error.message ? error.message : error)
    });
  }
}
