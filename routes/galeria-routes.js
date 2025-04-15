import path from "path"
import { fileURLToPath } from "url"
import { createUploader } from "../utils/cloudinary.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración de Cloudinary para subida de imágenes
const upload = createUploader("gallery")

export default function configureGaleriaRoutes(app, db) {
  // Middleware para verificar autenticación
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Ruta para obtener todas las imágenes (dashboard)
  app.get("/dashboard/galeria", isAuthenticated, async (req, res) => {
    try {
      const imagenes = await db.galeriaRepo.getAll()
      const tiposEventos = await db.tiposEventosRepo.getAll()

      // Agregar el nombre del tipo de evento a cada imagen
      const imagenesConTipoEvento = await Promise.all(
        imagenes.map(async (imagen) => {
          if (imagen.tipo_evento_id) {
            const tipoEvento = await db.tiposEventosRepo.getById(imagen.tipo_evento_id)
            return {
              ...imagen,
              tipo_evento: tipoEvento ? tipoEvento.nombre : "Desconocido",
            }
          }
          return {
            ...imagen,
            tipo_evento: "Sin categoría",
          }
        })
      )

      res.render("dashboard/galeria", {
        title: "Gestión de Galería | Dashboard",
        user: req.session.user,
        imagenes: imagenesConTipoEvento,
        tiposEventos,
        layout: "dashboard-layout",
        active: "galeria",
      })
    } catch (error) {
      console.error("Error al cargar gestión de galería:", error)
      res.status(500).render("error", {
        message: "Error al cargar gestión de galería",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "error-layout",
      })
    }
  })

  // API para obtener una imagen por ID
  app.get("/api/galeria/:id", isAuthenticated, async (req, res) => {
    try {
      const imagen = await db.galeriaRepo.getById(req.params.id)

      if (!imagen) {
        return res.status(404).json({ success: false, message: "Imagen no encontrada" })
      }

      // Obtener el tipo de evento
      if (imagen.tipo_evento_id) {
        const tipoEvento = await db.tiposEventosRepo.getById(imagen.tipo_evento_id)
        imagen.tipo_evento = tipoEvento ? tipoEvento.nombre : "Desconocido"
      } else {
        imagen.tipo_evento = "Sin categoría"
      }

      res.json({ success: true, imagen })
    } catch (error) {
      console.error(`Error al obtener imagen con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al obtener la imagen" })
    }
  })

  // API para crear una nueva imagen
  app.post("/api/galeria", isAuthenticated, upload.single("imagen"), async (req, res) => {
    try {
      const { titulo, descripcion, tipo_evento_id, orden, destacada = 0 } = req.body

      // Validar campos requeridos
      if (!titulo || !tipo_evento_id) {
        return res.status(400).json({
          success: false,
          message: "El título y el tipo de evento son obligatorios",
        })
      }

      // Validar que se haya subido una imagen
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Debes subir una imagen",
        })
      }

      // Procesar la imagen - Ahora obtenemos la URL de Cloudinary
      const url_imagen = req.file.path

      // Crear la imagen - Pasamos la función getDb de db
      const result = await db.galeriaRepo.crear(
        {
          titulo,
          descripcion,
          tipo_evento_id,
          url_imagen,
          orden: Number.parseInt(orden) || 1,
          destacada: destacada ? 1 : 0,
          fecha_creacion: new Date().toISOString(),
        },
        db.getDb
      )

      if (result.success) {
        res.json({ success: true, id: result.id, message: "Imagen agregada correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error("Error al crear imagen:", error)
      res.status(500).json({ success: false, message: "Error al agregar la imagen" })
    }
  })

  // API para actualizar una imagen
  app.put("/api/galeria/:id", isAuthenticated, upload.single("imagen"), async (req, res) => {
    try {
      const { titulo, descripcion, tipo_evento_id, orden, destacada = 0 } = req.body

      // Validar campos requeridos
      if (!titulo || !tipo_evento_id) {
        return res.status(400).json({
          success: false,
          message: "El título y el tipo de evento son obligatorios",
        })
      }

      // Obtener la imagen actual
      const imagen = await db.galeriaRepo.getById(req.params.id)
      if (!imagen) {
        return res.status(404).json({ success: false, message: "Imagen no encontrada" })
      }

      // Procesar la imagen - Si hay una nueva imagen, usamos la URL de Cloudinary
      let url_imagen = imagen.url_imagen
      if (req.file) {
        url_imagen = req.file.path
      }

      // Actualizar la imagen - Pasamos la función getDb de db
      const result = await db.galeriaRepo.actualizar(
        {
          id: req.params.id,
          titulo,
          descripcion,
          tipo_evento_id,
          url_imagen,
          orden: Number.parseInt(orden) || 1,
          destacada: destacada ? 1 : 0,
          fecha_actualizacion: new Date().toISOString(),
        },
        db.getDb
      )

      if (result.success) {
        res.json({ success: true, message: "Imagen actualizada correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al actualizar imagen con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al actualizar la imagen" })
    }
  })

  // API para eliminar una imagen
  app.delete("/api/galeria/:id", isAuthenticated, async (req, res) => {
    try {
      // Obtener la imagen para poder eliminar el archivo
      const imagen = await db.galeriaRepo.getById(req.params.id)
      if (!imagen) {
        return res.status(404).json({ success: false, message: "Imagen no encontrada" })
      }

      // Eliminar la imagen - Pasamos la función getDb de db
      const result = await db.galeriaRepo.eliminar(req.params.id, db.getDb)

      if (result.success) {
        res.json({ success: true, message: "Imagen eliminada correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al eliminar imagen con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al eliminar la imagen" })
    }
  })
}