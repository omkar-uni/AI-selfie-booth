// backend/sendWhatsApp.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function sendWhatsAppMessage(phoneNumber, imageUrl) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber, // Must include country code, e.g. "919876543210"
        type: "image",
        image: {
          link: imageUrl,
          caption: "Your AI Selfie is ready! 📸",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ WhatsApp message sent:", response.data);
  } catch (error) {
    console.error(
      "❌ WhatsApp send error:",
      error.response?.data || error.message
    );
  }
}
