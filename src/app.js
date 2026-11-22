require("dotenv").config();
const express = require("express");
const cors = require("cors");

const chatRoutes = require("./routes/chatRoutes");
const webhookRoutes = require("./routes/webhookRoutes"); // YENİ

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

app.get("/", (req, res) => {
    res.json({
        message: "Chatbot API çalışıyor 🚀"
    });
});

// Chatbot endpoint
app.use("/api/chat", chatRoutes);
app.use("/webhook", webhookRoutes); // YENİ

app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde çalışıyor.`);
});