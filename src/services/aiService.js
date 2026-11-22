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
HUMAN_SUPPORT
OTHER

Intent açıklamaları:

PRICE_INQUIRY:
Müşteri ürünün fiyatını soruyorsa seç.

STOCK_INQUIRY:
Müşteri ürünün mevcut olup olmadığını veya stok durumunu soruyorsa seç.

SHIPPING_INQUIRY:
Müşteri kargo, teslimat veya kargo ücreti hakkında soru soruyorsa seç.

ORDER:
Müşteri ürünü almak veya sipariş vermek istediğini açıkça belirtiyorsa seç.

GREETING:
Müşteri yalnızca selamlaşma mesajı gönderiyorsa seç.

HUMAN_SUPPORT:
Müşteri bir yetkili, insan, temsilci veya canlı destek ile konuşmak istiyorsa seç.

OTHER:
Yukarıdakilerin hiçbirine uymuyorsa seç.


quantity:

Müşteri kilogram miktarı belirtiyorsa sayı olarak çıkar.
Belirtmiyorsa null döndür.

Türkçe günlük kullanım ifadelerini anlayabilirsin.

Örnekler:

"5lik"
quantity = 5

"10luk"
quantity = 10

"3lük"
quantity = 3

"beş kiloluk"
quantity = 5

"on kilo"
quantity = 10

"5 kilo"
quantity = 5

"10 kg"
quantity = 10


Mesaj örnekleri:

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


"kargo ücretsiz mi"

{
    "intent": "SHIPPING_INQUIRY",
    "quantity": null
}


"10 kilo alayım"

{
    "intent": "ORDER",
    "quantity": 10
}


"yetkiliyle görüşmek istiyorum"

{
    "intent": "HUMAN_SUPPORT",
    "quantity": null
}


"bir insanla konuşabilir miyim"

{
    "intent": "HUMAN_SUPPORT",
    "quantity": null
}


"müşteri temsilcisine bağlar mısınız"

{
    "intent": "HUMAN_SUPPORT",
    "quantity": null
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
                                "HUMAN_SUPPORT",
                                "OTHER"
                            ]
                        },

                        quantity: {
                            anyOf: [
                                {
                                    type: "number"
                                },
                                {
                                    type: "null"
                                }
                            ]
                        }
                    },

                    required: [
                        "intent",
                        "quantity"
                    ],

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