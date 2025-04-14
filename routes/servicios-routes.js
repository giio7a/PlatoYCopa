import express from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

// Configuración de multer para subida de imágenes
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../public/img/services")

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "service-" + uniqueSuffix + ext)
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }

    cb(new Error("Solo se permiten archivos de imagen (jpg, jpeg, png, gif, webp)"))
  },
})

export default function configureServiciosRoutes(app, db) {

  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })
  // Ruta para obtener todos los servicios (dashboard)
  app.get("/dashboard/servicios", isAuthenticated, async (req, res) => {
    try {
      const servicios = await db.serviciosRepo.getAll()
      res.render("dashboard/servicios", {
        title: "Gestión de Servicios | Dashboard",
        user: req.session.user,
        servicios,
        layout: "dashboard-layout",
        active: "servicios",
      })
    } catch (error) {
      console.error("Error al cargar gestión de servicios:", error)
      res.status(500).render("error", {
        message: "Error al cargar gestión de servicios",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "error-layout",
      })
    }
  })

  // API para obtener un servicio por ID
  app.get("/api/servicios/:id", isAuthenticated, async (req, res) => {
    try {
      const servicio = await db.serviciosRepo.getById(req.params.id)

      if (!servicio) {
        return res.status(404).json({ success: false, message: "Servicio no encontrado" })
      }

      res.json({ success: true, servicio })
    } catch (error) {
      console.error(`Error al obtener servicio con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al obtener el servicio" })
    }
  })

  // API para crear un nuevo servicio
  app.post("/api/servicios", isAuthenticated, upload.single("imagen"), async (req, res) => {
    try {
      const {
        titulo,
        descripcion_corta,
        descripcion_completa,
        precio,
        precio_desde,
        icono = "bi-star",
        destacado = 0,
        orden = 1,
      } = req.body

      // Validar campos requeridos
      if (!titulo || !descripcion_corta) {
        return res.status(400).json({
          success: false,
          message: "El título y la descripción corta son obligatorios",
        })
      }

      // Procesar la imagen
      let imagen_url = null
      if (req.file) {
        imagen_url = `/img/services/${req.file.filename}`
      }

      // Preparar características como JSON si se proporcionan
      let caracteristicas = req.body.caracteristicas || "[]"
      if (typeof caracteristicas === "string" && !caracteristicas.startsWith("[")) {
        // Si es una cadena separada por comas, convertirla a array
        caracteristicas = JSON.stringify(caracteristicas.split(",").map((item) => item.trim()))
      }

      // Crear el servicio - Pasamos la función getDb de db
      const result = await db.serviciosRepo.crear(
        {
          titulo,
          descripcion_corta,
          descripcion_completa,
          precio,
          precio_desde,
          imagen_url,
          icono,
          caracteristicas,
          destacado: Number.parseInt(destacado),
          orden: Number.parseInt(orden),
        },
        db.getDb,
      )

      if (result.success) {
        res.json({ success: true, id: result.id, message: "Servicio creado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error("Error al crear servicio:", error)
      res.status(500).json({ success: false, message: "Error al crear el servicio" })
    }
  })

  // API para actualizar un servicio
  app.put("/api/servicios/:id", isAuthenticated, upload.single("imagen"), async (req, res) => {
    try {
      const { titulo, descripcion_corta, descripcion_completa, precio, precio_desde, icono, destacado, orden } =
        req.body

      // Validar campos requeridos
      if (!titulo || !descripcion_corta) {
        return res.status(400).json({
          success: false,
          message: "El título y la descripción corta son obligatorios",
        })
      }

      // Obtener el servicio actual
      const servicio = await db.serviciosRepo.getById(req.params.id)
      if (!servicio) {
        return res.status(404).json({ success: false, message: "Servicio no encontrado" })
      }

      // Procesar la imagen
      let imagen_url = servicio.imagen_url
      if (req.file) {
        imagen_url = `/img/services/${req.file.filename}`

        // Eliminar la imagen anterior si existe y no es la predeterminada
        if (
          servicio.imagen_url &&
          !servicio.imagen_url.includes("placeholder") &&
          fs.existsSync(path.join(__dirname, "../public", servicio.imagen_url))
        ) {
          fs.unlinkSync(path.join(__dirname, "../public", servicio.imagen_url))
        }
      }

      // Preparar características como JSON si se proporcionan
      let caracteristicas = req.body.caracteristicas || servicio.caracteristicas || "[]"
      if (typeof caracteristicas === "string" && !caracteristicas.startsWith("[")) {
        // Si es una cadena separada por comas, convertirla a array
        caracteristicas = JSON.stringify(caracteristicas.split(",").map((item) => item.trim()))
      }

      // Actualizar el servicio - Pasamos la función getDb de db
      const result = await db.serviciosRepo.actualizar(
        {
          id: req.params.id,
          titulo,
          descripcion_corta,
          descripcion_completa,
          precio,
          precio_desde,
          imagen_url,
          icono,
          caracteristicas,
          destacado: Number.parseInt(destacado),
          orden: Number.parseInt(orden),
        },
        db.getDb,
      )

      if (result.success) {
        res.json({ success: true, message: "Servicio actualizado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al actualizar servicio con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al actualizar el servicio" })
    }
  })

  // API para eliminar un servicio
  app.delete("/api/servicios/:id", isAuthenticated, async (req, res) => {
    try {
      // Obtener el servicio para poder eliminar la imagen
      const servicio = await db.serviciosRepo.getById(req.params.id)
      if (!servicio) {
        return res.status(404).json({ success: false, message: "Servicio no encontrado" })
      }

      // Eliminar el servicio - Pasamos la función getDb de db
      const result = await db.serviciosRepo.eliminar(req.params.id, db.getDb)

      if (result.success) {
        // Eliminar la imagen si existe y no es la predeterminada
        if (
          servicio.imagen_url &&
          !servicio.imagen_url.includes("placeholder") &&
          fs.existsSync(path.join(__dirname, "../public", servicio.imagen_url))
        ) {
          fs.unlinkSync(path.join(__dirname, "../public", servicio.imagen_url))
        }

        res.json({ success: true, message: "Servicio eliminado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al eliminar servicio con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al eliminar el servicio" })
    }
  })
}
