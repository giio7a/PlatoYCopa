/**
 * Rutas para la gestión de usuarios
 */

import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import bcrypt from "bcrypt"
import { sanitizeInput, isValidEmail, isValidPassword } from "../utils/validation.js"
import nodemailer from "nodemailer"
import { createUploader } from "../utils/cloudinary.js"
import {
  sendAccountCreationEmail,
  sendAccountModificationEmail,
  sendAccountActivationEmail,
  sendAccountDeactivationEmail,
  sendAccountDeletionEmail,
  sendPasswordChangeNotificationEmail
} from "../utils/email-service.js";
import { is } from "date-fns/locale"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración de Cloudinary para subida de archivos
const upload = createUploader("profiles")

export default function configureUsuariosRoutes(app, db) {
  // Configuración de Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "platoycopa.oficial@gmail.com",
      pass: process.env.EMAIL_PASS || "hjxs qukq pooq ytxr",
    },
  })

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

  // Crear un router para las rutas de usuarios
  const router = express.Router()

  // Ruta para la página de gestión de usuarios
  router.get("/", isAuthenticated, async (req, res) => {
    try {
      const usuarios = await db.usuariosRepo.getAll()
      const roles = await db.usuariosRepo.getAllRoles()

      res.render("dashboard/usuarios", {
        title: "Gestión de Usuarios | Dashboard",
        user: req.session.user,
        usuarios: usuarios,
        roles,
        layout: "dashboard-layout",
        active: "usuarios",
      })
    } catch (error) {
      console.error("Error al cargar gestión de usuarios:", error)
      res.status(500).render("error", {
        message: "Error al cargar gestión de usuarios",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "dashboard-layout",
      })
    }
  })

  // API para obtener todos los usuarios
  app.get("/dashboard/usuarios/api/usuarios", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const usuarios = await db.usuariosRepo.getAll()

      // Asegurarse de que todos los usuarios tengan el campo activo
      const usuariosConActivo = usuarios.map((usuario) => ({
        ...usuario,
        activo: usuario.activo !== undefined ? usuario.activo : 1,
      }))

      res.json({ success: true, usuarios: usuariosConActivo })
    } catch (error) {
      console.error("Error al obtener usuarios:", error)
      res.status(500).json({
        success: false,
        message: "Error al obtener usuarios",
      })
    }
  })

  // API para obtener un usuario por ID
  app.get("/dashboard/usuarios/api/usuarios/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = req.params.id
      console.log(`Obteniendo usuario con ID: ${id}`)

      const usuario = await db.usuariosRepo.getById(id)

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      // Asegurarse de que el usuario tenga el campo activo
      const usuarioConActivo = {
        ...usuario,
        activo: usuario.activo !== undefined ? usuario.activo : 1,
        telefono: usuario.telefono || "",
        imagen_url: usuario.imagen_url || null,
      }

      console.log("Usuario obtenido:", usuarioConActivo) // Log para depuración

      res.json({ success: true, usuario: usuarioConActivo })
    } catch (error) {
      console.error(`Error al obtener usuario con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al obtener usuario",
      })
    }
  })

  // API para crear un nuevo usuario
  app.post("/dashboard/usuarios/api/usuarios", isAuthenticated, isAdmin, upload.single("profile_image"), async (req, res) => {
    try {
      console.log("Recibida solicitud para crear usuario:", req.body)

      const { nombre, email, password, rol, telefono } = req.body
      const activo =
        req.body.activo === "1" || req.body.activo === true || req.body.activo === 1 || req.body.activo === "on" ? 1 : 0

      // Validar solo los campos obligatorios
      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: "El nombre es obligatorio",
        })
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "El email es obligatorio",
        })
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "El email no es válido",
        })
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message: "La contraseña es obligatoria",
        })
      }

      if (!isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
        })
      }

      if (!rol) {
        return res.status(400).json({
          success: false,
          message: "El rol es obligatorio",
        })
      }

      // Verificar si el usuario ya existe
      const existingUser = await db.usuariosRepo.getByEmail(email)
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "El correo electrónico ya está registrado",
        })
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10)

      // Preparar datos del usuario
      const userData = {
        nombre: sanitizeInput(nombre),
        email: sanitizeInput(email),
        password: hashedPassword,
        rol: sanitizeInput(rol),
        activo: activo,
        telefono: sanitizeInput(telefono || ""),
        fecha_creacion: new Date().toISOString(),
      }

      // Si se subió una imagen, añadirla a los datos - Ahora usamos la URL de Cloudinary
      if (req.file) {
        userData.imagen_url = req.file.path
        console.log("Imagen subida:", userData.imagen_url)
      }

      console.log("Datos procesados para crear usuario:", userData)

      // Crear usuario
      const result = await db.usuariosRepo.crearUsuario(userData)

      if (result.success) {
        console.log(`Usuario creado exitosamente con ID: ${result.id}`);
  
        // Enviar email de notificación de creación de cuenta
        try {
          await sendAccountCreationEmail({
            to: userData.email,
            nombreUsuario: userData.nombre,
            // Se asume que el usuario que realiza la acción es el que se encuentra en sesión
            createdBy: req.session.user ? req.session.user.nombre : "Sistema",
          });
        } catch (emailError) {
          console.error("Error al enviar notificación de creación:", emailError);
        }
  
        return res.json({
          success: true,
          id: result.id,
          message: "Usuario creado exitosamente",
        });
      } else {
        throw new Error(result.message || "Error al crear usuario")
      }
    } catch (error) {
      console.error("Error al crear usuario:", error)
      res.status(500).json({
        success: false,
        message: "Error al crear usuario: " + error.message,
      })
    }
  })

  // API para actualizar un usuario
  app.put("/dashboard/usuarios/api/usuarios/:id", isAuthenticated, isAdmin, upload.single("profile_image"), async (req, res) => {
    try {
      console.log("Recibida solicitud para actualizar usuario:", req.params.id, req.body);
      const { id } = req.params;
      const { nombre, email, rol, activo, telefono, password } = req.body;
  
      // Validar datos obligatorios
      if (!nombre || !email || !rol) {
        return res.status(400).json({
          success: false,
          message: "Nombre, email y rol son obligatorios",
        });
      }
  
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "El email no es válido",
        });
      }
  
      // Verificar si el email ya está en uso por otro usuario
      if (email) {
        const existingUser = await db.usuariosRepo.getByEmail(email);
        if (existingUser && Number(existingUser.id) !== Number(id)) {
          return res.status(400).json({
            success: false,
            message: "El correo electrónico ya está registrado por otro usuario",
          });
        }
      }
      
      // Obtener los datos originales del usuario para comparar cambios
      const originalUser = await db.usuariosRepo.getById(id);
      if (!originalUser) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }
      
      // Preparar datos para actualizar
      const userData = {
        nombre: sanitizeInput(nombre),
        email: sanitizeInput(email),
        rol: sanitizeInput(rol),
        activo: activo === "1" || activo === true || activo === 1 ? 1 : 0,
        telefono: sanitizeInput(telefono || ""),
      };
  
      // Si se subió una imagen, añadirla a los datos - Ahora usamos la URL de Cloudinary
      if (req.file) {
        userData.imagen_url = req.file.path;
        console.log("Imagen actualizada:", userData.imagen_url);
      }
  
      // Actualizar usuario
      const result = await db.usuariosRepo.actualizarUsuario(id, userData);
  
      // Si se proporcionó una nueva contraseña, actualizarla
      if (password && password.trim() !== "") {
        if (!isValidPassword(password)) {
          return res.status(400).json({
            success: false,
            message: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
          });
        }
        await db.usuariosRepo.actualizarPassword(id, password);
      }
  
      // Si la actualización fue exitosa, determinar qué campos cambiaron
      if (result.success) {
        // Construir un arreglo con las diferencias encontradas
        const modifiedFields = [];
        if (sanitizeInput(nombre) !== originalUser.nombre) {
          modifiedFields.push(`Nombre: "${originalUser.nombre}" → "${nombre}"`);
        }
        if (sanitizeInput(email) !== originalUser.email) {
          modifiedFields.push(`Email: "${originalUser.email}" → "${email}"`);
        }
        if (sanitizeInput(rol) !== originalUser.rol) {
          modifiedFields.push(`Rol: "${originalUser.rol}" → "${rol}"`);
        }
        if ((activo === "1" || activo === true || activo === 1 ? 1 : 0) !== (originalUser.activo || 1)) {
          modifiedFields.push(`Estado: "${originalUser.activo ? "Activo" : "Inactivo"}" → "${activo ? "Activo" : "Inactivo"}"`);
        }
        if (sanitizeInput(telefono || "") !== (originalUser.telefono || "")) {
          modifiedFields.push(`Teléfono: "${originalUser.telefono || "N/D"}" → "${telefono || "N/D"}"`);
        }
        if (req.file && originalUser.imagen_url !== userData.imagen_url) {
          modifiedFields.push(`Imagen de perfil actualizada`);
        }
        if (password && password.trim() !== "") {
          modifiedFields.push(`Contraseña actualizada`);
        }
  
        // Enviar email de notificación al usuario modificado
        // Se asume que el usuario afectado recibe notificaciones a su email registrado
        try {
          const emailResponse = await sendAccountModificationEmail({
            to: userData.email, // o puedes usar originalUser.email
            nombreUsuario: userData.nombre,
            modifiedBy: req.session.user ? req.session.user.nombre : "Sistema",
            modifiedFields,
          });
          if (!emailResponse.success) {
            console.error("Error al enviar notificación de modificación:", emailResponse.error);
          }
        } catch (emailError) {
          console.error("Error al enviar correo de notificación:", emailError);
        }
  
        return res.json({
          success: true,
          message: "Usuario actualizado exitosamente",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error(`Error al actualizar usuario con ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: "Error al actualizar usuario",
      });
    }
  });

  // API para activar un usuario
  app.post("/dashboard/usuarios/api/usuarios/:id/activate", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = req.params.id
      console.log(`Solicitud para activar usuario con ID: ${id}`)

      const result = await db.usuariosRepo.activarUsuario(id)
      console.log(`Resultado de activación:`, result)

      if (result.success) {
         // Enviar email de notificación de activación
          try {
             // Obtener datos del usuario (por ejemplo, mediante db.usuariosRepo.getById(id))
        const usuario = await db.usuariosRepo.getById(id);
            await sendAccountActivationEmail({
              to: usuario.email,           // se asume que 'usuario' es el objeto obtenido del repositorio
              nombreUsuario: usuario.nombre,
              modifiedBy: req.session.user ? req.session.user.nombre : "Sistema",
            });
          } catch (emailError) {
            console.error("Error al enviar notificación de activación:", emailError);
          }
          
          res.json({
            success: true,
            message: "Usuario activado exitosamente",
          });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "No se pudo activar el usuario",
        })
      }
    } catch (error) {
      console.error(`Error al activar usuario con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al activar usuario: " + error.message,
      })
    }
  })

  // API para desactivar un usuario
  app.post("/dashboard/usuarios/api/usuarios/:id/deactivate", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = req.params.id
      console.log(`Solicitud para desactivar usuario con ID: ${id}`)

      const result = await db.usuariosRepo.desactivarUsuario(id)
      console.log(`Resultado de desactivación:`, result)

      if (result.success) {
        // Obtener datos del usuario (por ejemplo, mediante db.usuariosRepo.getById(id))
        const usuario = await db.usuariosRepo.getById(id);
        
        // Enviar email de notificación de desactivación
        try {
          await sendAccountDeactivationEmail({
            to: usuario.email,
            nombreUsuario: usuario.nombre,
            modifiedBy: req.session.user ? req.session.user.nombre : "Sistema",
          });
        } catch (emailError) {
          console.error("Error al enviar notificación de desactivación:", emailError);
        }
        
        res.json({
          success: true,
          message: "Usuario desactivado exitosamente",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "No se pudo desactivar el usuario",
        })
      }
    } catch (error) {
      console.error(`Error al desactivar usuario con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al desactivar usuario: " + error.message,
      })
    }
  })

  // API para eliminar un usuario
  app.delete("/dashboard/usuarios/api/usuarios/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = req.params.id
      console.log(`Solicitud para eliminar usuario con ID: ${id}`)

      // Verificar que no sea el usuario actual
      if (req.session.user && req.session.user.id == id) {
        return res.status(400).json({
          success: false,
          message: "No puedes eliminar tu propio usuario",
        })
      }

      const usuarioOriginal = await db.usuariosRepo.getById(id);

      const result = await db.usuariosRepo.eliminarUsuario(id)
      console.log(`Resultado de eliminación:`, result)

      if (result.success) {
        // Obtener datos del usuario antes de eliminarlo, o bien si se conservó algún dato previamente
        // Por ejemplo: usuarioOriginal
        try {
           // Obtener datos del usuario (por ejemplo, mediante db.usuariosRepo.getById(id))
          await sendAccountDeletionEmail({
            to: usuarioOriginal.email, // Se debe obtener el email antes de eliminar el registro
            nombreUsuario: usuarioOriginal.nombre,
            modifiedBy: req.session.user ? req.session.user.nombre : "Sistema",
          });
        } catch (emailError) {
          console.error("Error al enviar notificación de eliminación:", emailError);
        }
        
        res.json({
          success: true,
          message: "Usuario eliminado exitosamente",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "No se pudo eliminar el usuario",
        })
      }
    } catch (error) {
      console.error(`Error al eliminar usuario con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al eliminar usuario: " + error.message,
      })
    }
  })

  // API para restablecer contraseña
  app.post("/dashboard/usuarios/api/usuarios/:id/reset-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = req.params.id
      const { new_password, confirm_new_password, notify_user } = req.body

      // Validar datos
      if (new_password !== confirm_new_password) {
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

      // Obtener datos del usuario
      const usuario = await db.usuariosRepo.getById(id)

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      // Actualizar contraseña
      const result = await db.usuariosRepo.actualizarPassword(id, new_password)

      if (result.success) {
        if (notify_user === "1" || notify_user === true || notify_user === 1) {
          try {
            await sendPasswordChangeNotificationEmail({
              to: usuario.email,
              nombreUsuario: usuario.nombre,
              modifiedBy: req.session.user ? req.session.user.nombre : "Sistema",
              newPassword : new_password, // nueva contraseña a notificar
            });
          } catch (emailError) {
            console.error("Error al enviar notificación de cambio de contraseña:", emailError);
          }
        }
      
        res.json({
          success: true,
          message: "Contraseña restablecida exitosamente",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        })
      }
    } catch (error) {
      console.error(`Error al restablecer contraseña del usuario con ID ${req.params.id}:`, error)
      res.status(500).json({
        success: false,
        message: "Error al restablecer contraseña",
      })
    }
  })

  // Función para enviar correo de restablecimiento de contraseña
  async function sendPasswordResetEmail({ email, nombre, newPassword }) {
    try {
      const mailOptions = {
        from: "Plato y Copa <platoycopa.oficial@gmail.com>",
        to: email,
        subject: "Nueva Contraseña - Plato y Copa",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #E5C76B;">Nueva Contraseña</h2>
            </div>
            <p>Hola ${nombre},</p>
            <p>Tu contraseña ha sido restablecida. Tu nueva contraseña es:</p>
            <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${newPassword}
            </div>
            <p>Por favor, cambia tu contraseña después de iniciar sesión.</p>
            <p>Saludos,<br>Equipo de Plato y Copa</p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Correo de restablecimiento de contraseña enviado a:", email)
    } catch (error) {
      console.error("Error al enviar correo de restablecimiento de contraseña:", error)
      throw error // Re-lanza el error para que el controlador pueda manejarlo
    }
  }

  // Configurar rutas
  app.use("/dashboard/usuarios", isAdmin, isAuthenticated, router)
}