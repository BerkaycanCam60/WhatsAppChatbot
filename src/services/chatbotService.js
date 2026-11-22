const { analyzeMessage } = require("./aiService");
const { findProductCombination } = require("./productService");
const {
    getConversation,
    updateConversation,
    pauseBot
} = require("./conversationService");

function detectQuantityFallback(message) {
    const text = message.toLowerCase();

    const match = text.match(/(\d+)\s*(kg|kilo|lik|lık|luk|lük)?/);

    if (match) {
        return Number(match[1]);
    }

    return null;
}

async function generateReply(customerId, message) {
    const conversation = getConversation(customerId);

        if (conversation.botPaused) {
        return {
            intent: "HUMAN_SUPPORT",
            quantity: null,
            reply: null,
            botPaused: true,
            conversation
        };
    }

    const analysis = await analyzeMessage(message);

    const intent = analysis.intent;
    let quantity = analysis.quantity;

    // AI quantity bulamazsa local fallback çalışır
    if (quantity === null || quantity === undefined) {
        quantity = detectQuantityFallback(message);
    }
    

    // Geçmiş quantity sadece gerekli intentlerde kullanılır
    if (
        !quantity &&
        conversation.selectedQuantity &&
        ["PRICE_INQUIRY", "STOCK_INQUIRY", "ORDER"].includes(intent)
    ) {
        quantity = conversation.selectedQuantity;
    }

    let reply;

    switch (intent) {

        case "PRICE_INQUIRY": {

            if (!quantity) {
                reply =
                    "Kaç kilogramlık ürünümüzün fiyatını öğrenmek istiyorsunuz?";
                break;
            }

            const result = findProductCombination(quantity);

            if (!result) {
                reply =
                    `Şu anda ${quantity} kg için uygun bir ürün seçeneğimiz bulunmuyor.`;
                break;
            }

            // Ürün gerçekten uygunsa conversation state'e kaydet
            updateConversation(customerId, {
                lastIntent: intent,
                selectedQuantity: quantity
            });

            if (result.type === "EXACT") {
                const item = result.items[0];

                reply =
                    `${item.product.weight} kg ${item.product.name} ` +
                    `${result.totalPrice} TL'dir.`;

            } else if (result.type === "COMBINATION") {
                const item = result.items[0];

                reply =
                    `${quantity} kg için ${item.quantity} adet ` +
                    `${item.product.weight} kg'lık bidon gönderebiliriz. ` +
                    `Toplam fiyat ${result.totalPrice} TL'dir. Pazarlık mevcuttur.`;
            }

            break;
        }

        case "STOCK_INQUIRY": {

            if (!quantity) {
                reply =
                    "Kaç kilogramlık ürün için stok bilgisi almak istiyorsunuz?";
                break;
            }

            const result = findProductCombination(quantity);

            if (!result) {
                reply =
                    `${quantity} kg için uygun ürün seçeneğimiz bulunmuyor.`;
                break;
            }

            // Stok sorgusunda da quantity hafızaya kaydedilir
            updateConversation(customerId, {
                lastIntent: intent,
                selectedQuantity: quantity
            });

            if (result.type === "EXACT") {
                reply =
                    `Evet, ${quantity} kg ürünümüz mevcut.`;

            } else if (result.type === "COMBINATION") {
                const item = result.items[0];

                reply =
                    `Evet, ${quantity} kg gönderebiliriz. ` +
                    `${item.quantity} adet ${item.product.weight} kg'lık bidon olarak hazırlanır.`;
            }

            break;
        }

        case "SHIPPING_INQUIRY": {
            reply =
                "Kapıda ödeme ile kargo ücretsizdir, EFT ile ödemede kargo ücretlidir.";

            break;
        }

        case "GREETING": {
            reply =
                "Merhaba 👋 Size nasıl yardımcı olabilirim?";

            break;
        }

        case "ORDER": {

            if (!quantity) {
                reply =
                    "Tabii, sipariş oluşturmanıza yardımcı olabilirim. Kaç kilogram ürün istiyorsunuz?";
                break;
            }

            const result = findProductCombination(quantity);

            if (!result) {
                reply =
                    `${quantity} kg için uygun ürün seçeneğimiz bulunmuyor.`;
                break;
            }

            updateConversation(customerId, {
                lastIntent: intent,
                selectedQuantity: quantity
            });

            reply =
                `${quantity} kg sipariş vermek istediğinizi anladım. ` +
                `Sipariş işlemlerine devam edebiliriz.`;

            break;
        }
        case "HUMAN_SUPPORT": {
    
    pauseBot(customerId);

    reply =
        "Tabii, talebinizi yetkiliye iletiyorum. En kısa sürede sizinle ilgilenecektir.";
            
    break;
}

        default: {
            reply =
                "Sorunuzu tam anlayamadım. Ürün, fiyat, stok, kargo veya sipariş hakkında yardımcı olabilirim.";

            break;
        }
    }

    return {
    intent,
    quantity,
    reply,
    botPaused: getConversation(customerId).botPaused,
    conversation: getConversation(customerId)
    };
}

module.exports = {
    generateReply
};