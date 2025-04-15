/**
 * Rutas para la gestión del perfil de usuario
 */

import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import bcrypt from "bcrypt"
import { sanitizeInput, isValidEmail, isValidPassword } from "../utils/validation.js"
import fs from "fs"
import { createUploader } from "../utils/cloudinary.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración de Cloudinary para subida de archivos
const upload = createUploader("profiles")

export default function configurePerfilRoutes(app, db) {
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Crear un router para las rutas de perfil
  const router = express.Router()

  // Middleware para procesar JSON
  router.use(express.json())

  // Ruta para la página de perfil
  router.get("/", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id
      const user = await db.usuariosRepo.getById(userId)

      // Obtener actividades del usuario (si existe un repositorio para ello)
      const actividades = []
      // Si tienes un repositorio de actividades, podrías usarlo así:
      // const actividades = await db.actividadesRepo.getByUserId(userId, 10)

      res.render("dashboard/perfil", {
        title: "Mi Perfil | Dashboard",
        user:  req.session.user,
        usuario: user,
        actividades,
        layout: "dashboard-layout",
        active: "perfil",
      })
    } catch (error) {
      console.error("Error al cargar perfil:", error)
      res.status(500).render("error", {
        message: "Error al cargar perfil",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "dashboard-layout",
      })
    }
  })

  // API para actualizar perfil
  router.post("/actualizar", isAuthenticated, upload.single("profile_image"), async (req, res) => {
    try {
      const userId = req.session.user.id
      const { nombre, email, telefono } = req.body

      // Validar datos
      if (!nombre || !email) {
        return res.status(400).json({
          success: false,
          message: "El nombre y el email son obligatorios",
        })
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "El email no es válido",
        })
      }

      // Verificar si el email ya está en uso por otro usuario
      if (email !== req.session.user.email) {
        const existingUser = await db.usuariosRepo.getByEmail(email)
        if (existingUser && Number(existingUser.id) !== Number(userId)) {
          return res.status(400).json({
            success: false,
            message: "El correo electrónico ya está registrado por otro usuario",
          })
        }
      }

      // Sanitizar datos
      const userData = {
        nombre: sanitizeInput(nombre),
        email: sanitizeInput(email),
        telefono: sanitizeInput(telefono || ""),
      }

      // Si se subió una imagen, añadirla a los datos
      if (req.file) {
        userData.imagen_url = req.file.path
      }

      // Actualizar usuario
      const result = await db.usuariosRepo.actualizarUsuario(userId, userData)

      if (result.success) {
        // Obtener el usuario actualizado para asegurar que tenemos todos los datos
        const updatedUser = await db.usuariosRepo.getById(userId)

        // Actualizar datos de sesión
        req.session.user = {
          ...req.session.user,
          nombre: userData.nombre,
          email: userData.email,
          telefono: userData.telefono,
          imagen: req.file ? userData.imagen_url : updatedUser.imagen_url || req.session.user.imagen,
        }

        // Guardar la sesión para asegurar que los cambios persistan
        req.session.save((err) => {
          if (err) {
            console.error("Error al guardar la sesión:", err)
          }

          res.json({
            success: true,
            message: "Perfil actualizado correctamente",
          })
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "No se pudo actualizar el perfil",
        })
      }
    } catch (error) {
      console.error("Error al actualizar perfil:", error)
      res.status(500).json({
        success: false,
        message: "Error al actualizar perfil",
      })
    }
  })

  // API para cambiar contraseña
  router.post("/cambiar-password", isAuthenticated, express.json(), async (req, res) => {
    try {
      const userId = req.session.user.id
      const { current_password, new_password, confirm_password } = req.body

      console.log("Datos recibidos para cambio de contraseña:", {
        current_password: !!current_password,
        new_password: !!new_password,
        confirm_password: !!confirm_password,
      })

      // Validar datos
      if (!current_password || !new_password || !confirm_password) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos son obligatorios",
        })
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: "Las contraseñas no coinciden",
        })
      }

      if (!isValidPassword(new_password)) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
        })
      }

      // Obtener usuario actual
      const user = await db.usuariosRepo.getById(userId)

      // Verificar contraseña actual
      const passwordMatch = await bcrypt.compare(current_password, user.password)
      if (!passwordMatch) {
        return res.status(400).json({
          success: false,
          message: "La contraseña actual es incorrecta",
        })
      }

      // Actualizar contraseña
      const result = await db.usuariosRepo.actualizarPassword(userId, new_password)

      if (result.success) {
        res.json({
          success: true,
          message: "Contraseña actualizada correctamente",
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "No se pudo actualizar la contraseña",
        })
      }
    } catch (error) {
      console.error("Error al cambiar contraseña:", error)
      res.status(500).json({
        success: false,
        message: "Error al cambiar contraseña: " + error.message,
      })
    }
  })

  // API para actualizar avatar
  router.post("/actualizar-avatar", isAuthenticated, upload.single("profile_image"), async (req, res) => {
    try {
      const userId = req.session.user.id

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No se ha seleccionado ninguna imagen",
        })
      }

      // Preparar datos para actualizar
      const userData = {
        imagen_url: req.file.path,
      }

      // Actualizar usuario
      const result = await db.usuariosRepo.actualizarUsuario(userId, userData)

      if (result.success) {
        // Actualizar datos de sesión
        req.session.user = {
          ...req.session.user,
          imagen: userData.imagen_url,
        }

        // Guardar la sesión para asegurar que los cambios persistan
        req.session.save((err) => {
          if (err) {
            console.error("Error al guardar la sesión:", err)
          }

          res.json({
            success: true,
            message: "Avatar actualizado correctamente",
            imagen: userData.imagen_url,
          })
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "No se pudo actualizar el avatar",
        })
      }
    } catch (error) {
      console.error("Error al actualizar avatar:", error)
      res.status(500).json({
        success: false,
        message: "Error al actualizar avatar",
      })
    }
  })

  // API para eliminar cuenta
  router.post("/eliminar-cuenta", isAuthenticated, express.json(), async (req, res) => {
    try {
      const userId = req.session.user.id
      const { password } = req.body

      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Debes proporcionar tu contraseña para eliminar la cuenta",
        })
      }

      // Obtener usuario actual
      const user = await db.usuariosRepo.getById(userId)

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, user.password)
      if (!passwordMatch) {
        return res.status(400).json({
          success: false,
          message: "La contraseña es incorrecta",
        })
      }

      // Eliminar usuario
      const result = await db.usuariosRepo.eliminarUsuario(userId)

      if (result.success) {
        // Destruir sesión
        req.session.destroy()

        res.json({
          success: true,
          message: "Cuenta eliminada correctamente",
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "No se pudo eliminar la cuenta",
        })
      }
    } catch (error) {
      console.error("Error al eliminar cuenta:", error)
      res.status(500).json({
        success: false,
        message: "Error al eliminar cuenta",
      })
    }
  })

  // Configurar rutas
  app.use("/dashboard/perfil", router)
}