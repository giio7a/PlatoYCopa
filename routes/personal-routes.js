/**
 * Rutas para la gestión del personal (equipo)
 */

import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import { sanitizeInput } from "../utils/validation.js"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar la carpeta de destino para imágenes del equipo
    const uploadPath = path.join(__dirname, "../public/uploads/team")

    // Asegurarse de que la carpeta existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }

    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Solo se permiten imágenes"))
    }
  },
})

export default function configurePersonalRoutes(app, db) {
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Middleware para verificar rol de administrador
  const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.rol === "admin") {
      return next()
    }
    res.status(403).render("error", {
      layout: "main",
      title: "Acceso Denegado",
      error: "No tienes permisos para acceder a esta página",
    })
  }

  // Crear un router para las rutas de personal
  const router = express.Router()

  // Middleware para procesar JSON
  router.use(express.json())

  // Ruta para la página principal de gestión de personal
  router.get("/", isAuthenticated, async (req, res) => {
    try {
      const miembrosEquipo = await db.equipoRepo.getAll()

      // Obtener cargos únicos para los filtros
      const cargosUnicos = []
      miembrosEquipo.forEach((miembro) => {
        const cargo = miembro.posicion || miembro.cargo
        if (cargo && !cargosUnicos.includes(cargo)) {
          cargosUnicos.push(cargo)
        }
      })

      res.render("dashboard/personal", {
        title: "Gestión de Personal | Dashboard",
        user: req.session.user,
        miembrosEquipo,
        cargosUnicos,
        layout: "dashboard-layout",
        active: "personal",
      })
    } catch (error) {
      console.error("Error al cargar gestión de personal:", error)
      res.status(500).render("error", {
        message: "Error al cargar gestión de personal",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "dashboard-layout",
      })
    }
  })

  // API para obtener todos los miembros del equipo
  router.get("/api/miembros", isAuthenticated, async (req, res) => {
    try {
      const miembrosEquipo = await db.equipoRepo.getAll()
      res.json({ success: true, miembros: miembrosEquipo })
    } catch (error) {
      console.error("Error al obtener miembros del equipo:", error)
      res.status(500).json({
        success: false,
        message: "Error al obtener miembros del equipo",
      })
    }
  })

  // API para obtener un miembro del equipo por ID
  router.get("/api/miembros/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id
      const miembro = await db.equipoRepo.getById(id)

      if (!miembro) {
        return res.status(404).json({
          success: false,
          message: "Miembro del equipo no encontrado",
        })
      }

      // Ensure we have consistent field names
      const miembroNormalizado = {
        id: miembro.id,
        nombre: miembro.nombre,
        posicion: miembro.posicion || miembro.cargo,
        bio: miembro.bio || miembro.descripcion,
        imagen: miembro.imagen || miembro.foto_url,
        orden: miembro.orden || 0,
        redes_sociales: miembro.redes_sociales || "{}",
        fecha_creacion: miembro.fecha_creacion,
      }

      res.json({ success: true, miembro: miembroNormalizado })
    } catch (error) {
      console.error(`Error al obtener miembro del equipo con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al obtener miembro del equipo",
      })
    }
  })

  // API para crear un nuevo miembro del equipo
  router.post("/api/miembros", isAuthenticated, upload.single("foto"), async (req, res) => {
    try {
      const { nombre, cargo, descripcion, orden, redes_sociales } = req.body

      // Validate data
      if (!nombre || !cargo) {
        return res.status(400).json({
          success: false,
          message: "El nombre y la posición son obligatorios",
        })
      }

      // Sanitize data
      const miembroData = {
        nombre: sanitizeInput(nombre),
        cargo: sanitizeInput(cargo),
        descripcion: sanitizeInput(descripcion || ""),
        orden: orden ? Math.max(0, Number.parseInt(orden, 10)) : 0, // Asegurar que el orden no sea negativo
        redes_sociales: redes_sociales || "{}",
      }

      // If an image was uploaded, add it to the data
      if (req.file) {
        miembroData.foto_url = `/uploads/team/${req.file.filename}`
      }

      console.log("Datos para crear miembro:", miembroData)

      // Create team member
      const result = await db.equipoRepo.crear(miembroData)

      if (result.success) {
        res.json({
          success: true,
          id: result.id,
          message: "Miembro del equipo creado exitosamente",
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "Error al crear miembro del equipo",
        })
      }
    } catch (error) {
      console.error("Error al crear miembro del equipo:", error)
      res.status(500).json({
        success: false,
        message: "Error al crear miembro del equipo: " + error.message,
      })
    }
  })

  // API para actualizar un miembro del equipo
  router.put("/api/miembros/:id", isAuthenticated, upload.single("foto"), async (req, res) => {
    try {
      const id = req.params.id
      const { nombre, cargo, descripcion, orden, redes_sociales } = req.body

      console.log("Datos recibidos para actualizar:", { id, nombre, cargo, descripcion, orden, redes_sociales })

      // Validate data
      if (!nombre || !cargo) {
        return res.status(400).json({
          success: false,
          message: "El nombre y la posición son obligatorios",
        })
      }

      // Sanitize data
      const miembroData = {
        nombre: sanitizeInput(nombre),
        cargo: sanitizeInput(cargo), // Use cargo for database field
        descripcion: sanitizeInput(descripcion || ""), // Use descripcion for database field
        orden: orden ? Math.max(0, Number.parseInt(orden, 10)) : 0, // Asegurar que el orden no sea negativo
        redes_sociales: redes_sociales || "{}",
      }

      // If an image was uploaded, add it to the data
      if (req.file) {
        miembroData.foto_url = `/uploads/team/${req.file.filename}` // Use foto_url for database field
      }

      console.log("Datos procesados para actualizar:", miembroData)

      // Update team member
      const result = await db.equipoRepo.actualizar(id, miembroData)

      if (result.success) {
        res.json({
          success: true,
          message: "Miembro del equipo actualizado exitosamente",
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "Error al actualizar miembro del equipo",
        })
      }
    } catch (error) {
      console.error(`Error al actualizar miembro del equipo con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al actualizar miembro del equipo: " + error.message,
      })
    }
  })

  // API para eliminar un miembro del equipo
  router.delete("/api/miembros/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id

      console.log(`Solicitud para eliminar miembro con ID: ${id}`)

      // Eliminar miembro del equipo
      const result = await db.equipoRepo.eliminar(id)

      console.log(`Resultado de eliminación:`, result)

      if (result.success) {
        res.json({
          success: true,
          message: "Miembro del equipo eliminado exitosamente",
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "Error al eliminar miembro del equipo",
        })
      }
    } catch (error) {
      console.error(`Error al eliminar miembro del equipo con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al eliminar miembro del equipo: " + error.message,
      })
    }
  })

  // API para cambiar el orden de un miembro del equipo
  router.put("/api/miembros/:id/orden", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id
      const { orden } = req.body

      if (orden === undefined) {
        return res.status(400).json({
          success: false,
          message: "El orden es obligatorio",
        })
      }

      // Asegurar que el orden no sea negativo
      const ordenValue = Math.max(0, Number.parseInt(orden, 10))

      // Actualizar orden
      const result = await db.equipoRepo.actualizarOrden(id, ordenValue)

      if (result.success) {
        res.json({
          success: true,
          message: "Orden actualizado exitosamente",
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "Error al actualizar orden",
        })
      }
    } catch (error) {
      console.error(`Error al actualizar orden del miembro con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al actualizar orden: " + error.message,
      })
    }
  })

  // Configurar rutas
  app.use("/dashboard/personal", router)
  // Registrar explícitamente las rutas API
  app.use("/dashboard/personal/api", router)
}

