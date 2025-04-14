// Importar módulos necesarios
import { fileURLToPath } from "url"
import path from "path"

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function configureTiposEventosRoutes(app, db) {
  // Middleware para verificar autenticación
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Ruta para obtener todos los tipos de eventos (dashboard)
  app.get("/dashboard/tipos-eventos", isAuthenticated, async (req, res) => {
    try {
      const tiposEventos = await db.tiposEventosRepo.getAll()
      res.render("dashboard/tipos-eventos", {
        title: "Gestión de Tipos de Eventos | Dashboard",
        user: req.session.user,
        tiposEventos,
        layout: "dashboard-layout",
        active: "tipos-eventos",
      })
    } catch (error) {
      console.error("Error al cargar gestión de tipos de eventos:", error)
      res.status(500).render("error", {
        message: "Error al cargar gestión de tipos de eventos",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "error-layout",
      })
    }
  })

  // API para obtener un tipo de evento por ID
  app.get("/api/tipos-eventos/:id", isAuthenticated, async (req, res) => {
    try {
      const tipoEvento = await db.tiposEventosRepo.getById(req.params.id)

      if (!tipoEvento) {
        return res.status(404).json({ success: false, message: "Tipo de evento no encontrado" })
      }

      res.json({ success: true, tipoEvento })
    } catch (error) {
      console.error(`Error al obtener tipo de evento con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al obtener el tipo de evento" })
    }
  })

  // API para crear un nuevo tipo de evento
  app.post("/api/tipos-eventos", isAuthenticated, async (req, res) => {
    try {
      const { nombre, descripcion, icono } = req.body

      // Validar campos requeridos
      if (!nombre || !descripcion) {
        return res.status(400).json({
          success: false,
          message: "El nombre y la descripción son obligatorios",
        })
      }

      // Crear el tipo de evento - Pasamos la función getDb de db
      const result = await db.tiposEventosRepo.crear(
        {
          nombre,
          descripcion,
          icono: icono || "calendar-event",
        },
        db.getDb,
      )

      if (result.success) {
        res.json({ success: true, id: result.id, message: "Tipo de evento creado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error("Error al crear tipo de evento:", error)
      res.status(500).json({ success: false, message: "Error al crear el tipo de evento" })
    }
  })

  // API para actualizar un tipo de evento
  app.put("/api/tipos-eventos/:id", isAuthenticated, async (req, res) => {
    try {
      const { nombre, descripcion, icono } = req.body

      // Validar campos requeridos
      if (!nombre || !descripcion) {
        return res.status(400).json({
          success: false,
          message: "El nombre y la descripción son obligatorios",
        })
      }

      // Obtener el tipo de evento actual
      const tipoEvento = await db.tiposEventosRepo.getById(req.params.id)
      if (!tipoEvento) {
        return res.status(404).json({ success: false, message: "Tipo de evento no encontrado" })
      }

      // Actualizar el tipo de evento - Pasamos la función getDb de db
      const result = await db.tiposEventosRepo.actualizar(
        req.params.id,
        {
          nombre,
          descripcion,
          icono: icono || "calendar-event",
        },
        db.getDb,
      )

      if (result.success) {
        res.json({ success: true, message: "Tipo de evento actualizado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al actualizar tipo de evento con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al actualizar el tipo de evento" })
    }
  })

  // API para eliminar un tipo de evento
  app.delete("/api/tipos-eventos/:id", isAuthenticated, async (req, res) => {
    try {
      // Verificar si el tipo de evento existe
      const tipoEvento = await db.tiposEventosRepo.getById(req.params.id)
      if (!tipoEvento) {
        return res.status(404).json({ success: false, message: "Tipo de evento no encontrado" })
      }

      // Verificar si el tipo de evento está siendo utilizado - Pasamos la función getDb de db
      const isInUse = await db.tiposEventosRepo.isInUse(req.params.id, db.getDb)
      if (isInUse) {
        return res.status(400).json({
          success: false,
          message:
            "No se puede eliminar este tipo de evento porque está siendo utilizado en eventos, reseñas o cotizaciones",
        })
      }

      // Eliminar el tipo de evento - Pasamos la función getDb de db
      const result = await db.tiposEventosRepo.eliminar(req.params.id, db.getDb)

      if (result.success) {
        res.json({ success: true, message: "Tipo de evento eliminado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al eliminar tipo de evento con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al eliminar el tipo de evento" })
    }
  })
}

