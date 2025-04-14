/**
 * Rutas para la gestión de reseñas
 */

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
    const uploadDir = path.join(__dirname, "../public/img/reviews")

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "review-" + uniqueSuffix + ext)
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

export default function configureResenasRoutes(app, db) {
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Ruta para la página de gestión de reseñas (protegida)
  app.get("/dashboard/resenas", isAuthenticated, async (req, res) => {
    try {
      // Obtener todas las reseñas con detalles
      const resenas = await db.resenasRepo.getAllWithDetails()

      // Obtener tipos de eventos para el formulario
      const tiposEventos = await db.tiposEventosRepo.getAll()

      res.render("dashboard/resenas", {
        title: "Gestión de Reseñas",
        resenas,
        tiposEventos,
        user: req.session.user,
        section: "resenas",
        layout: "dashboard-layout",
      })
    } catch (error) {
      console.error("Error al cargar la página de reseñas:", error)
      req.flash('error', 'Error al cargar la página de reseñas')
      res.status(500).send("Error al cargar la página de reseñas")
    }
  })

  // API para obtener una reseña específica
  app.get("/api/resenas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id
      const resena = await db.resenasRepo.getById(id)

      if (!resena) {
        return res.status(404).json({
          success: false,
          message: "Reseña no encontrada",
        })
      }

      res.json({
        success: true,
        resena,
      })
    } catch (error) {
      console.error("Error al obtener reseña:", error)
      res.status(500).json({
        success: false,
        message: "Error al obtener reseña",
        error: error.message,
      })
    }
  })

  // Función para validar formato de contrato
  function validarFormatoContrato(numeroContrato) {
    // Formato esperado: CONT-0000-000
    const regex = /^CONT-\d{4}-\d{3}$/
    return regex.test(numeroContrato)
  }

  // API para verificar formato de contrato y unicidad
  app.get("/api/contratos/verificar/:numeroContrato", isAuthenticated, async (req, res) => {
    try {
      const numeroContrato = req.params.numeroContrato
      
      // Verificar formato
      if (!validarFormatoContrato(numeroContrato)) {
        return res.json({
          success: false,
          message: "Formato inválido. Debe ser CONT-0000-000",
        })
      }
      
      // Verificar si ya existe una reseña con este contrato
      const resenaExistente = await db.resenasRepo.getByContrato(numeroContrato)
      
      if (resenaExistente) {
        return res.json({
          success: false,
          message: "Este contrato ya tiene una reseña asignada",
        })
      }
      
      res.json({
        success: true,
        message: "Número de contrato válido",
      })
    } catch (error) {
      console.error("Error al verificar contrato:", error)
      res.status(500).json({
        success: false,
        message: "Error al verificar el número de contrato",
        error: error.message,
      })
    }
  })

  // API para crear una nueva reseña
  app.post("/api/resenas", isAuthenticated, async (req, res) => {
    try {
      const resenaDatos = req.body

      // Validar datos requeridos
      if (!resenaDatos.nombre_cliente || !resenaDatos.comentario || !resenaDatos.calificacion || !resenaDatos.tipo_evento_id) {
        return res.status(400).json({
          success: false,
          message: "Faltan datos requeridos",
        })
      }

      // Verificar formato de contrato si se proporcionó
      if (resenaDatos.numero_contrato) {
        if (!validarFormatoContrato(resenaDatos.numero_contrato)) {
          return res.status(400).json({
            success: false,
            message: "Formato de contrato inválido. Debe ser CONT-0000-000",
          })
        }
        
        // Verificar si ya existe una reseña con este contrato
        const resenaExistente = await db.resenasRepo.getByContrato(resenaDatos.numero_contrato)
        
        if (resenaExistente) {
          return res.status(400).json({
            success: false,
            message: "Este contrato ya tiene una reseña asignada",
          })
        }
      }

      // Formatear fecha para almacenamiento si viene en formato ISO
      if (resenaDatos.fecha && resenaDatos.fecha.includes('-')) {
        const fecha = new Date(resenaDatos.fecha)
        resenaDatos.fecha = fecha.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      }

      // Convertir aprobada a verificado
      resenaDatos.verificado = resenaDatos.aprobada ? 1 : 0
      
      // Asegurar que imagenes sea un JSON válido
      if (!resenaDatos.imagenes) {
        resenaDatos.imagenes = "[]"
      } else if (typeof resenaDatos.imagenes === 'object') {
        resenaDatos.imagenes = JSON.stringify(resenaDatos.imagenes)
      }

      // Crear la reseña
      const nuevaResena = await db.resenasRepo.create(resenaDatos)

      console.log("Nueva reseña creada:", nuevaResena)

      res.status(201).json({
        success: true,
        message: "Reseña creada correctamente",
        resena: nuevaResena,
      })
    } catch (error) {
      console.error("Error al crear reseña:", error)
      res.status(500).json({
        success: false,
        message: "Error al crear reseña",
        error: error.message,
      })
    }
  })

  // API para actualizar una reseña existente
  app.put("/api/resenas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id
      const resenaDatos = req.body

      // Validar datos requeridos
      if (!resenaDatos.nombre_cliente || !resenaDatos.comentario || !resenaDatos.calificacion || !resenaDatos.tipo_evento_id) {
        return res.status(400).json({
          success: false,
          message: "Faltan datos requeridos",
        })
      }

      // Obtener la reseña actual para comparar
      const resenaActual = await db.resenasRepo.getById(id)
      if (!resenaActual) {
        return res.status(404).json({
          success: false,
          message: "Reseña no encontrada",
        })
      }

      // Verificar formato de contrato si se proporcionó
      if (resenaDatos.numero_contrato) {
        if (!validarFormatoContrato(resenaDatos.numero_contrato)) {
          return res.status(400).json({
            success: false,
            message: "Formato de contrato inválido. Debe ser CONT-0000-000",
          })
        }
        
        // Si el número de contrato cambió, verificar que no esté asignado a otra reseña
        if (resenaDatos.numero_contrato !== resenaActual.numero_contrato) {
          const resenaExistente = await db.resenasRepo.getByContrato(resenaDatos.numero_contrato)
          
          if (resenaExistente && resenaExistente.id !== parseInt(id)) {
            return res.status(400).json({
              success: false,
              message: "Este contrato ya tiene una reseña asignada",
            })
          }
        }
      }

      // Formatear fecha para almacenamiento si viene en formato ISO
      if (resenaDatos.fecha && resenaDatos.fecha.includes('-')) {
        const fecha = new Date(resenaDatos.fecha)
        resenaDatos.fecha = fecha.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      }

      // Convertir aprobada a verificado
      resenaDatos.verificado = resenaDatos.aprobada ? 1 : 0
      
      // Asegurar que imagenes sea un JSON válido
      if (!resenaDatos.imagenes) {
        resenaDatos.imagenes = "[]"
      } else if (typeof resenaDatos.imagenes === 'object') {
        resenaDatos.imagenes = JSON.stringify(resenaDatos.imagenes)
      }

      // Actualizar la reseña
      const resenaActualizada = await db.resenasRepo.update(id, resenaDatos)


      res.json({
        success: true,
        message: "Reseña actualizada correctamente",
        resena: resenaActualizada,
      })
    } catch (error) {
      console.error("Error al actualizar reseña:", error)
      res.status(500).json({
        success: false,
        message: "Error al actualizar reseña",
        error: error.message,
      })
    }
  })

  // API para eliminar una reseña
  app.delete("/api/resenas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id

      // Verificar que la reseña exista
      const resena = await db.resenasRepo.getById(id)
      if (!resena) {
        return res.status(404).json({
          success: false,
          message: "Reseña no encontrada",
        })
      }

      // Eliminar la reseña
      await db.resenasRepo.delete(id)

      res.json({
        success: true,
        message: "Reseña eliminada correctamente",
      })
    } catch (error) {
      console.error("Error al eliminar reseña:", error)
      res.status(500).json({
        success: false,
        message: "Error al eliminar reseña",
        error: error.message,
      })
    }
  })

  // API para aprobar una reseña
  app.post("/api/resenas/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id

      // Verificar que la reseña exista
      const resena = await db.resenasRepo.getById(id)
      if (!resena) {
        return res.status(404).json({
          success: false,
          message: "Reseña no encontrada",
        })
      }

      // Aprobar la reseña
      await db.resenasRepo.approve(id)

      res.json({
        success: true,
        message: "Reseña aprobada correctamente",
      })
    } catch (error) {
      console.error("Error al aprobar reseña:", error)
      res.status(500).json({
        success: false,
        message: "Error al aprobar reseña",
        error: error.message,
      })
    }
  })

  // API para desaprobar una reseña
  app.post("/api/resenas/:id/disapprove", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id

      // Verificar que la reseña exista
      const resena = await db.resenasRepo.getById(id)
      if (!resena) {
        return res.status(404).json({
          success: false,
          message: "Reseña no encontrada",
        })
      }

      // Desaprobar la reseña
      await db.resenasRepo.disapprove(id)

      res.json({
        success: true,
        message: "Reseña desaprobada correctamente",
      })
    } catch (error) {
      console.error("Error al desaprobar reseña:", error)
      res.status(500).json({
        success: false,
        message: "Error al desaprobar reseña",
        error: error.message,
      })
    }
  })

  // API pública para obtener reseñas aprobadas
  app.get("/api/public/resenas", async (req, res) => {
    try {
      const limit = req.query.limit ? Number.parseInt(req.query.limit) : 6

      // Obtener reseñas aprobadas
      const resenas = await db.resenasRepo.getApprovedReviews(limit)

      res.json({
        success: true,
        resenas,
      })
    } catch (error) {
      console.error("Error al obtener reseñas públicas:", error)
      res.status(500).json({
        success: false,
        message: "Error al obtener reseñas",
        error: error.message,
      })
    }
  })
}