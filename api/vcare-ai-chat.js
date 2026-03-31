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
  return String(value).toLowerCase().trim();
}

function scoreProduct(product, query) {
  const q = normalizeText(query);

  const haystack = [
    product.title,
    product.description,
    product.used_by,
    product.type,
    product.vendor,
    ...(product.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  const keywordGroups = [
    {
      words: ["vagina", "vaginal", "tight", "tighten", "tightening", "loose", "intimate", "private part", "vagina powder", "vaginal tightening"],
      handles: ["vagina-tightening-powder-25gm-vcare-natural", "vagina-tightening-mist-50ml"],
      points: 16,
    },
    {
      words: ["lekoria", "likoria", "discharge", "white discharge", "leucorrhea", "leukorrhea"],
      handles: ["lekoria-herbal-treatment-powder-eatable-70gm"],
      points: 16,
    },
    {
      words: ["energy", "stamina", "weakness", "power", "performance", "men energy"],
      handles: ["energy-boost-powder-eatable-70gm"],
      points: 16,
    },
    {
      words: ["delay", "timing", "sex timing", "jaldi", "early discharge", "premature", "stamina oil"],
      handles: ["mens-delay-oil-herbal-30ml", "stamina-x-balm-for-men-20gm-vcare-natural"],
      points: 16,
    },
    {
      words: ["breast", "firming", "lift", "shape", "saggy"],
      handles: ["vcare-breast-enhancement-cream"],
      points: 16,
    },
    {
      words: ["weight loss", "slim", "fat", "lose weight", "weight", "motapa"],
      handles: ["slim-fit-powder-eatable-70gm"],
      points: 16,
    },
    {
      words: ["beard", "dadhi"],
      handles: ["beard-oil-herbal-for-men-vcare-natural"],
      points: 16,
    },
    {
      words: ["hair fall", "hair growth", "bald", "thin hair", "baal", "dandruff"],
      handles: ["vcare-natural-hair-growth-serum", "vcare-natural-infused-hair-oil"],
      points: 16,
    },
    {
      words: ["dark circles", "under eye", "puffy eyes"],
      handles: ["vcare-under-eye-serum"],
      points: 16,
    },
    {
      words: ["acne", "pimples", "oily skin", "breakouts"],
      handles: ["vcare-natural-acne-serum", "vcare-natural-niacinamide-serum", "vcare-natural-tea-tree-face-wash"],
      points: 16,
    },
    {
      words: ["glow", "brightening", "skin radiant", "vitamin c", "dull skin"],
      handles: ["vcare-natural-skin-radiant-serum", "vcare-natural-vitamin-c-serum", "vcare-natural-skin-glow-day-night-brightning-cream"],
      points: 16,
    },
    {
      words: ["private whitening", "dark private area", "private area whitening", "intimate whitening"],
      handles: ["vcare-natural-body-private-part-whitening-cream"],
      points: 16,
    },
  ];

  for (const group of keywordGroups) {
    const matchedWord = group.words.some((w) => q.includes(w));
    const matchedHandle = group.handles.includes(product.handle);
    if (matchedWord && matchedHandle) score += group.points;
  }

  if (haystack.includes(q) && q.length > 2) score += 8;

  const queryWords = q.split(/\s+/).filter(Boolean);
  for (const word of queryWords) {
    if (word.length >= 3 && haystack.includes(word)) {
      score += 2;
    }
  }

  return score;
}

function getTopProducts(products, query, limit = 3) {
  return [...products]
    .map((product) => ({
      ...product,
      _score: scoreProduct(product, query),
    }))
    .filter((product) => product._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
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
        `Tags: ${(p.tags || []).join(", ")}`,
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
    const matchedProducts = getTopProducts(allProducts, userMessage, 3);

    const matchedCatalogText =
      matchedProducts.length > 0
        ? buildCatalogContext(matchedProducts)
        : buildCatalogContext(allProducts.slice(0, 12));

    const conversationText = recentMessages
      .slice(-8)
      .map((m) => `${m.role === "assistant" ? "Assistant" : "Customer"}: ${m.text}`)
      .join("\n");

    const systemPrompt = `
You are Ayesha, a smart, friendly, human-like Pakistani female sales assistant for VCare Natural.

Your job:
- Understand the customer's concern properly.
- Reply naturally in the same style as the customer: Urdu, Roman Urdu, or English.
- Sound like a real sales girl, not a bot.
- Recommend only products from the provided catalog.
- Do not invent products.
- Prefer 1 main recommendation first.
- If relevant, suggest 1 upsell or supporting product.
- Share direct product links from the provided catalog.
- Keep replies concise, natural, warm, and sales-focused.
- Ask 1 follow-up question only if truly needed.
- If the customer already clearly described the problem, directly recommend the product.
- If the product is gender-specific, do not recommend it to the wrong gender.
- Never claim guaranteed medical cure.
- Never sound repetitive.
- Avoid generic lines like "Aap apna concern batayein" when the concern is already clear.
- Emphasize discreet delivery when relevant for intimate products.
- Try to move customer toward purchase.

Response style rules:
- Natural Pakistani tone.
- Roman Urdu if customer writes in Roman Urdu.
- English if customer writes in English.
- Urdu if customer writes in Urdu.
- Keep tone respectful, confident, and helpful.
- Do not repeat greeting in every answer.
- Maximum 1 emoji if really needed.

When concern is clear:
- Give direct recommendation
- Mention product name
- Mention why it suits the concern
- Mention price
- Mention product link
- Add 1 short closing line

Website page context:
${JSON.stringify(pageContext, null, 2)}

Current product context:
${JSON.stringify(productContext, null, 2)}

Memory context:
${JSON.stringify(memoryContext, null, 2)}

Recent conversation:
${conversationText}

Relevant product catalog:
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
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Ji, aap ke concern ke mutabiq main best option suggest kar rahi hun.";

    const lowerReply = reply.toLowerCase();

    const shouldOfferWhatsApp =
      lowerReply.includes("order") ||
      lowerReply.includes("buy") ||
      lowerReply.includes("purchase") ||
      lowerReply.includes("whatsapp");

    const shouldOfferAddToCart =
      matchedProducts.length > 0 ||
      lowerReply.includes("/products/") ||
      lowerReply.includes("add to cart");

    return res.status(200).json({
      reply,
      intent: matchedProducts.length > 0 ? "product_recommendation" : "sales",
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
      intent: "sales",
      stage: "engaged",
      should_offer_whatsapp: false,
      should_offer_add_to_cart: false,
    });
  }
}
