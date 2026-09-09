const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function analyzeMessage(message) {
    const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
            {
                role: "system",
                content: `
Sen bir e-ticaret mesaj analiz sistemisin.

Müşterinin mesajını analiz et.

Sadece şu intentlerden birini seç:
PRICE_INQUIRY
SHIPPING_INQUIRY
ORDER
GREETING
STOCK_INQUIRY
OTHER

quantity:
Müşteri kilogram miktarı belirtiyorsa sayı olarak çıkar.
Belirtmiyorsa null döndür.

Türkçe günlük kullanım örnekleri:
"5lik" = 5 kg
"10luk" = 10 kg
"3lük" = 3 kg
"beş kiloluk" = 5 kg
"on kilo" = 10 kg
"5 kilo" = 5 kg
"10 kg" = 10 kg

Örnekler:

"abi 10luk alsam kaça gelir"
{
  "intent": "PRICE_INQUIRY",
  "quantity": 10
}

"5lik kaç para"
{
  "intent": "PRICE_INQUIRY",
  "quantity": 5
}

"10 kilo mevcut mu"
{
  "intent": "STOCK_INQUIRY",
  "quantity": 10
}

"selam"
{
  "intent": "GREETING",
  "quantity": null
}
`
            },
            {
                role: "user",
                content: message
            }
        ],
        text: {
            format: {
                type: "json_schema",
                name: "customer_message_analysis",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        intent: {
                            type: "string",
                            enum: [
                                "PRICE_INQUIRY",
                                "SHIPPING_INQUIRY",
                                "ORDER",
                                "GREETING",
                                "STOCK_INQUIRY",
                                "OTHER"
                            ]
                        },
                        quantity: {
                            anyOf: [
                                { type: "number" },
                                { type: "null" }
                            ]
                        }
                    },
                    required: ["intent", "quantity"],
                    additionalProperties: false
                }
            }
        }
    });

    return JSON.parse(response.output_text);
}

module.exports = {
    analyzeMessage
};
function detectQuantityFallback(message) {
    const text = message.toLowerCase();

    const match = text.match(/(\d+)\s*(kg|kilo|lik|lık|luk|lük)?/);

    if (match) {
        return Number(match[1]);
    }

    return null;
}