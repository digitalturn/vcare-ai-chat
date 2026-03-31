import fs from "fs";
import path from "path";

function loadCatalog() {
  try {
    const filePath = path.join(process.cwd(), "products_catalog.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.products) ? parsed.products : [];
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

function uniqueByHandle(products) {
  const seen = new Set();
  return products.filter((p) => {
    if (!p?.handle || seen.has(p.handle)) return false;
    seen.add(p.handle);
    return true;
  });
}

function detectLanguageStyle(text) {
  const t = String(text || "").trim();
  if (!t) return "mixed";
  if (/[\u0600-\u06FF]/.test(t)) return "urdu";

  const romanUrduHints =
    /(hai|han|haan|acha|achha|karna|krna|mujhe|mje|aap|ap|kya|kis|liye|liya|nahi|nahin|bilkul|sahi|wala|wali|krdo|btao|batayein|chahiye|kaam|theek|masla|issue|tight|timing|weakness)/i.test(
      t
    );

  const englishHints =
    /(need|want|help|price|delivery|how|use|daily|best|for|men|women|buy|order|product|ingredient|results|details)/i.test(
      t
    );

  if (romanUrduHints && englishHints) return "mixed";
  if (romanUrduHints) return "roman_urdu";
  return "english";
}

function languageInstruction(style) {
  if (style === "urdu") {
    return "Reply in Urdu script naturally.";
  }
  if (style === "roman_urdu") {
    return "Reply naturally in Roman Urdu.";
  }
  if (style === "english") {
    return "Reply naturally in English.";
  }
  return "Reply in the same mixed style as the customer.";
}

function detectIntent(query) {
  const q = normalizeText(query);

  if (
    containsAny(q, [
      "vagina",
      "vaginal",
      "tight",
      "tighten",
      "tightening",
      "loose",
      "private part",
      "intimate",
      "vagina powder",
      "vaginal tightening",
      "mist",
    ])
  ) {
    return "vaginal_tightening";
  }

  if (
    containsAny(q, [
      "lekoria",
      "likoria",
      "leukorrhea",
      "leucorrhea",
      "white discharge",
      "discharge",
    ])
  ) {
    return "lekoria";
  }

  if (
    containsAny(q, ["stamina", "weakness", "energy", "power", "performance"])
  ) {
    return "energy";
  }

  if (
    containsAny(q, [
      "delay",
      "timing",
      "sex timing",
      "premature",
      "early discharge",
      "jaldi",
    ])
  ) {
    return "delay";
  }

  if (containsAny(q, ["breast", "firming", "lift", "shape", "saggy"])) {
    return "breast";
  }

  if (
    containsAny(q, ["weight loss", "slim", "motapa", "lose weight", "fat"])
  ) {
    return "weight_loss";
  }

  if (containsAny(q, ["beard", "dadhi"])) {
    return "beard";
  }

  if (
    containsAny(q, [
      "hair fall",
      "hair growth",
      "thin hair",
      "baal",
      "dandruff",
      "bald",
    ])
  ) {
    return "hair";
  }

  if (containsAny(q, ["dark circles", "under eye", "puffy eyes"])) {
    return "under_eye";
  }

  if (containsAny(q, ["acne", "pimples", "breakouts", "oily skin"])) {
    return "acne";
  }

  if (
    containsAny(q, ["glow", "brightening", "vitamin c", "dull skin", "radiant"])
  ) {
    return "glow";
  }

  if (
    containsAny(q, [
      "private whitening",
      "dark private area",
      "intimate whitening",
    ])
  ) {
    return "private_whitening";
  }

  if (
    containsAny(q, [
      "price",
      "cost",
      "delivery",
      "shipping",
      "cod",
      "cash on delivery",
      "ingredients",
      "how to use",
      "usage",
      "result",
      "results",
      "side effect",
      "side effects",
      "safe",
      "original",
      "authentic",
      "how long",
      "kitne din",
      "kitna time",
    ])
  ) {
    return "product_followup";
  }

  return "general";
}

function isYesMessage(text) {
  return containsAny(text, [
    "yes",
    "yeah",
    "yup",
    "ok",
    "okay",
    "haan",
    "han",
    "jee",
    "ji",
    "bilkul",
    "theek",
    "thik",
    "sure",
    "batao",
    "batayein",
    "batain",
    "suggest",
    "show me",
    "dikhao",
    "send",
  ]);
}

function isNoMessage(text) {
  return containsAny(text, [
    "no",
    "nah",
    "nahi",
    "nahin",
    "mat",
    "not now",
    "don't",
    "dont",
  ]);
}

function isOutOfScopeMessage(text) {
  return containsAny(text, [
    "doctor",
    "medicine",
    "diagnosis",
    "pregnant",
    "pregnancy",
    "breastfeeding",
    "allergy",
    "bleeding",
    "infection",
    "severe pain",
    "operation",
    "surgery",
    "prescription",
    "refund policy",
    "legal",
    "complaint",
    "abuse",
    "harassment",
  ]);
}

function likelyAskingProductDetails(text) {
  return containsAny(text, [
    "price",
    "cost",
    "delivery",
    "shipping",
    "cod",
    "cash on delivery",
    "ingredients",
    "how to use",
    "usage",
    "result",
    "results",
    "side effect",
    "side effects",
    "safe",
    "original",
    "authentic",
    "how long",
    "kitne din",
    "kitna time",
    "detail",
    "details",
    "info",
    "information",
  ]);
}

function getIntentHandles(intent) {
  const map = {
    vaginal_tightening: [
      "vagina-tightening-powder-25gm-vcare-natural",
      "vagina-tightening-mist-50ml",
    ],
    lekoria: ["lekoria-herbal-treatment-powder-eatable-70gm"],
    energy: ["energy-boost-powder-eatable-70gm"],
    delay: [
      "mens-delay-oil-herbal-30ml",
      "stamina-x-balm-for-men-20gm-vcare-natural",
    ],
    breast: ["vcare-breast-enhancement-cream"],
    weight_loss: ["slim-fit-powder-eatable-70gm"],
    beard: ["beard-oil-herbal-for-men-vcare-natural"],
    hair: [
      "vcare-natural-hair-growth-serum",
      "vcare-natural-infused-hair-oil",
    ],
    under_eye: ["vcare-under-eye-serum"],
    acne: [
      "vcare-natural-acne-serum",
      "vcare-natural-niacinamide-serum",
      "vcare-natural-tea-tree-face-wash",
    ],
    glow: [
      "vcare-natural-skin-radiant-serum",
      "vcare-natural-vitamin-c-serum",
      "vcare-natural-skin-glow-day-night-brightning-cream",
    ],
    private_whitening: ["vcare-natural-body-private-part-whitening-cream"],
  };

  return map[intent] || [];
}

function scoreProduct(product, query, intent) {
  const text = [
    product.handle,
    product.title,
    product.description,
    product.type,
    product.used_by,
    product.vendor,
    ...(product.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const qWords = normalizeText(query).split(/\s+/).filter(Boolean);
  const boostedHandles = getIntentHandles(intent);

  if (boostedHandles.includes(product.handle)) score += 120;

  for (const word of qWords) {
    if (word.length >= 3 && text.includes(word)) score += 3;
  }

  return score;
}

function getTopProducts(products, query, limit = 2) {
  const intent = detectIntent(query);
  const scored = products
    .map((product) => ({
      ...product,
      _score: scoreProduct(product, query, intent),
    }))
    .filter((product) => product._score > 0)
    .sort((a, b) => b._score - a._score);

  return uniqueByHandle(scored).slice(0, limit);
}

function buildCatalogContext(products) {
  return products
    .map((p) =>
      [
        `Title: ${p.title}`,
        `Handle: ${p.handle}`,
        `Used By: ${p.used_by}`,
        `Type: ${p.type}`,
        `Price: PKR ${p.price}`,
        `URL: ${p.url}`,
        `Image: ${p.image_src || ""}`,
        `Description: ${p.description}`,
        `Tags: ${(p.tags || []).join(", ")}`,
      ].join("\n")
    )
    .join("\n\n----------------------\n\n");
}

function historyText(messages = []) {
  return messages
    .slice(-10)
    .map((m) => `${m.role === "assistant" ? "Assistant" : "Customer"}: ${m.text}`)
    .join("\n");
}

function getCurrentStage(memoryStage, messages) {
  if (memoryStage) return memoryStage;

  const convo = historyText(messages).toLowerCase();

  if (convo.includes("let me connect you with our support consultant")) {
    return "handoff";
  }
  if (convo.includes("can i suggest") || convo.includes("kya main aap ko best product suggest karun")) {
    return "permission_asked";
  }
  if (convo.includes("/products/") || convo.includes("view product") || convo.includes("buy now")) {
    return "recommended";
  }

  return "cold";
}

function getPrimaryRecommendedProduct(products, productContext) {
  if (productContext?.handle) {
    const current = products.find((p) => p.handle === productContext.handle);
    if (current) return current;
  }
  return products[0] || null;
}

function shouldImmediateHandoff(text) {
  return isOutOfScopeMessage(text);
}

async function callOpenAI(systemPrompt, userPrompt) {
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
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
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
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const userMessage =
      body?.customer_message ||
      body?.message ||
      body?.query ||
      "Hello";

    const pageContext = body?.page || {};
    const productContext = body?.product || null;
    const memoryContext = body?.memory || {};
    const recentMessages = Array.isArray(body?.messages) ? body.messages : [];

    const style = memoryContext?.language_style || detectLanguageStyle(userMessage);
    const intent = detectIntent(userMessage);
    const allProducts = loadCatalog();
    const matchedProducts = getTopProducts(allProducts, userMessage, 2);
    const primaryProduct = getPrimaryRecommendedProduct(matchedProducts, productContext);
    const stage = getCurrentStage(memoryContext?.stage, recentMessages);
    const convoText = historyText(recentMessages);

    if (shouldImmediateHandoff(userMessage)) {
      const handoffReply =
        style === "urdu"
          ? "یہ سوال میرے دائرہ کار سے باہر ہے۔ Let me connect you with our support consultant."
          : style === "english"
          ? "This is outside my scope. Let me connect you with our support consultant."
          : "Yeh sawal mere scope se bahar hai. Let me connect you with our support consultant.";

      return res.status(200).json({
        reply: handoffReply,
        intent: "handoff",
        stage: "handoff",
        language_style: style,
        captured_concern: memoryContext?.concern || "",
        captured_objection: memoryContext?.objection || "",
        should_offer_whatsapp: true,
        should_offer_add_to_cart: false,
        matched_products: [],
      });
    }

    if (
      stage === "cold" &&
      intent !== "general" &&
      intent !== "product_followup" &&
      !isYesMessage(userMessage) &&
      !isNoMessage(userMessage)
    ) {
      const askPermissionReply =
        style === "urdu"
          ? "سمجھ گئی۔ کیا میں آپ کے مسئلے کے مطابق بہترین پروڈکٹ suggest کروں؟"
          : style === "english"
          ? "Got it. Can I suggest the best product for your concern?"
          : "Samajh gayi. Kya main aap ke concern ke mutabiq best product suggest karun?";

      return res.status(200).json({
        reply: askPermissionReply,
        intent,
        stage: "permission_asked",
        language_style: style,
        captured_concern: intent,
        captured_objection: "",
        should_offer_whatsapp: false,
        should_offer_add_to_cart: false,
        matched_products: [],
      });
    }

    if (stage === "permission_asked" && isNoMessage(userMessage)) {
      const noReply =
        style === "urdu"
          ? "بالکل، کوئی مسئلہ نہیں۔ آپ جو بھی پوچھنا چاہیں میں یہاں ہوں۔"
          : style === "english"
          ? "Of course, no problem. Feel free to ask anything you want to know."
          : "Bilkul, koi masla nahi. Aap jo bhi poochna chahen main yahan hoon.";

      return res.status(200).json({
        reply: noReply,
        intent,
        stage: "engaged",
        language_style: style,
        captured_concern: memoryContext?.concern || intent,
        captured_objection: "",
        should_offer_whatsapp: false,
        should_offer_add_to_cart: false,
        matched_products: [],
      });
    }

    const permissionGranted =
      stage === "permission_asked" && isYesMessage(userMessage);

    const answeringProductQuestion =
      stage === "recommended" || intent === "product_followup" || likelyAskingProductDetails(userMessage);

    if (answeringProductQuestion && primaryProduct) {
      const productContextText = buildCatalogContext([primaryProduct]);

      const systemPrompt = `
You are Ayesha, a smart, natural Pakistani female sales assistant for VCare Natural.

${languageInstruction(style)}

Rules:
- The product has already been suggested before.
- Answer the customer's product question naturally and clearly.
- Keep a reassuring, human sales tone.
- If the customer asks for more details, explain briefly.
- Encourage them to click View Product for full details.
- Do not dump many products.
- Do not ask again "can I suggest a product".
- If the question goes outside product/support scope, say exactly:
  "Let me connect you with our support consultant."
- Do not invent facts not present in the product data.

Current product context:
${JSON.stringify(productContext, null, 2)}

Conversation history:
${convoText}

Primary product:
${productContextText}
`;

      const userPrompt = `Customer question: ${userMessage}`;
      const reply =
        (await callOpenAI(systemPrompt, userPrompt)) ||
        (style === "english"
          ? `Sure. For full details, please click View Product.`
          : style === "urdu"
          ? `جی ضرور۔ مکمل تفصیل کے لیے View Product پر کلک کریں۔`
          : `Ji zarur. Mukammal detail ke liye View Product par click karein.`);

      const needsHandoff =
        normalizeText(reply).includes("let me connect you with our support consultant");

      return res.status(200).json({
        reply,
        intent: "product_followup",
        stage: needsHandoff ? "handoff" : "recommended",
        language_style: style,
        captured_concern: memoryContext?.concern || intent,
        captured_objection: "",
        should_offer_whatsapp: needsHandoff,
        should_offer_add_to_cart: !needsHandoff,
        matched_products: needsHandoff
          ? []
          : [
              {
                title: primaryProduct.title,
                handle: primaryProduct.handle,
                url: primaryProduct.url,
                price: primaryProduct.price,
                used_by: primaryProduct.used_by,
                type: primaryProduct.type,
                image: primaryProduct.image_src || "",
              },
            ],
      });
    }

    if (permissionGranted || stage === "recommended" || stage === "engaged") {
      const recommended = matchedProducts.length
        ? matchedProducts
        : memoryContext?.concern
        ? getTopProducts(allProducts, memoryContext.concern, 2)
        : [];

      const recommendedContext = buildCatalogContext(recommended);

      const systemPrompt = `
You are Ayesha, a smart, natural Pakistani female sales assistant for VCare Natural.

${languageInstruction(style)}

Rules:
- Talk like a real sales person.
- First acknowledge the concern in one short natural line.
- Then recommend the best matching product.
- If useful, mention one support product only.
- Mention product name, short reason, price, and product link.
- Keep it concise, warm, and human.
- Do not dump many products.
- Do not list unrelated products.
- Mention discreet delivery naturally for intimate products.
- After recommending, remain available for more questions.
- Never say "Aap apna concern batayein" if concern is already clear.

Detected concern:
${memoryContext?.concern || intent}

Conversation history:
${convoText}

Recommended products:
${recommendedContext}
`;

      const userPrompt = `Customer message: ${userMessage}`;
      const reply =
        (await callOpenAI(systemPrompt, userPrompt)) ||
        (style === "english"
          ? "I can suggest the best option for you now."
          : style === "urdu"
          ? "میں ابھی آپ کے لیے بہترین آپشن suggest کر سکتی ہوں۔"
          : "Main abhi aap ke liye best option suggest kar sakti hun.");

      return res.status(200).json({
        reply,
        intent: memoryContext?.concern || intent,
        stage: "recommended",
        language_style: style,
        captured_concern: memoryContext?.concern || intent,
        captured_objection: "",
        should_offer_whatsapp: false,
        should_offer_add_to_cart: recommended.length > 0,
        matched_products: recommended.map((p) => ({
          title: p.title,
          handle: p.handle,
          url: p.url,
          price: p.price,
          used_by: p.used_by,
          type: p.type,
          image: p.image_src || "",
        })),
      });
    }

    const generalPrompt = `
You are Ayesha, a smart, natural Pakistani female sales assistant for VCare Natural.

${languageInstruction(style)}

Rules:
- Be conversational and helpful.
- Understand the customer and guide them.
- Do not recommend products yet unless the concern is clear and permission is given.
- Ask only one useful question if needed.
- Keep the tone soft, human, and sales-oriented.
`;

    const generalReply =
      (await callOpenAI(generalPrompt, `Customer message: ${userMessage}`)) ||
      (style === "english"
        ? "I’m here to help. Please tell me a little more about your concern."
        : style === "urdu"
        ? "میں مدد کے لیے یہاں ہوں۔ براہِ کرم اپنا مسئلہ تھوڑا سا واضح کریں۔"
        : "Main madad ke liye yahan hoon. Apna concern thora sa clear kar dein.");

    return res.status(200).json({
      reply: generalReply,
      intent: "general",
      stage: "engaged",
      language_style: style,
      captured_concern: memoryContext?.concern || "",
      captured_objection: "",
      should_offer_whatsapp: false,
      should_offer_add_to_cart: false,
      matched_products: [],
    });
  } catch (error) {
    console.error("AI chat error:", error);

    return res.status(200).json({
      reply: "Let me connect you with our support consultant.",
      error: error.message,
      intent: "handoff",
      stage: "handoff",
      language_style: "mixed",
      captured_concern: "",
      captured_objection: "",
      should_offer_whatsapp: true,
      should_offer_add_to_cart: false,
      matched_products: [],
    });
  }
}
