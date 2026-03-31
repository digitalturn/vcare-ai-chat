import fs from "fs";
import path from "path";

function loadCatalog() {
  try {
    const filePath = path.join(process.cwd(), "products_catalog.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.products || [];
  } catch (error) {
    console.error("Catalog load error:", error);
    return [];
  }
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase().trim();
}

function containsAny(text, words = []) {
  const t = normalizeText(text);
  return words.some((w) => t.includes(normalizeText(w)));
}

function detectIntent(query) {
  const q = normalizeText(query);

  if (containsAny(q, ["vagina", "vaginal", "tight", "tighten", "tightening", "loose", "private part", "intimate"])) {
    return "vaginal_tightening";
  }

  if (containsAny(q, ["lekoria", "likoria", "white discharge", "discharge", "leucorrhea", "leukorrhea"])) {
    return "lekoria";
  }

  if (containsAny(q, ["stamina", "weakness", "energy", "power", "performance"])) {
    return "energy";
  }

  if (containsAny(q, ["delay", "timing", "sex timing", "premature", "early discharge", "jaldi"])) {
    return "delay";
  }

  if (containsAny(q, ["breast", "firming", "lift", "shape", "saggy"])) {
    return "breast";
  }

  if (containsAny(q, ["weight loss", "slim", "motapa", "lose weight", "fat"])) {
    return "weight_loss";
  }

  if (containsAny(q, ["beard", "dadhi"])) {
    return "beard";
  }

  if (containsAny(q, ["hair fall", "hair growth", "thin hair", "baal", "dandruff", "bald"])) {
    return "hair";
  }

  if (containsAny(q, ["dark circles", "under eye", "puffy eyes"])) {
    return "under_eye";
  }

  if (containsAny(q, ["acne", "pimples", "breakouts", "oily skin"])) {
    return "acne";
  }

  if (containsAny(q, ["glow", "brightening", "vitamin c", "dull skin", "radiant"])) {
    return "glow";
  }

  if (containsAny(q, ["private whitening", "dark private area", "intimate whitening"])) {
    return "private_whitening";
  }

  return "general";
}

function scoreByIntent(product, intent, query) {
  const pText = [
    product.handle,
    product.title,
    product.description,
    product.type,
    product.used_by,
    product.vendor,
    ...(product.tags || [])
  ].join(" ").toLowerCase();

  let score = 0;

  const intentMap = {
    vaginal_tightening: [
      "vagina-tightening-powder-25gm-vcare-natural",
      "vagina-tightening-mist-50ml"
    ],
    lekoria: [
      "lekoria-herbal-treatment-powder-eatable-70gm"
    ],
    energy: [
      "energy-boost-powder-eatable-70gm"
    ],
    delay: [
      "mens-delay-oil-herbal-30ml",
      "stamina-x-balm-for-men-20gm-vcare-natural"
    ],
    breast: [
      "vcare-breast-enhancement-cream"
    ],
    weight_loss: [
      "slim-fit-powder-eatable-70gm"
    ],
    beard: [
      "beard-oil-herbal-for-men-vcare-natural"
    ],
    hair: [
      "vcare-natural-hair-growth-serum",
      "vcare-natural-infused-hair-oil"
    ],
    under_eye: [
      "vcare-under-eye-serum"
    ],
    acne: [
      "vcare-natural-acne-serum",
      "vcare-natural-niacinamide-serum",
      "vcare-natural-tea-tree-face-wash"
    ],
    glow: [
      "vcare-natural-skin-radiant-serum",
      "vcare-natural-vitamin-c-serum",
      "vcare-natural-skin-glow-day-night-brightning-cream"
    ],
    private_whitening: [
      "vcare-natural-body-private-part-whitening-cream"
    ]
  };

  const boostedHandles = intentMap[intent] || [];

  if (boostedHandles.includes(product.handle)) {
    score += 100;
  }

  const queryWords = normalizeText(query).split(/\s+/).filter(Boolean);
  for (const word of queryWords) {
    if (word.length >= 3 && pText.includes(word)) {
      score += 3;
    }
  }

  return score;
}

function getTopProducts(products, query, limit = 2) {
  const intent = detectIntent(query);

  const scored = products
    .map((product) => ({
      ...product,
      _score: scoreByIntent(product, intent, query),
    }))
    .filter((product) => product._score > 0)
    .sort((a, b) => b._score - a._score);

  if (intent !== "general") {
    return scored.slice(0, limit);
  }

  return scored.slice(0, 1);
}

function buildCatalogContext(products) {
  return products
    .map((p) => {
      return [
        `Title: ${p.title}`,
        `Handle: ${p.handle}`,
        `Used By: ${p.used_by}`,
        `Type: ${p.type}`,
        `Price: PKR ${p.price}`,
        `URL: ${p.url}`,
        `Image: ${p.image_src || ""}`,
        `Description: ${p.description}`,
        `Tags: ${(p.tags || []).join(", ")}`
      ].join("\n");
    })
    .join("\n\n----------------------\n\n");
}

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
    return res.status(405).json({
      reply: "Method not allowed",
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const userMessage =
      body?.customer_message ||
      body?.message ||
      body?.query ||
      "Hello";

    const pageContext = body?.page || {};
    const productContext = body?.product || null;
    const memoryContext = body?.memory || {};
    const recentMessages = Array.isArray(body?.messages) ? body.messages : [];

    const allProducts = loadCatalog();
    const matchedProducts = getTopProducts(allProducts, userMessage, 2);
    const intent = detectIntent(userMessage);

    const matchedCatalogText =
      matchedProducts.length > 0
        ? buildCatalogContext(matchedProducts)
        : "";

    const conversationText = recentMessages
      .slice(-8)
      .map((m) => `${m.role === "assistant" ? "Assistant" : "Customer"}: ${m.text}`)
      .join("\n");

    const systemPrompt = `
You are Ayesha, a smart, natural Pakistani female sales assistant for VCare Natural.

Rules:
- Reply like a real human sales assistant.
- Match the customer's language style: Urdu, Roman Urdu, or English.
- Be conversational first, not robotic.
- If the concern is already clear, do NOT ask "aap apna concern batayein".
- First give a natural short reply.
- Then recommend only the best matching product.
- If useful, mention only 1 supporting product.
- Never dump many products.
- Never recommend unrelated products.
- Never invent products.
- Never sound repetitive.
- Keep reply concise and sales-focused.
- Mention product name, reason, price, and link.
- Softly guide toward purchase.
- For intimate products, mention discreet delivery naturally.
- Do not claim guaranteed medical cure.

Detected intent: ${intent}

Website page context:
${JSON.stringify(pageContext, null, 2)}

Current product context:
${JSON.stringify(productContext, null, 2)}

Memory context:
${JSON.stringify(memoryContext, null, 2)}

Recent conversation:
${conversationText}

Relevant products:
${matchedCatalogText}
`;

    const userPrompt = `Customer message: ${userMessage}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.45,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Ji, aap ke concern ke mutabiq main best option suggest kar rahi hun.";

    const shouldOfferWhatsApp =
      matchedProducts.length > 0 && containsAny(reply, ["order", "buy", "purchase", "whatsapp"]);

    const shouldOfferAddToCart = matchedProducts.length > 0;

    return res.status(200).json({
      reply,
      intent,
      stage: matchedProducts.length > 0 ? "recommended" : "engaged",
      should_offer_whatsapp: shouldOfferWhatsApp,
      should_offer_add_to_cart: shouldOfferAddToCart,
      matched_products: matchedProducts.map((p) => ({
        title: p.title,
        handle: p.handle,
        url: p.url,
        price: p.price,
        used_by: p.used_by,
        type: p.type,
        image: p.image_src || "",
      })),
    });
  } catch (error) {
    console.error("AI chat error:", error);

    return res.status(200).json({
      reply: "Ji ek second please, main check kar rahi hun.",
      error: error.message,
      intent: "general",
      stage: "engaged",
      should_offer_whatsapp: false,
      should_offer_add_to_cart: false,
      matched_products: []
    });
  }
}
