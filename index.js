import { onRequest } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import process from "process";

// ... Todo el resto del código que te pasé se queda exactamente igual ...

// 1. Configuramos la función para que use el secreto de Firebase de forma segura
export const askGeminiBot = onRequest(
  {
    cors: true,
    secrets: ["GEMINI_API_KEY"], // Esto le dice a Firebase que inyecte la clave de forma segura en producción
  },
  async (req, res) => {
    try {
      const { userQuestion, channelName, conversationHistory } = req.body;

      // 2. Leemos la clave de API desde las variables de entorno de Node.js (Servidor)
      const apiKeyActual =
        process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
      if (!apiKeyActual) {
        return res.status(200).json({
          text: "⚠️ Error de configuración: La clave GEMINI_API_KEY no está definida en el servidor.",
        });
      }

      const ahora = new Date();
      const opcionesFecha = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const fechaActual = ahora.toLocaleDateString("es-ES", opcionesFecha);
      const horaActual = ahora.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // INSTRUCCIONES DE ESTILO AVANZADO
      const instruccionesSistema = `Eres CopiBot, un asistente premium, moderno, empático y altamente estético dentro de CopiChat.
Estás en el canal #${channelName}. Tu objetivo es estructurar las respuestas para que sean extremadamente legibles y atractivas a la vista.

REGLAS DE FORMATO (Formatea SIEMPRE tus respuestas con Markdown):
1. Usa títulos jerárquicos cortos (###) para separar las secciones importantes.
2. Usa líneas horizontales (---) para separar conceptos o bloques de información distintos.
3. Usa negritas (**texto**) de forma selectiva para resaltar las palabras clave y guiar la mirada del usuario.
4. Cuando listes elementos, usa viñetas (*) bien organizadas y limpias.
5. Evita los párrafos largos y densos. Rompe el texto en bloques pequeños y digeribles.
6. Mantén un tono amigable pero profesional, adaptando ligeros toques de entusiasmo.

INFORMACIÓN EN TIEMPO REAL:
- Fecha de hoy: ${fechaActual}
- Hora actual: ${horaActual}`;

      const genAI = new GoogleGenerativeAI(apiKeyActual);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: instruccionesSistema,
      });

      const contents = conversationHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      contents.push({
        role: "user",
        parts: [{ text: userQuestion }],
      });

      const result = await model.generateContent({
        contents: contents,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      });

      const responseText = result.response.text();
      res.status(200).json({ text: responseText });
    } catch (error) {
      console.error("ERROR DETECTADO EN COPIBOT:", error);
      res.status(200).json({
        text: `⚠️ No pude conectarme con CopiBot ahora mismo. Revisa tu conexión e intenta de nuevo. Detalle: ${error.message}`,
      });
    }
  },
);
