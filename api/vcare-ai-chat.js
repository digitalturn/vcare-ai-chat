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
    /(hai|han|haan|acha|achha|karna|krna|mujhe|mje|aap|ap|kya|kis|liye|liya|nahi|nahin|bilkul|sahi|wala|wali|krdo|btao|batayein|chahiye|kaam|theek|masla|issue|tight|timing|weakness|jaldi|shadi|private|sex)/i.test(
      t
    );

  const englishHints =
    /(need|want|help|price|delivery|how|use|daily|best|for|men|women|buy|order|product|ingredient|results|details|timing|stamina)/i.test(
      t
    );

  if (romanUrduHints && englishHints) return "mixed";
  if (romanUrduHints) return "roman_urdu";
  return "english";
}

function languageInstruction(style) {
  if (style === "urdu") return "Reply naturally in Urdu script.";
  if (style === "roman_urdu") return "Reply naturally in Roman Urdu.";
  if (style === "english") return "Reply naturally in English.";
  return "Reply in the same mixed style as the customer.";
}

function replySet(style, map) {
  return map[style] || map.mixed;
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
      "early finish",
      "jaldi farigh",
      "jaldi discharge",
      "sex time",
      "longer time",
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
      "private dark",
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
      "how use",
      "use kaise",
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
      "kaise use karna",
      "kab lagana",
      "kitni dafa",
      "kitni martaba",
    ])
  ) {
    return "product_followup";
  }

  return "general";
}

function detectMicroIntent(query) {
  const q = normalizeText(query);

  if (containsAny(q, ["how to use", "usage", "use kaise", "kaise use", "kab lagana", "kitni dafa", "kitni martaba"])) {
    return "usage";
  }
  if (containsAny(q, ["price", "cost", "kitne ka", "kitnay ka", "rate"])) {
    return "price";
  }
  if (containsAny(q, ["delivery", "shipping", "cod", "cash on delivery", "discreet"])) {
    return "delivery";
  }
  if (containsAny(q, ["result", "results", "kitne din", "how long", "kitna time"])) {
    return "results";
  }
  if (containsAny(q, ["safe", "side effect", "side effects", "original", "authentic"])) {
    return "safety";
  }
  if (containsAny(q, ["ingredient", "ingredients", "kis cheez se bana", "composition"])) {
    return "ingredients";
  }
  if (containsAny(q, ["who can use", "kis ke liye", "men", "women"])) {
    return "eligibility";
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
    "recommend",
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
    "use kaise",
    "kaise use",
    "kab lagana",
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
        `Image: ${p.image_src || p.image || ""}`,
        `Description: ${p.description}`,
        `Tags: ${(p.tags || []).join(", ")}`,
      ].join("\n")
    )
    .join("\n\n----------------------\n\n");
}

function historyText(messages = []) {
  return messages
    .slice(-12)
    .map((m) => `${m.role === "assistant" ? "Assistant" : "Customer"}: ${m.text}`)
    .join("\n");
}

function getCurrentStage(memoryStage, messages) {
  if (memoryStage) return memoryStage;

  const convo = historyText(messages).toLowerCase();

  if (convo.includes("let me connect you with our support consultant")) {
    return "handoff";
  }
  if (convo.includes("can i suggest") || convo.includes("best product suggest")) {
    return "permission_asked";
  }
  if (convo.includes("/products/") || convo.includes("view product") || convo.includes("buy now")) {
    return "recommended";
  }

  return "cold";
}

function getProductByHandle(products, handle) {
  if (!handle) return null;
  return products.find((p) => p.handle === handle) || null;
}

function extractLastRecommendedHandle(messages = [], allProducts = []) {
  const joined = historyText(messages).toLowerCase();

  for (const p of allProducts) {
    if (!p?.handle) continue;
    if (
      joined.includes(normalizeText(p.handle)) ||
      joined.includes(normalizeText(p.title)) ||
      joined.includes(normalizeText(p.url || ""))
    ) {
      return p.handle;
    }
  }

  return "";
}

function getPrimaryFollowupProduct(allProducts, matchedProducts, productContext, recentMessages) {
  const currentPageProduct = getProductByHandle(allProducts, productContext?.handle);
  const lastRecommendedHandle = extractLastRecommendedHandle(recentMessages, allProducts);
  const lastRecommendedProduct = getProductByHandle(allProducts, lastRecommendedHandle);

  if (lastRecommendedProduct) return lastRecommendedProduct;
  if (currentPageProduct) return currentPageProduct;
  if (matchedProducts?.length) return matchedProducts[0];
  return null;
}

function shouldImmediateHandoff(text) {
  return isOutOfScopeMessage(text);
}

function buildHumanTypingText(style, agentName = "Ayesha", mode = "typing") {
  const map = {
    typing: replySet(style, {
      urdu: `${agentName} ٹائپ کر رہی ہیں...`,
      english: `${agentName} is typing...`,
      mixed: `${agentName} is typing...`,
    }),
    checking: replySet(style, {
      urdu: `${agentName} تفصیل دیکھ رہی ہیں...`,
      english: `${agentName} is checking details...`,
      mixed: `${agentName} details check kar rahi hain...`,
    }),
  };
  return map[mode] || map.typing;
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
      temperature: 0.55,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

function buildConcernQuestion(intent, style) {
  const map = {
    delay: replySet(style, {
      urdu: "سمجھ گئی۔ کیا مسئلہ زیادہ تر timing/stamina کا ہے یا جلدی finish ہونے کا؟",
      english: "I understand. Is your concern mainly timing/stamina or finishing too early?",
      mixed: "Samajh gayi. Aap ka concern zyada timing/stamina ka hai ya jaldi finish hone ka?",
    }),
    energy: replySet(style, {
      urdu: "سمجھ گئی۔ کیا آپ کو زیادہ weakness محسوس ہوتی ہے یا stamina/performance کا مسئلہ ہے؟",
      english: "Got it. Is it more about weakness, or stamina/performance?",
      mixed: "Got it. Yeh zyada weakness ka masla hai ya stamina/performance ka?",
    }),
    acne: replySet(style, {
      urdu: "سمجھ گئی۔ کیا آپ کو زیادہ pimples active ہیں یا oily skin اور marks بھی ہیں؟",
      english: "Understood. Is it mainly active acne, or acne marks with oily skin as well?",
      mixed: "Samajh gayi. Zyada active pimples hain ya oily skin aur acne marks bhi hain?",
    }),
    glow: replySet(style, {
      urdu: "سمجھ گئی۔ کیا آپ dull skin کے لیے کچھ چاہتی ہیں یا brightening/glow routine کے لیے؟",
      english: "Understood. Are you looking for help with dull skin, or a brightening/glow routine?",
      mixed: "Samajh gayi. Aap dull skin ke liye kuch chahti hain ya brightening/glow routine ke liye?",
    }),
    private_whitening: replySet(style, {
      urdu: "سمجھ گئی۔ کیا concern dark pigmentation کا ہے یا overall private area brightening کا؟",
      english: "Understood. Is the concern mainly dark pigmentation or overall intimate brightening?",
      mixed: "Samajh gayi. Concern zyada dark pigmentation ka hai ya overall private area brightening ka?",
    }),
    vaginal_tightening: replySet(style, {
      urdu: "سمجھ گئی۔ کیا concern looseness کا ہے یا confidence/intimate freshness کا بھی؟",
      english: "Understood. Is the concern mainly looseness, or confidence/intimate freshness as well?",
      mixed: "Samajh gayi. Concern zyada looseness ka hai ya confidence/intimate freshness ka bhi?",
    }),
  };

  return map[intent] || replySet(style, {
    urdu: "سمجھ گئی۔ آپ کا بنیادی concern تھوڑا سا واضح کر دیں تاکہ میں بہتر guide کر سکوں۔",
    english: "Got it. Please tell me your main concern a little more clearly so I can guide you properly.",
    mixed: "Samajh gayi. Apna main concern thora sa aur clear kar dein taa ke main behtar guide kar sakun.",
  });
}

function buildPermissionReply(style) {
  return replySet(style, {
    urdu: "سمجھ گئی۔ کیا میں آپ کے concern کے مطابق best product suggest کروں؟",
    english: "Got it. Can I suggest the best product for your concern?",
    mixed: "Samajh gayi. Kya main aap ke concern ke mutabiq best product suggest karun?",
  });
}

function buildNoReply(style) {
  return replySet(style, {
    urdu: "بالکل، کوئی مسئلہ نہیں۔ آپ جو پوچھنا چاہیں میں یہاں ہوں۔",
    english: "Of course, no problem. Feel free to ask anything you want to know.",
    mixed: "Bilkul, koi masla nahi. Aap jo bhi poochna chahen main yahan hoon.",
  });
}

function buildFallbackGeneral(style) {
  return replySet(style, {
    urdu: "میں مدد کے لیے یہاں ہوں۔ براہِ کرم اپنا concern تھوڑا سا واضح کریں۔",
    english: "I’m here to help. Please tell me a little more about your concern.",
    mixed: "Main madad ke liye yahan hoon. Apna concern thora sa clear kar dein.",
  });
}

function buildHandoffReply(style) {
  return replySet(style, {
    urdu: "یہ سوال میرے دائرہ کار سے باہر ہے۔ Let me connect you with our support consultant.",
    english: "This is outside my scope. Let me connect you with our support consultant.",
    mixed: "Yeh sawal mere scope se bahar hai. Let me connect you with our support consultant.",
  });
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
    const agentName = body?.agent_name || "Ayesha";

    const style =
      memoryContext?.language_style || detectLanguageStyle(userMessage);

    const intent = detectIntent(userMessage);
    const microIntent = detectMicroIntent(userMessage);
    const allProducts = loadCatalog();
    const matchedProducts = getTopProducts(allProducts, userMessage, 2);
    const stage = getCurrentStage(memoryContext?.stage, recentMessages);
    const convoText = historyText(recentMessages);
    const followupProduct = getPrimaryFollowupProduct(
      allProducts,
      matchedProducts,
      productContext,
      recentMessages
    );

    if (shouldImmediateHandoff(userMessage)) {
      return res.status(200).json({
        reply: buildHandoffReply(style),
        intent: "handoff",
        stage: "handoff",
        language_style: style,
        captured_concern: memoryContext?.concern || "",
        captured_objection: memoryContext?.objection || "",
        should_offer_whatsapp: true,
        should_offer_add_to_cart: false,
        matched_products: [],
        typing_text: buildHumanTypingText(style, agentName, "checking"),
      });
    }

    const concernKnown = !!(memoryContext?.concern && memoryContext.concern !== "general");
    const userJustSharedConcern =
      intent !== "general" &&
      intent !== "product_followup" &&
      !isYesMessage(userMessage) &&
      !isNoMessage(userMessage);

    if (!concernKnown && stage === "cold" && userJustSharedConcern) {
      return res.status(200).json({
        reply: buildConcernQuestion(intent, style),
        intent,
        stage: "engaged",
        language_style: style,
        captured_concern: intent,
        captured_objection: "",
        should_offer_whatsapp: false,
        should_offer_add_to_cart: false,
        matched_products: [],
        typing_text: buildHumanTypingText(style, agentName, "typing"),
      });
    }

    const concernNowKnown = memoryContext?.concern || (intent !== "general" && intent !== "product_followup" ? intent : "");

    if (
      concernNowKnown &&
      (stage === "engaged" || stage === "cold") &&
      !likelyAskingProductDetails(userMessage) &&
      !isYesMessage(userMessage) &&
      !isNoMessage(userMessage) &&
      userJustSharedConcern === false &&
      intent === "general"
    ) {
      return res.status(200).json({
        reply: buildPermissionReply(style),
        intent: concernNowKnown,
        stage: "permission_asked",
        language_style: style,
        captured_concern: concernNowKnown,
        captured_objection: "",
        should_offer_whatsapp: false,
        should_offer_add_to_cart: false,
        matched_products: [],
        typing_text: buildHumanTypingText(style, agentName, "typing"),
      });
    }

    if (stage === "permission_asked" && isNoMessage(userMessage)) {
      return res.status(200).json({
        reply: buildNoReply(style),
        intent: concernNowKnown || intent,
        stage: "engaged",
        language_style: style,
        captured_concern: concernNowKnown || intent,
        captured_objection: "",
        should_offer_whatsapp: false,
        should_offer_add_to_cart: false,
        matched_products: [],
        typing_text: buildHumanTypingText(style, agentName, "typing"),
      });
    }

    const permissionGranted =
      (stage === "permission_asked" && isYesMessage(userMessage)) ||
      (stage === "engaged" && isYesMessage(userMessage) && concernNowKnown);

    const answeringProductQuestion =
      stage === "recommended" ||
      intent === "product_followup" ||
      likelyAskingProductDetails(userMessage);

    if (answeringProductQuestion && followupProduct) {
      const productContextText = buildCatalogContext([followupProduct]);

      const systemPrompt = `
You are ${agentName}, a smart, natural Pakistani female sales assistant for VCare Natural.

${languageInstruction(style)}

You must sound like a real human sales consultant, not a bot.

Rules:
- The customer is asking a follow-up about an already relevant product.
- Stay focused on THIS SAME product unless there is a very strong reason not to.
- Answer directly first.
- Do NOT say "click View Product" unless the exact detail is missing from the provided data.
- Keep replies natural, warm, short, and helpful.
- If the customer asks how to use, answer usage directly in a practical, cautious, non-medical way.
- If the customer asks about price, delivery, authenticity, results, safe use, or who can use it, answer clearly from available context.
- If exact detail is missing, say so politely and then invite them to open the product page for full detail.
- Do not switch to another product during follow-up.
- Do not repeat recommendation language unnecessarily.
- Do not sound medical.
- If outside scope, say exactly:
"Let me connect you with our support consultant."

Micro intent: ${microIntent}

Current page context:
${JSON.stringify(pageContext, null, 2)}

Conversation memory:
${JSON.stringify(memoryContext, null, 2)}

Conversation history:
${convoText}

Primary follow-up product:
${productContextText}
`;

      const userPrompt = `Customer follow-up: ${userMessage}`;

      const fallbackReply = (() => {
        if (microIntent === "usage") {
          return replySet(style, {
            urdu: "جی ضرور۔ عام طور پر ایسے product کو ہدایات کے مطابق کم مقدار میں استعمال کیا جاتا ہے۔ مکمل usage detail کے لیے product page بھی دیکھ لیں۔",
            english: "Sure. Generally, this type of product is used in a small amount as directed. For exact usage instructions, please also check the product page.",
            mixed: "Ji zarur. Aam tor par is tarah ka product hidayaat ke mutabiq kam miqdaar mein use kiya jata hai. Exact usage ke liye product page bhi dekh lein.",
          });
        }

        if (microIntent === "price") {
          return replySet(style, {
            urdu: `جی، اس کی price PKR ${followupProduct.price || ""} ہے۔`,
            english: `Yes, its price is PKR ${followupProduct.price || ""}.`,
            mixed: `Ji, is ki price PKR ${followupProduct.price || ""} hai.`,
          });
        }

        return replySet(style, {
          urdu: "جی ضرور۔ جو detail available ہے میں guide کر سکتی ہوں، اور مکمل detail کے لیے product page بھی دیکھ سکتی ہیں۔",
          english: "Sure. I can guide you with the details available here, and you can also open the product page for complete details.",
          mixed: "Ji zarur. Jo detail available hai main guide kar sakti hun, aur complete detail ke liye product page bhi dekh sakte hain.",
        });
      })();

      const reply = (await callOpenAI(systemPrompt, userPrompt)) || fallbackReply;
      const needsHandoff =
        normalizeText(reply).includes("let me connect you with our support consultant");

      return res.status(200).json({
        reply,
        intent: "product_followup",
        stage: needsHandoff ? "handoff" : "recommended",
        language_style: style,
        captured_concern: concernNowKnown || memoryContext?.concern || "",
        captured_objection: "",
        should_offer_whatsapp: needsHandoff,
        should_offer_add_to_cart: !needsHandoff,
        matched_products: needsHandoff
          ? []
          : [
              {
                title: followupProduct.title,
                handle: followupProduct.handle,
                url: followupProduct.url,
                price: followupProduct.price,
                used_by: followupProduct.used_by,
                type: followupProduct.type,
                image: followupProduct.image_src || followupProduct.image || "",
              },
            ],
        typing_text: buildHumanTypingText(style, agentName, "checking"),
      });
    }

    if (permissionGranted || stage === "recommended") {
      const concernSeed = concernNowKnown || intent || memoryContext?.concern || "";
      const recommended = matchedProducts.length
        ? matchedProducts
        : concernSeed
        ? getTopProducts(allProducts, concernSeed, 2)
        : [];

      const recommendedContext = buildCatalogContext(recommended);

      const systemPrompt = `
You are ${agentName}, a smart, natural Pakistani female sales assistant for VCare Natural.

${languageInstruction(style)}

You must sound like a real human consultant from Pakistan.

Rules:
- First acknowledge the concern in one natural line.
- Then recommend the best matching product confidently.
- Mention only the most suitable main product first.
- Mention one support product only if genuinely useful.
- Mention short reason, price, and that they can open the product below.
- For intimate products, naturally reassure about discreet delivery if relevant.
- Keep it concise, warm, and sales-oriented.
- Do not dump a list.
- Do not ask them to repeat the concern.
- End with one natural line inviting follow-up questions.
- Do not sound robotic or overly formal.
- Do not make medical claims.
- If you do not have exact fact, do not invent it.

Detected concern:
${concernSeed}

Current page product:
${JSON.stringify(productContext, null, 2)}

Conversation history:
${convoText}

Recommended products:
${recommendedContext}
`;

      const fallbackReply =
        recommended.length > 0
          ? replySet(style, {
              urdu: `سمجھ گئی۔ آپ کے concern کے لیے ${recommended[0].title} زیادہ suitable لگ رہا ہے۔ اس کی price PKR ${recommended[0].price} ہے۔ میں نیچے product share کر رہی ہوں، آپ چاہیں تو میں usage بھی بتا سکتی ہوں۔`,
              english: `Understood. For your concern, ${recommended[0].title} looks like the most suitable option. Its price is PKR ${recommended[0].price}. I’m sharing it below, and I can also guide you on usage if you want.`,
              mixed: `Samajh gayi. Aap ke concern ke liye ${recommended[0].title} zyada suitable lag raha hai. Is ki price PKR ${recommended[0].price} hai. Main neeche product share kar rahi hun, aur agar aap chahen to usage bhi guide kar sakti hun.`,
            })
          : replySet(style, {
              urdu: "میں آپ کے concern کے مطابق ایک suitable option suggest کر سکتی ہوں۔",
              english: "I can suggest a suitable option for your concern.",
              mixed: "Main aap ke concern ke mutabiq ek suitable option suggest kar sakti hun.",
            });

      const reply =
        (await callOpenAI(systemPrompt, `Customer message: ${userMessage}`)) ||
        fallbackReply;

      return res.status(200).json({
        reply,
        intent: concernSeed,
        stage: "recommended",
        language_style: style,
        captured_concern: concernSeed,
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
          image: p.image_src || p.image || "",
        })),
        typing_text: buildHumanTypingText(style, agentName, "checking"),
      });
    }

    const generalPrompt = `
You are ${agentName}, a smart, natural Pakistani female sales assistant for VCare Natural.

${languageInstruction(style)}

Rules:
- Sound like a real human sales agent.
- Be warm, concise, and natural.
- First understand the customer's concern.
- Ask at most one useful clarifying question.
- Do not recommend any product yet unless the concern is understood and permission is given.
- Do not sound like customer support script text.
- Do not repeat generic lines.
`;

    const generalReply =
      (await callOpenAI(generalPrompt, `Customer message: ${userMessage}`)) ||
      buildFallbackGeneral(style);

    return res.status(200).json({
      reply: generalReply,
      intent: "general",
      stage: "engaged",
      language_style: style,
      captured_concern: concernNowKnown || "",
      captured_objection: "",
      should_offer_whatsapp: false,
      should_offer_add_to_cart: false,
      matched_products: [],
      typing_text: buildHumanTypingText(style, agentName, "typing"),
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
      typing_text: "Connecting support consultant...",
    });
  }
}
