import { fileURLToPath } from "url"
import path from "path"

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function configureConfiguracionRoutes(app, db) {
  // Middleware para verificar autenticación
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Ruta para la página de configuración
  app.get("/dashboard/configuracion", isAuthenticated, async (req, res) => {
    try {
      // Obtener configuraciones del usuario desde cookies
      const userSettings = {
        lightMode: req.cookies.lightMode === "true",
        fontSize: req.cookies.fontSize || "medium",
        compactView: req.cookies.compactView === "true",
        autoRefresh: req.cookies.autoRefresh === "true",
        refreshInterval: Number.parseInt(req.cookies.refreshInterval) || 60,
        replyTemplate: req.cookies.replyTemplate || "",
        notificationsEnabled: req.cookies.notificationsEnabled !== "false", // Por defecto true
        emailNotifications: req.cookies.emailNotifications === "true",
      }

      res.render("dashboard/configuracion", {
        title: "Configuración | Dashboard",
        pageTitle: "Configuración",
        user: req.session.user,
        settings: userSettings,
        layout: "dashboard-layout",
        active: "configuracion",
      })
    } catch (error) {
      console.error("Error al cargar configuración:", error)
      res.status(500).render("error", {
        message: "Error al cargar la configuración",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "error-layout",
      })
    }
  })

  // API para guardar configuraciones
  app.post("/api/configuracion", isAuthenticated, async (req, res) => {
    try {
      const {
        lightMode,
        fontSize,
        compactView,
        autoRefresh,
        refreshInterval,
        replyTemplate,
        notificationsEnabled,
        emailNotifications,
      } = req.body

      // Validar datos
      if (fontSize && !["small", "medium", "large"].includes(fontSize)) {
        return res.status(400).json({ success: false, message: "Tamaño de fuente inválido" })
      }

      if (refreshInterval && (isNaN(refreshInterval) || refreshInterval < 10 || refreshInterval > 300)) {
        return res
          .status(400)
          .json({ success: false, message: "Intervalo de actualización inválido (debe estar entre 10 y 300 segundos)" })
      }

      // Configurar cookies con una duración de 1 año
      const cookieOptions = {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año en milisegundos
        httpOnly: false, // Permitir acceso desde JavaScript
        path: "/", // Asegurar que la cookie esté disponible en toda la aplicación
      }

      // Guardar configuraciones en cookies
      res.cookie("lightMode", lightMode, cookieOptions)
      res.cookie("fontSize", fontSize, cookieOptions)
      res.cookie("compactView", compactView, cookieOptions)
      res.cookie("autoRefresh", autoRefresh, cookieOptions)
      res.cookie("refreshInterval", refreshInterval, cookieOptions)
      res.cookie("replyTemplate", encodeURIComponent(replyTemplate), cookieOptions)
      res.cookie("notificationsEnabled", notificationsEnabled, cookieOptions)
      res.cookie("emailNotifications", emailNotifications, cookieOptions)

      // Responder con éxito
      res.json({
        success: true,
        message: "Configuración guardada correctamente",
        settings: {
          lightMode,
          fontSize,
          compactView,
          autoRefresh,
          refreshInterval,
          replyTemplate,
          notificationsEnabled,
          emailNotifications,
        },
      })
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      res.status(500).json({ success: false, message: "Error al guardar la configuración" })
    }
  })

  // API para restablecer configuraciones
  app.post("/api/configuracion/reset", isAuthenticated, async (req, res) => {
    try {
      // Configuraciones predeterminadas
      const defaultSettings = {
        lightMode: false,
        fontSize: "medium",
        compactView: false,
        autoRefresh: false,
        refreshInterval: 60,
        replyTemplate: "",
        notificationsEnabled: true,
        emailNotifications: false,
      }

      // Configurar cookies con una duración de 1 año
      const cookieOptions = {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año en milisegundos
        httpOnly: false, // Permitir acceso desde JavaScript
        path: "/", // Asegurar que la cookie esté disponible en toda la aplicación
      }

      // Guardar configuraciones predeterminadas en cookies
      res.cookie("lightMode", defaultSettings.lightMode, cookieOptions)
      res.cookie("fontSize", defaultSettings.fontSize, cookieOptions)
      res.cookie("compactView", defaultSettings.compactView, cookieOptions)
      res.cookie("autoRefresh", defaultSettings.autoRefresh, cookieOptions)
      res.cookie("refreshInterval", defaultSettings.refreshInterval, cookieOptions)
      res.cookie("replyTemplate", defaultSettings.replyTemplate, cookieOptions)
      res.cookie("notificationsEnabled", defaultSettings.notificationsEnabled, cookieOptions)
      res.cookie("emailNotifications", defaultSettings.emailNotifications, cookieOptions)

      // Responder con éxito
      res.json({
        success: true,
        message: "Configuración restablecida correctamente",
        settings: defaultSettings,
      })
    } catch (error) {
      console.error("Error al restablecer configuración:", error)
      res.status(500).json({ success: false, message: "Error al restablecer la configuración" })
    }
  })
}
