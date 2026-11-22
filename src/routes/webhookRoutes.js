
const express = require("express"); // Express kütüphanesini projeye dahil eder.
const axios = require("axios"); // WhatsApp Cloud API'ye HTTP isteği gönderir.
const { generateReply } = require("../services/chatbotService"); // Chatbot cevabı üretir.

const router = express.Router(); // Webhook için ayrı bir yönlendirici oluşturur.

// ======================================================
// 0. TEKRAR EDEN MESAJLARI ÖNLEME
// ======================================================

// Daha önce başarıyla işlenen mesajların ID değerlerini tutar.
const processedMessages = new Set();

// Şu anda işlenmekte olan mesajların ID değerlerini tutar.
const processingMessages = new Set();

// Bellekte tutulacak maksimum mesaj sayısını belirler.
const MAX_PROCESSED_MESSAGES = 5000;

// ======================================================
// YARDIMCI FONKSİYON: İŞLENEN MESAJI KAYDETME
// ======================================================

function saveProcessedMessage(messageId) {
    // Mesaj ID'sini daha önce işlenmiş mesajlar listesine ekler.
    processedMessages.add(messageId);

    // Bellek sınırı aşılırsa en eski kaydı siler.
    if (processedMessages.size > MAX_PROCESSED_MESSAGES) {
        const oldestMessageId = processedMessages.values().next().value;
        processedMessages.delete(oldestMessageId);
    }
}

// ======================================================
// 1. META WEBHOOK DOĞRULAMASI (GET)
// ======================================================

router.get("/", (req, res) => {
    // Meta'nın gönderdiği doğrulama parametrelerini alır.
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Meta'nın token değerinin bizim belirlediğimiz token ile eşleştiğini kontrol eder.
    if (
        mode === "subscribe" &&
        token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
        console.log("WhatsApp webhook doğrulandı.");

        // Meta'nın gönderdiği challenge değerini geri döndürür.
        return res.status(200).send(challenge);
    }

    // Doğrulama başarısızsa isteği reddeder.
    return res.sendStatus(403);
});

// ======================================================
// 2. WHATSAPP'TAN GELEN MESAJLARI KARŞILAMA (POST)
// ======================================================

router.post("/", async (req, res) => {
    try {
        // Meta'nın gönderdiği webhook verisini alır.
        const body = req.body;

        // Bildirimin WhatsApp Business hesabına ait olduğunu kontrol eder.
        if (body.object !== "whatsapp_business_account") {
            return res.sendStatus(404);
        }

        // Bildirimdeki entry listesini alır.
        const entries = body.entry || [];

        // Her entry içerisindeki değişiklikleri kontrol eder.
        for (const entry of entries) {
            for (const change of entry.changes || []) {
                const value = change.value;

                // Mesaj içermeyen durum bildirimlerini atlar.
                if (!value.messages) continue;

                // Bildirimdeki her mesajı ayrı ayrı işler.
                for (const message of value.messages) {

                    // Yalnızca metin mesajlarını işler.
                    if (message.type !== "text") continue;

                    // Meta'nın gönderdiği benzersiz mesaj ID'sini alır.
                    const messageId = message.id;

                    // Mesaj ID'si yoksa güvenli şekilde atlar.
                    if (!messageId) {
                        console.log("Mesaj ID bulunamadı.");
                        continue;
                    }

                    // Mesaj daha önce başarıyla işlendiyse tekrar cevap üretmez.
                    if (processedMessages.has(messageId)) {
                        console.log("Tekrarlanan mesaj atlandı:", messageId);
                        continue;
                    }

                    // Aynı mesaj eş zamanlı olarak işleniyorsa ikinci kez başlatmaz.
                    if (processingMessages.has(messageId)) {
                        console.log("Mesaj zaten işleniyor:", messageId);
                        continue;
                    }

                    // Mesajın işlenmekte olduğunu geçici olarak kaydeder.
                    processingMessages.add(messageId);

                    try {
                        // Müşterinin WhatsApp numarasını müşteri kimliği olarak alır.
                        const customerId = message.from;

                        // Müşterinin gönderdiği metni alır.
                        const customerMessage = message.text.body;

                        console.log("Yeni WhatsApp mesajı:", customerId, customerMessage);

                        // Mevcut chatbot servisini çalıştırıp cevap üretir.
                        const result = await generateReply(
                            customerId,
                            customerMessage
                        );

                        // Bot duraklatılmışsa veya cevap üretilememişse mesaj göndermez.
                        if (!result || result.botPaused || !result.reply) {
                            console.log("Bot bu müşteri için duraklatılmış veya cevap üretilemedi.");

                            // Aynı mesajın tekrar denenmesini önlemek için işlenmiş olarak kaydeder.
                            saveProcessedMessage(messageId);
                            continue;
                        }

                        // ======================================================
                        // 3. CHATBOT CEVABINI WHATSAPP ÜZERİNDEN GÖNDERME
                        // ======================================================

                        // WhatsApp Cloud API'ye cevap mesajını gönderir.
                        await axios.post(
                            `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                            {
                                messaging_product: "whatsapp", // WhatsApp platformunu belirtir.
                                recipient_type: "individual", // Bireysel müşteriye mesaj gönderir.
                                to: customerId, // Mesajın gönderileceği müşteri numarasıdır.
                                type: "text", // Mesajın metin türünde olduğunu belirtir.
                                text: {
                                    body: result.reply // Chatbot'un oluşturduğu cevap metnidir.
                                }
                            },
                            {
                                headers: {
                                    // Meta API kimlik doğrulama token'ını gönderir.
                                    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,

                                    // İstek içeriğinin JSON olduğunu belirtir.
                                    "Content-Type": "application/json"
                                }
                            }
                        );

                        console.log("WhatsApp cevabı gönderildi:", customerId);

                        // Cevap başarıyla gönderildiyse mesaj ID'sini kaydeder.
                        saveProcessedMessage(messageId);

                    } finally {
                        // Başarılı veya başarısız her durumda geçici işlem kaydını temizler.
                        processingMessages.delete(messageId);
                    }
                }
            }
        }

        // Meta'ya bildirimin başarıyla alındığını söyler.
        return res.sendStatus(200);

    } catch (error) {
        // Hata ayrıntılarını terminale yazar.
        console.error(
            "WhatsApp webhook hatası:",
            error.response?.data || error.message
        );

        // Meta'ya isteğin işlenemediğini bildirir.
        return res.sendStatus(500);
    }
});

// Webhook yönlendiricisini app.js dosyasına aktarır.
module.exports = router;
