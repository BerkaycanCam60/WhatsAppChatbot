const express = require("express");
const router = express.Router();

const { generateReply } = require("../services/chatbotService");

router.post("/", async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({
            error: "Mesaj boş olamaz."
        });
    }

    console.log("Müşteri mesajı:", message);

    const result = await generateReply(message);

    res.json(result);
});

module.exports = router;