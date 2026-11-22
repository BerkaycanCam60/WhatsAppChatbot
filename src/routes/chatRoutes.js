const express = require("express");
const router = express.Router();

const { generateReply } = require("../services/chatbotService");

router.post("/", async (req, res) => {
    try {
        const { customerId, message } = req.body;

        if (!customerId) {
            return res.status(400).json({
                error: "customerId zorunludur."
            });
        }

        if (!message) {
            return res.status(400).json({
                error: "Mesaj boş olamaz."
            });
        }

        console.log("Müşteri:", customerId);
        console.log("Mesaj:", message);

        const result = await generateReply(customerId, message);

        res.json(result);

    } catch (error) {
        console.error("Chatbot hatası:", error);

        res.status(500).json({
            error: "Chatbot cevap üretirken hata oluştu."
        });
    }
});

module.exports = router;