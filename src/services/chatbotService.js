const { analyzeMessage } = require("./aiService");
const { findProductCombination } = require("./productService");

function detectQuantityFallback(message) {
    const text = message.toLowerCase();

    const match = text.match(/(\d+)\s*(kg|kilo|lik|lık|luk|lük)?/);

    if (match) {
        return Number(match[1]);
    }

    return null;
}

async function generateReply(message) {
    const analysis = await analyzeMessage(message);

    const intent = analysis.intent;
    let quantity = analysis.quantity;

    // AI miktarı çıkaramazsa local fallback devreye girer
    if (quantity === null || quantity === undefined) {
        quantity = detectQuantityFallback(message);
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

        case "SHIPPING_INQUIRY":
            reply =
                "kapıda ödeme ile kargo ücretsiz eft ile ücretlidir.";
            break;

        case "GREETING":
            reply =
                "Merhaba 👋 Size nasıl yardımcı olabilirim?";
            break;

        case "ORDER":
            reply =
                "Tabii, sipariş oluşturmanıza yardımcı olabilirim. Kaç kilogram ürün istiyorsunuz?";
            break;

        default:
            reply =
                "Sorunuzu tam anlayamadım. Ürün, fiyat, stok, kargo veya sipariş hakkında yardımcı olabilirim.";
    }

    return {
        intent,
        quantity,
        reply
    };
}

module.exports = {
    generateReply
};