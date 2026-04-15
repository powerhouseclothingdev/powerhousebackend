const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const HF_TOKEN = process.env.HF_TOKEN
const PORT = process.env.PORT || 5000;

app.post("/api/ai-reply", async (req, res) => {
  const { message, products, variants } = req.body;
  console.log(message, products, variants);

  const response = await fetch("https://router.huggingface.co/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b:groq",
      instructions: `
You are a shopping AI.

Here is the product database:

PRODUCTS:
${JSON.stringify(products)}

VARIANTS:
${JSON.stringify(variants)}

RULES:
- Only use IDs from PRODUCTS and VARIANTS
- Return ONLY valid JSON
- No markdown, no explanation
- You MUST NOT guess randomly
- You MUST match product based on user message keywords (name, color, variant)
- If user says a color (blue, black, red, etc), match it to variant.image
- If multiple products match, choose the BEST match based on the message
- If no product matches, return product: null
- NEVER default to first product

FORMAT:
{
  "text": "...",
  "product": {
    "productId": "...",
    "variantId": "..."
  }
}
      `,
      input: message,
      parameters: { max_new_tokens: 250 }
    }),
  });

 const result = await response.json();

console.log(result);

let text = "No response";
let product = null;

try {
  const messageBlock = result.output?.find(o => o.type === "message");

  const raw = messageBlock?.content?.[0]?.text || "";

  const parsed = JSON.parse(raw);

  text = parsed.text || text;
  product = parsed.product || null;

} catch (err) {
  console.log("Parse error:", err);
  console.log("Raw response:", result);
}

  res.json({ text, product });
  
  console.log("FINAL RESPONSE:", { text, product });
  
});

app.get("/", (req, res) => res.send("Simple Conversational AI Backend Running ✅"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));