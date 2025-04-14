import nodemailer from "nodemailer"
import { fileURLToPath } from "url"
import path from "path"

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function configureMensajesRoutes(app, db) {
  // Middleware para verificar autenticación
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Configuración de nodemailer para envío de correos
  // Configuración del transporte de correo
  const transporter = nodemailer.createTransport({
    service: "gmail", // Puedes cambiarlo por tu proveedor de correo
    auth: {
      user: "platoycopa.oficial@gmail.com", // Reemplaza con el correo real
      pass: "hjxs qukq pooq ytxr", // Reemplaza con la contraseña real o token de aplicación
    },
  })

  // Ruta para ver todos los mensajes (dashboard)
  app.get("/dashboard/mensajes", isAuthenticated, async (req, res) => {
    try {
      // Obtener todos los mensajes
      const mensajes = await db.contactoRepo.getAll()

      // Obtener tipos de eventos para mostrar nombres en lugar de IDs
      const tiposEventos = await db.tiposEventosRepo.getAll()

      // Crear un mapa de ID a nombre para tipos de eventos
      const tiposEventosMap = {}
      tiposEventos.forEach((tipo) => {
        tiposEventosMap[tipo.id] = tipo.nombre
      })

      // Enriquecer los mensajes con nombres de eventos
      const mensajesEnriquecidos = mensajes.map((mensaje) => {
        return {
          ...mensaje,
          tipo_evento_nombre: mensaje.tipo_evento
            ? tiposEventosMap[mensaje.tipo_evento] || "No especificado"
            : "No especificado",
        }
      })

      // Contar mensajes no leídos
      const unreadCount = mensajesEnriquecidos.filter((mensaje) => !mensaje.leido).length

      res.render("dashboard/mensajes", {
        title: "Mensajes de Contacto | Dashboard",
        user: req.session.user,
        mensajes: mensajesEnriquecidos,
        unreadCount,
        layout: "dashboard-layout",
        active: "mensajes",
        helpers: {
          // Helper para truncar texto
          truncate: (text, length) => {
            if (!text) return ""
            if (text.length <= length) return text
            return text.substring(0, length) + "..."
          },
          // Helper para formatear fecha
          formatDate: (date) => {
            if (!date) return ""
            const d = new Date(date)
            return d.toLocaleDateString("es-MX", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          },
        },
      })
    } catch (error) {
      console.error("Error al cargar mensajes:", error)
      res.status(500).render("error", {
        message: "Error al cargar mensajes",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "error-layout",
      })
    }
  })

  // API para obtener un mensaje por ID
  app.get("/api/mensajes/:id", isAuthenticated, async (req, res) => {
    try {
      const resultado = await db.contactoRepo.obtenerMensajePorId(req.params.id)

      if (!resultado.success) {
        return res.status(404).json({ success: false, message: "Mensaje no encontrado" })
      }

      // El mensaje ya viene con el nombre del tipo de evento desde el repositorio
      res.json({ success: true, mensaje: resultado.mensaje })
    } catch (error) {
      console.error(`Error al obtener mensaje con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al obtener el mensaje" })
    }
  })

  // API para marcar un mensaje como leído
  app.put("/api/mensajes/:id/read", isAuthenticated, async (req, res) => {
    try {
      const result = await db.contactoRepo.marcarLeido(req.params.id)

      if (result.success) {
        res.json({ success: true, message: "Mensaje marcado como leído" })
      } else {
        res.status(500).json({ success: false, message: result.message || "Error al marcar como leído" })
      }
    } catch (error) {
      console.error(`Error al marcar mensaje como leído:`, error)
      res.status(500).json({ success: false, message: "Error al marcar el mensaje como leído" })
    }
  })

  // API para responder a un mensaje
  app.post("/api/mensajes/:id/reply", isAuthenticated, async (req, res) => {
    try {
      const { mensaje, includeSignature } = req.body

      if (!mensaje) {
        return res.status(400).json({ success: false, message: "El mensaje es requerido" })
      }

      // Obtener el mensaje original
      const mensajeResult = await db.contactoRepo.obtenerMensajePorId(req.params.id)

      if (!mensajeResult.success) {
        return res.status(404).json({ success: false, message: "Mensaje no encontrado" })
      }

      const mensajeOriginal = mensajeResult.mensaje

      // Verificar si ya fue respondido
      if (mensajeOriginal.respondido) {
        return res.status(400).json({
          success: false,
          message: "Este mensaje ya ha sido respondido",
        })
      }

      // Preparar firma
      let signature = ""
      if (includeSignature) {
        signature = `
        <br><br>
        <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 15px;">
          <img src="cid:logo" alt="Plato y Copa" style="max-width: 120px; margin-bottom: 10px;"><br>
          <strong>Plato y Copa - Servicio de meseros</strong><br>
          Email: platoycopa.oficial@gmail.com<br>
          Tel: +52 (222) 378-0903<br>
          <a href="https://www.platoycopa.com">www.platoycopa.com</a>
        </div>`
      }

      // Obtener el nombre del tipo de evento para el asunto
      const tipoEventoNombre = mensajeOriginal.tipo_evento_nombre || "Consulta general"

      // Preparar correo
      const mailOptions = {
        from: {
          name: `${req.session.user.nombre} - Plato y Copa`,
          address: process.env.EMAIL_USER || "platoycopa.oficial@gmail.com",
        },
        to: mensajeOriginal.email,
        subject: `Re: Mensaje de contacto - ${tipoEventoNombre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #000; padding: 20px; text-align: center;">
              <img src="cid:logo" alt="Plato y Copa" style="max-width: 150px;">
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Hola ${mensajeOriginal.nombre},</p>
              <p>${mensaje.replace(/\n/g, "<br>")}</p>
              ${signature}
            </div>
            <div style="background-color: #000; color: #e5c76b; text-align: center; padding: 15px; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Plato y Copa. Todos los derechos reservados.
            </div>
          </div>
        `,
        attachments: [
          {
            filename: "Plato_y_Copa_logo.jpg",
            path: path.join(__dirname, "../public/img/Plato_y_Copa_logo.jpg"),
            cid: "logo",
          },
        ],
      }

      // Enviar correo
      const info = await transporter.sendMail(mailOptions)

      // Actualizar mensaje como respondido
      const result = await db.contactoRepo.marcarRespondido(req.params.id, req.session.user.nombre, mensaje)

      if (result.success) {
        res.json({
          success: true,
          message: "Respuesta enviada correctamente",
          messageId: info.messageId,
        })
      } else {
        res.status(500).json({
          success: false,
          message: result.message || "Error al marcar como respondido",
        })
      }
    } catch (error) {
      console.error(`Error al responder mensaje:`, error)
      res.status(500).json({ success: false, message: "Error al enviar la respuesta" })
    }
  })

  // API para reenviar un mensaje
  app.post("/api/mensajes/:id/forward", isAuthenticated, async (req, res) => {
    try {
      const { email, asunto, mensaje } = req.body

      if (!email || !mensaje) {
        return res.status(400).json({
          success: false,
          message: "El correo y el mensaje son requeridos",
        })
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "El formato del correo electrónico es inválido",
        })
      }

      // Obtener el mensaje original para incluir información relevante
      const mensajeResult = await db.contactoRepo.obtenerMensajePorId(req.params.id)

      if (!mensajeResult.success) {
        return res.status(404).json({
          success: false,
          message: "Mensaje original no encontrado",
        })
      }

      const mensajeOriginal = mensajeResult.mensaje

      // Obtener el nombre del tipo de evento para el asunto si no se proporcionó uno
      const tipoEventoNombre = mensajeOriginal.tipo_evento_nombre || "Consulta general"
      const asuntoFinal = asunto || `Mensaje reenviado: ${tipoEventoNombre}`

      // Preparar correo
      const mailOptions = {
        from: {
          name: `${req.session.user.nombre} - Plato y Copa`,
          address: process.env.EMAIL_USER || "platoycopa.oficial@gmail.com",
        },
        to: email,
        subject: asuntoFinal,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #000; padding: 20px; text-align: center;">
              <img src="cid:logo" alt="Plato y Copa" style="max-width: 150px;">
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>${mensaje.replace(/\n/g, "<br>")}</p>
              <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 15px;">
                <strong>Reenviado por:</strong> ${req.session.user.nombre}<br>
                <strong>Fecha:</strong> ${new Date().toLocaleString("es-MX")}
              </div>
            </div>
            <div style="background-color: #000; color: #e5c76b; text-align: center; padding: 15px; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Plato y Copa. Todos los derechos reservados.
            </div>
          </div>
        `,
        attachments: [
          {
            filename: "Plato_y_copa_logo.jpg",
            path: path.join(__dirname, "../public/img/Plato_y_Copa_logo.jpg"),
            cid: "logo",
          },
        ],
      }

      // Enviar correo
      const info = await transporter.sendMail(mailOptions)

      // Registrar reenvío en el log
      await db.contactoRepo.registrarReenvio(req.params.id, req.session.user.id, email)

      res.json({
        success: true,
        message: "Mensaje reenviado correctamente",
        messageId: info.messageId,
      })
    } catch (error) {
      console.error(`Error al reenviar mensaje:`, error)
      res.status(500).json({ success: false, message: "Error al reenviar el mensaje" })
    }
  })

  // API para archivar un mensaje
  app.put("/api/mensajes/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const result = await db.contactoRepo.archivar(req.params.id)

      if (result.success) {
        res.json({ success: true, message: "Mensaje archivado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message || "Error al archivar el mensaje" })
      }
    } catch (error) {
      console.error(`Error al archivar mensaje:`, error)
      res.status(500).json({ success: false, message: "Error al archivar el mensaje" })
    }
  })

  // API para desarchivar un mensaje
  app.put("/api/mensajes/:id/unarchive", isAuthenticated, async (req, res) => {
    try {
      const result = await db.contactoRepo.desarchivar(req.params.id)

      if (result.success) {
        res.json({ success: true, message: "Mensaje desarchivado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message || "Error al desarchivar el mensaje" })
      }
    } catch (error) {
      console.error(`Error al desarchivar mensaje:`, error)
      res.status(500).json({ success: false, message: "Error al desarchivar el mensaje" })
    }
  })

  // API para eliminar un mensaje
  app.delete("/api/mensajes/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await db.contactoRepo.eliminar(req.params.id)

      if (result.success) {
        res.json({ success: true, message: "Mensaje eliminado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message || "Error al eliminar el mensaje" })
      }
    } catch (error) {
      console.error(`Error al eliminar mensaje:`, error)
      res.status(500).json({ success: false, message: "Error al eliminar el mensaje" })
    }
  })
}
