import bcrypt from "bcrypt"
import crypto from "crypto"
import { isValidEmail, isValidPassword, sanitizeInput } from "../utils/validation.js"

// Objeto para almacenar códigos de recuperación (en producción debería ser una base de datos)
const recoveryCodes = {}

export default function configureAuthRoutes(app, db) {
  // Ruta para mostrar el formulario de autenticación
  app.get("/auth", (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard")
    }
    res.render("authentication", {
      layout: "auth",
      title: "Iniciar Sesión | Plato y Copa",
      isLogin: true,
      error: req.query.error,
    })
  })

  // Ruta para procesar el login
  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body

      // Validar datos
      if (!email || !password) {
        return res.render("authentication", {
          layout: "auth",
          title: "Iniciar Sesión | Plato y Copa",
          isLogin: true,
          error: "Por favor, completa todos los campos",
        })
      }

      // Sanitizar datos
      const sanitizedEmail = sanitizeInput(email)

      // Verificar si el usuario existe
      const user = await db.usuariosRepo.getByEmail(sanitizedEmail)

      if (!user) {
        return res.render("authentication", {
          layout: "auth",
          title: "Iniciar Sesión | Plato y Copa",
          isLogin: true,
          error: "Correo electrónico o contraseña incorrectos",
        })
      }

      // Verificar que el usuario esté activo
      if (!user.activo) {
        return res.render("authentication", {
          layout: "auth",
          title: "Iniciar Sesión | Plato y Copa",
          isLogin: true,
          error: "Tu cuenta ha sido desactivada. Contacta al administrador.",
        })
      }

      // Verificar que el usuario tenga una contraseña
      if (!user.password) {
        console.error("Error: Usuario sin contraseña almacenada", {
          password: user.password,
          email: sanitizedEmail,
          userId: user.id,
        })
        return res.render("authentication", {
          layout: "auth",
          title: "Iniciar Sesión | Plato y Copa",
          isLogin: true,
          error: "Error en la autenticación. Contacte al administrador.",
        })
      }

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, user.password)

      if (!passwordMatch) {
        return res.render("authentication", {
          layout: "auth",
          title: "Iniciar Sesión | Plato y Copa",
          isLogin: true,
          error: "Correo electrónico o contraseña incorrectos",
        })
      }

      // Actualizar último acceso
      await db.usuariosRepo.actualizarUltimoAcceso(user.id)

      // Crear sesión
      req.session.user = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        imagen: user.imagen_url,
      }

      // Redireccionar al dashboard
      res.redirect("/dashboard")
    } catch (error) {
      console.error("Error en login:", error)
      res.render("authentication", {
        layout: "auth",
        title: "Iniciar Sesión | Plato y Copa",
        isLogin: true,
        error: "Error al iniciar sesión. Por favor, intenta nuevamente.",
      })
    }
  })

  // Ruta para procesar el registro
  app.post("/register", async (req, res) => {
    try {
      const { nombre, email, password, confirmPassword, telefono } = req.body

      // Validar datos
      if (!nombre || !email || !password || !confirmPassword) {
        return res.render("authentication", {
          layout: "auth",
          title: "Registro | Plato y Copa",
          isLogin: false,
          error: "Por favor, completa todos los campos obligatorios",
        })
      }

      if (password !== confirmPassword) {
        return res.render("authentication", {
          layout: "auth",
          title: "Registro | Plato y Copa",
          isLogin: false,
          error: "Las contraseñas no coinciden",
        })
      }

      if (!isValidEmail(email)) {
        return res.render("authentication", {
          layout: "auth",
          title: "Registro | Plato y Copa",
          isLogin: false,
          error: "El correo electrónico no es válido",
        })
      }

      if (!isValidPassword(password)) {
        return res.render("authentication", {
          layout: "auth",
          title: "Registro | Plato y Copa",
          isLogin: false,
          error: "La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una minúscula y un número",
        })
      }

      // Sanitizar datos
      const sanitizedData = {
        nombre: sanitizeInput(nombre),
        email: sanitizeInput(email),
        telefono: sanitizeInput(telefono || ""),
      }

      // Verificar si el usuario ya existe
      const existingUser = await db.usuariosRepo.getByEmail(sanitizedData.email)

      if (existingUser) {
        return res.render("authentication", {
          layout: "auth",
          title: "Registro | Plato y Copa",
          isLogin: false,
          error: "El correo electrónico ya está registrado",
        })
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10)

      // Crear usuario
      const nuevoUsuario = {
        nombre: sanitizedData.nombre,
        email: sanitizedData.email,
        password: hashedPassword,
        rol: "usuario",
        telefono: sanitizedData.telefono,
        fecha_creacion: new Date().toISOString(),
        activo: 1,
      }

      // Crear usuario
      const result = await db.usuariosRepo.crearUsuario(nuevoUsuario)

      if (result.success) {
        return res.render("authentication", {
          layout: "auth",
          title: "Iniciar Sesión | Plato y Copa",
          isLogin: true,
          success: "Registro exitoso. Ahora puedes iniciar sesión.",
        })
      } else {
        throw new Error(result.message || "Error al crear usuario")
      }
    } catch (error) {
      console.error("Error en registro:", error)
      res.render("authentication", {
        layout: "auth",
        title: "Registro | Plato y Copa",
        isLogin: false,
        error: "Error al registrar usuario. Por favor, intenta nuevamente.",
      })
    }
  })

  // Ruta para cerrar sesión
  app.get('/logout', (req, res, next) => {
    setTimeout(() => {
      req.session.destroy(err => {
        if (err) console.error('Error al destruir la sesión:', err)
      })
    }, 500)

    res.render('logout', {
      layout: 'dashboard-layout',
      title: 'Cerrando sesión | Plato y Copa'
    }, (err, html) => {
      if (err) return next(err)

      const redirectAfter = 3000
      const redirectTo = '/auth'
      const script = `
        <script>
          setTimeout(() => {
            window.location.href = '${redirectTo}'
          }, ${redirectAfter})
        </script>
      `

      const meta = `<meta http-equiv="refresh" content="${redirectAfter/1000};url=${redirectTo}">`
      html = html.replace('</head>', `${meta}</head>`)
                 .replace('</body>', `${script}</body>`)

      res.send(html)
    })
  })

  // Ruta para mostrar el formulario de recuperación de contraseña
  app.get('/password-recovery', (req, res) => {
    res.render('password-recovery', {
      layout: 'auth',
      title: 'Recuperar Contraseña | Plato y Copa',
      error: req.query.error,
      success: req.query.success
    })
  })

  // Ruta para procesar la solicitud de recuperación de contraseña
  app.post('/password-recovery', async (req, res) => {
    try {
      const email = req.query.email || req.body.email

      // Validar email
      if (!email || !isValidEmail(email)) {
        return res.render("password-recovery", {
          layout: "auth",
          title: "Recuperar Contraseña | Plato y Copa",
          error: "Por favor, ingresa un correo electrónico válido",
        })
      }

      // Sanitizar email
      const sanitizedEmail = sanitizeInput(email)

      // Verificar si el usuario existe
      const user = await db.usuariosRepo.getByEmail(sanitizedEmail)

      if (!user || !user.activo) {
        return res.render("password-recovery", {
          layout: "auth",
          title: "Recuperar Contraseña | Plato y Copa",
          success: "Si el correo existe en nuestra base de datos, recibirás un código de recuperación.",
        })
      }

      // Generar código de recuperación
      const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString()

      // Guardar código en memoria
      recoveryCodes[sanitizedEmail] = {
        code: recoveryCode,
        timestamp: Date.now(),
        attempts: 0,
      }

      // Enviar correo con código
      const mailOptions = {
        from: "Plato y Copa <platoycopa.oficial@gmail.com>",
        to: sanitizedEmail,
        subject: "Código de recuperación de contraseña",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #E5C76B;">Recuperación de Contraseña</h2>
            </div>
            <p>Hola,</p>
            <p>Has solicitado recuperar tu contraseña. Utiliza el siguiente código para continuar con el proceso:</p>
            <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${recoveryCode}
            </div>
            <p>Este código expirará en 15 minutos.</p>
            <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
            <p>Saludos,<br>Equipo de Plato y Copa</p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)

      res.redirect(`/verify-code?email=${encodeURIComponent(sanitizedEmail)}`)
    } catch (error) {
      console.error("Error al enviar código de recuperación:", error)
      res.render("password-recovery", {
        layout: "auth",
        title: "Recuperar Contraseña | Plato y Copa",
        error: "Error al enviar el código de recuperación. Por favor, intenta nuevamente.",
      })
    }
  })

  // Ruta para mostrar el formulario de verificación de código
  app.get('/verify-code', (req, res) => {
    const email = req.query.email
    
    if (!email) {
      return res.redirect('/password-recovery?error=Correo electrónico no proporcionado')
    }

    res.render('verify-code', {
      layout: 'auth',
      title: 'Verificar Código | Plato y Copa',
      email: email,
      error: req.query.error,
      success: req.query.success
    })
  })

  // Ruta para verificar el código de recuperación
  app.post('/verify-recovery-code', async (req, res) => {
    try {
      const { email, recoveryCode } = req.body

      // Validar datos
      if (!email || !recoveryCode) {
        return res.redirect(`/verify-code?email=${encodeURIComponent(email)}&error=Por favor, ingresa el código de verificación`)
      }

      // Sanitizar datos
      const sanitizedEmail = sanitizeInput(email)
      const sanitizedCode = sanitizeInput(recoveryCode)

      // Verificar si el código existe y es válido
      if (!recoveryCodes[sanitizedEmail] || recoveryCodes[sanitizedEmail].code !== sanitizedCode) {
        return res.redirect(`/verify-code?email=${encodeURIComponent(sanitizedEmail)}&error=Código de verificación inválido`)
      }

      // Verificar si el código ha expirado (15 minutos)
      const now = Date.now()
      const codeTime = recoveryCodes[sanitizedEmail].timestamp
      if (now - codeTime > 15 * 60 * 1000) {
        delete recoveryCodes[sanitizedEmail]
        return res.redirect(`/verify-code?email=${encodeURIComponent(sanitizedEmail)}&error=El código ha expirado. Por favor, solicita uno nuevo`)
      }

      // Generar token de restablecimiento
      const resetToken = crypto.randomBytes(32).toString('hex')
      
      // Guardar el token en recoveryCodes
      recoveryCodes[sanitizedEmail].resetToken = resetToken

      res.redirect(`/reset-password?token=${resetToken}`)
    } catch (error) {
      console.error('Error al verificar código:', error)
      res.redirect(`/verify-code?email=${encodeURIComponent(req.body.email)}&error=Error al verificar el código. Por favor, intenta nuevamente`)
    }
  })

  // Ruta para mostrar el formulario de restablecimiento de contraseña
  app.get("/reset-password", (req, res) => {
    const token = req.query.token
    
    if (!token) {
      return res.redirect("/password-recovery?error=Token no proporcionado")
    }

    res.render("reset-password", {
      layout: "auth",
      title: "Restablecer Contraseña | Plato y Copa",
      token: token,
      error: req.query.error,
      success: req.query.success
    })
  })

  // Ruta para procesar el restablecimiento de contraseña
  app.post("/reset-password", async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body

      // Validar datos
      if (!token || !newPassword || !confirmPassword) {
        return res.render("reset-password", {
          layout: "auth",
          title: "Cambiar Contraseña | Plato y Copa",
          token,
          error: "Por favor, completa todos los campos",
        })
      }

      if (newPassword !== confirmPassword) {
        return res.render("reset-password", {
          layout: "auth",
          title: "Cambiar Contraseña | Plato y Copa",
          token,
          error: "Las contraseñas no coinciden",
        })
      }

      if (!isValidPassword(newPassword)) {
        return res.render("reset-password", {
          layout: "auth",
          title: "Cambiar Contraseña | Plato y Copa",
          token,
          error: "La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una minúscula y un número",
        })
      }

      // Buscar el email asociado al token
      let userEmail = null
      for (const email in recoveryCodes) {
        if (recoveryCodes[email].resetToken === token) {
          userEmail = email
          break
        }
      }

      if (!userEmail) {
        return res.render("reset-password", {
          layout: "auth",
          title: "Cambiar Contraseña | Plato y Copa",
          token,
          error: "Token inválido o expirado. Por favor, solicita un nuevo código.",
        })
      }

      // Encriptar nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Actualizar contraseña en la base de datos
      const result = await db.usuariosRepo.cambiarPassword(userEmail, hashedPassword)

      if (result.success) {
        // Limpiar código de recuperación
        delete recoveryCodes[userEmail]

        // Mostrar mensaje de éxito
        return res.render("authentication", {
          layout: "auth",
          title: "Iniciar Sesión | Plato y Copa",
          isLogin: true,
          success: "Contraseña actualizada correctamente. Ahora puedes iniciar sesión.",
        })
      } else {
        throw new Error(result.message || "Error al actualizar contraseña")
      }
    } catch (error) {
      console.error("Error al resetear contraseña:", error)
      res.render("reset-password", {
        layout: "auth",
        title: "Cambiar Contraseña | Plato y Copa",
        token: req.body.token,
        error: "Error al cambiar la contraseña. Por favor, intenta nuevamente.",
      })
    }
  })
}
