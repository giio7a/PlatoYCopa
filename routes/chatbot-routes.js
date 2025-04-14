// routes/chatbot-routes.js
import express from "express";

export default function configureChatbotRoutes(app, db) {
  // Middleware para procesar JSON
  app.use(express.json());

  // Ruta para procesar mensajes del chatbot
  app.post("/api/chatbot", (req, res) => {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Se requiere un mensaje" });
    }

    // Procesar el mensaje y generar una respuesta
    const response = processMessage(message, db);

    // Enviar respuesta
    res.json({ response });
  });

  // Función para procesar mensajes y generar respuestas
  function processMessage(message, db) {
    const lowerMessage = message.toLowerCase();

    // Base de conocimientos
    const knowledgeBase = {
      servicios:
        "Ofrecemos una amplia gama de servicios incluyendo consultoría, desarrollo web, diseño gráfico y marketing digital. ¿Te gustaría conocer más detalles sobre alguno en particular?",
      horarios:
        "Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 y sábados de 10:00 a 14:00. Los domingos permanecemos cerrados.",
      reserva:
        "Para hacer una reserva, puedes llamarnos al (123) 456-7890 o usar nuestro formulario de contacto en la página web. También puedes enviarnos un correo electrónico a info@empresa.com.",
      ubicacion:
        "Estamos ubicados en Av. Principal 123, Ciudad, CP 12345. Puedes encontrarnos fácilmente en Google Maps o contactarnos para indicaciones más detalladas.",
      precios:
        "Nuestros precios varían según el servicio que necesites. Te invitamos a revisar nuestra página de precios o contactarnos para una cotización personalizada.",
      contacto:
        "Puedes contactarnos por teléfono al (123) 456-7890, por correo electrónico a info@empresa.com o a través del formulario de contacto en nuestra página web.",
    };

    // Verificar si el mensaje coincide con alguna palabra clave
    if (lowerMessage.includes("servicio")) {
      return knowledgeBase.servicios;
    } else if (lowerMessage.includes("horario")) {
      return knowledgeBase.horarios;
    } else if (lowerMessage.includes("reserva") || lowerMessage.includes("cita")) {
      return knowledgeBase.reserva;
    } else if (
      lowerMessage.includes("ubicacion") ||
      lowerMessage.includes("ubicación") ||
      lowerMessage.includes("donde") ||
      lowerMessage.includes("dirección") ||
      lowerMessage.includes("direccion")
    ) {
      return knowledgeBase.ubicacion;
    } else if (
      lowerMessage.includes("precio") ||
      lowerMessage.includes("costo") ||
      lowerMessage.includes("tarifa")
    ) {
      return knowledgeBase.precios;
    } else if (
      lowerMessage.includes("contacto") ||
      lowerMessage.includes("teléfono") ||
      lowerMessage.includes("telefono") ||
      lowerMessage.includes("email") ||
      lowerMessage.includes("correo")
    ) {
      return knowledgeBase.contacto;
    } else if (
      lowerMessage.includes("hola") ||
      lowerMessage.includes("buenos días") ||
      lowerMessage.includes("buenas tardes") ||
      lowerMessage.includes("buenas noches")
    ) {
      return "¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte hoy?";
    } else if (
      lowerMessage.includes("gracias") ||
      lowerMessage.includes("agradezco")
    ) {
      return "¡De nada! Estoy aquí para ayudarte. ¿Hay algo más en lo que pueda asistirte?";
    } else if (
      lowerMessage.includes("adios") ||
      lowerMessage.includes("adiós") ||
      lowerMessage.includes("hasta luego") ||
      lowerMessage.includes("chao")
    ) {
      return "¡Hasta luego! Si necesitas algo más, no dudes en volver a contactarnos.";
    } else {
      // Respuesta genérica para mensajes que no coinciden con palabras clave
      return "Lo siento, no tengo información específica sobre eso. ¿Puedo ayudarte con información sobre nuestros servicios, horarios, reservas, ubicación o precios?";
    }
  }
}
