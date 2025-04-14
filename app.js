import express from "express"
import { engine } from "express-handlebars"
import path from "path"
import { fileURLToPath } from "url"
import multer from "multer"
import session from "express-session"
import cookieParser from "cookie-parser"
import crypto from "crypto"
import bcrypt from "bcrypt"
import nodemailer from "nodemailer"
import { sanitizeInput, isValidEmail, isValidPassword } from "./utils/validation.js"
import axios from 'axios'

// Importar módulos de base de datos
import db from "./database/postgress-db.js"

import { sendContactEmail, sendQuotationEmail, sendWelcomeEmail  } from "./utils/email-service.js"

// Importar rutas modulares
import configureServiciosRoutes from "./routes/servicios-routes.js"
import configureTiposEventosRoutes from "./routes/tipos_eventos-routes.js"
// Añade esta línea para importar las rutas de galería
import configureGaleriaRoutes from "./routes/galeria-routes.js"
// Añade esta línea para importar las rutas de cotizaciones
import configureCotizacionesRoutes from "./routes/cotizaciones-routes.js"

import configureChatbotRoutes from "./routes/chatbot-routes.js"

import configureResenasRoutes from "./routes/resenas-routes.js"

// Importar la ruta de búsqueda
import configureSearchRoutes from "./routes/search-routes.js"

import configureResenas from "./routes/resenas.js"

import configureUsuariosRoutes from "./routes/usuarios-routes.js"

// Importar la ruta de perfil
import configurePerfilRoutes from "./routes/perfil-routes.js"

import configureSearchDashboardRoutes from "./routes/search-dashboard-routes.js"

import configureMensajesRoutes from "./routes/mensajes-routes.js"

import configureConfiguracionRoutes from "./routes/configuracion-routes.js"

// Añadir la importación y configuración de las rutas de personal en app.js
// Busca la sección donde se importan las rutas y añade:

import configurePersonalRoutes from "./routes/personal-routes.js"
import e from "express"

// Configuración de la aplicación
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const PORT = process.env.PORT || 3000

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar la carpeta de destino según el tipo de archivo
    let uploadPath = path.join(__dirname, "public/uploads")

    // Si es una imagen de perfil de usuario, guardarla en una carpeta específica
    if (file.fieldname === "profile_image") {
      uploadPath = path.join(__dirname, "public/uploads/profiles")
    }

    // Asegurarse de que la carpeta existe
    const fs = require("fs")
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

// Configuración de Handlebars
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      section: function (name, options) {
        if (!this._sections) this._sections = {}
        this._sections[name] = options.fn(this)
        return null
      },
      // Repetir un bloque n veces
      times: (n, block) => {
        let accum = ""
        for (let i = 0; i < n; ++i) {
          accum += block.fn(i)
        }
        return accum
      },
      // Restar dos números
      subtract: (a, b) => a - b,
      // Comparar igualdad
      eq: (a, b) => a === b,
      // Obtener el módulo
      mod: (a, b) => a % b,
      // Formatear precio
      formatPrice: (price) => (price ? `$${Number.parseFloat(price).toFixed(2)}` : ""),
      // Verificar si un valor es verdadero
      isTrue: (value) => value === 1 || value === true,
      // Obtener la primera letra de una cadena
      firstLetter: (str) => (str ? str.charAt(0) : ""),
      // Truncar texto
      truncate: (str, len) => {
        if (str && str.length > len) {
          return str.substring(0, len) + "..."
        }
        return str
      },
      formatDate: (date) => {
        if (!date) return ""
        const options = { year: "numeric", month: "long", day: "numeric" }
        return new Date(date).toLocaleDateString("es-ES", options)
      },
      // Formatear fecha y hora
      formatDateTime: (date) => {
        if (!date) return ""
        const options = {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
        return new Date(date).toLocaleDateString("es-ES", options)
      },
      minus: (a, b) => a - b,

      // Nuevo helper para convertir JSON a array
      caracteristicasArray: (jsonString) => {
        try {
          if (!jsonString) return []
          return JSON.parse(jsonString)
        } catch (e) {
          console.error("Error al parsear características:", e)
          return []
        }
      },
      // Helper para obtener la URL de la imagen de perfil o mostrar una por defecto
      profileImage: (imagePath) => {
        if (imagePath) {
          return imagePath
        }
        return "/images/default-profile.png"
      },

      // Helper para parsear JSON
      parseJSON: (jsonString) => {
        try {
          if (!jsonString) return {}
          return JSON.parse(jsonString)
        } catch (e) {
          console.error("Error al parsear JSON:", e)
          return {}
        }
      },
    },
  }),
)

app.set("view engine", "handlebars")
app.set("views", path.join(__dirname, "views"))

// Middleware
app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.set('trust proxy', 1) // Confiar en el primer proxy

app.use(cookieParser())
app.use(
  session({
    secret: process.env.SESSION_SECRET || "plato_y_copa_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    },
  }),
)

// Middleware para cargar servicios en todas las vistas
app.use(async (req, res, next) => {
  try {
    // Obtener todos los servicios para el menú de navegación
    const servicios = await db.serviciosRepo.getAll()

    // Inicializamos arrays para los servicios principales y adicionales
    const serviciosPrincipales = []
    const serviciosAdicionales = []

    // Recorremos cada servicio y lo clasificamos según la propiedad "destacado"
    servicios.forEach((servicio) => {
      if (servicio.destacado) {
        serviciosPrincipales.push(servicio)
      } else {
        serviciosAdicionales.push(servicio)
      }
    })
    const Eventos = await db.tiposEventosRepo.getAll()

    // Agregar a locals para que estén disponibles en todas las vistas
    res.locals.servicios = servicios
    res.locals.serviciosPrincipales = serviciosPrincipales
    res.locals.serviciosAdicionales = serviciosAdicionales
    res.locals.Eventos = Eventos

    next()
  } catch (error) {
    console.error("Error al cargar servicios para navegación:", error)
    // Continuar aunque haya error para no bloquear la aplicación
    next()
  }
})

// Middleware para verificar autenticación
const isAuthenticated = async (req, res, next) => {
  if (req.session && req.session.user) {
    try {
      // Verificar si el usuario está activo
      const user = await db.usuariosRepo.getById(req.session.user.id)

      if (!user || !user.activo) {
        // Si el usuario no existe o no está activo, destruir la sesión
        req.session.destroy()
        return res.redirect("/auth?error=Tu cuenta ha sido desactivada o no existe. Contacta al administrador.")
      }

      // Actualizar último acceso
      await db.usuariosRepo.actualizarUltimoAcceso(req.session.user.id)

      return next()
    } catch (error) {
      console.error("Error al verificar estado del usuario:", error)
      return res.redirect("/auth?error=Error al verificar tu cuenta. Intenta nuevamente.")
    }
  }
  res.redirect("/auth")
}

// Añadir el middleware a la aplicación para que esté disponible globalmente
app.isAuthenticated = isAuthenticated

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

// Configuración de nodemailer para envío de correos
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "platoycopa.oficial@gmail.com",
    pass: process.env.EMAIL_PASS || "hjxs qukq pooq ytxr",
  },
})

// Almacenamiento temporal para códigos de recuperación
const recoveryCodes = {}

// Configurar rutas modulares
configureServiciosRoutes(app, db)
configureTiposEventosRoutes(app, db)
// Añade esta línea para configurar las rutas de galería
configureGaleriaRoutes(app, db)
// Añade esta línea para configurar las rutas de cotizaciones
configureCotizacionesRoutes(app, db)

configureChatbotRoutes(app, db)

configureResenasRoutes(app, db)

// Agregar esta línea donde configuras otras rutas (alrededor de la línea 70-80)
configureSearchRoutes(app, db)

configureResenas(app, db)

configureUsuariosRoutes(app, db)

configureSearchDashboardRoutes(app, db)

// Asegurarse de que esta línea esté presente en app.js para registrar correctamente las rutas
// Añadir después de configurar las rutas modulares
configureUsuariosRoutes(app, db)

configureMensajesRoutes(app, db)

configureConfiguracionRoutes(app, db)

// Registrar explícitamente las rutas API para usuarios
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Asegurarse de que las rutas API estén correctamente registradas
// Añadir después de configurar las rutas modulares
configureUsuariosRoutes(app, db)

// Asegurarse de que las rutas API estén correctamente registradas
// NO registrar las rutas API aquí, ya que se hace dentro de configureUsuariosRoutes
// app.use("/api", express.json());
// app.use("/api", express.urlencoded({ extended: true }));

// Añadir esta línea donde configuras otras rutas (alrededor de la línea 70-80)
configurePerfilRoutes(app, db)

// Y luego, donde se configuran las rutas, añade:
configurePersonalRoutes(app, db)

// Manejar errores de multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Error en la carga de archivos: ${err.message}`,
    })
  }
  next(err)
})

// Rutas de autenticación
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
    } else {
      console.log("Contraseña de usuario almacenada:", user.password)
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password)
    const pass = await bcrypt.hash(password, 10)

    console.log("Contraseña de usuario:", pass)

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

// Función auxiliar para obtener la fecha y hora basada en la ubicación
export async function getLocalDateTime() {
  try {
    // Obtener la IP del usuario
    const ipResponse = await axios.get('https://api.ipify.org?format=json')
    const ip = ipResponse.data.ip

    // Obtener la información de ubicación basada en la IP
    const locationResponse = await axios.get(`http://ip-api.com/json/${ip}`)
    const { timezone } = locationResponse.data

    // Crear fecha con la zona horaria del usuario
    const now = new Date()
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
    
    return new Date(now.toLocaleString('en-US', options))
  } catch (error) {
    console.error('Error al obtener fecha local:', error)
    // Si hay error, retornar fecha actual del servidor
    return new Date()
  }
}
app.post("/register", async (req, res) => {
  try {
    const { nombre, email, password, confirmPassword, telefono } = req.body;
    console.log("Datos de registro recibidos:", { nombre, email, passwordLength: password?.length, telefono });

    // Validar campos obligatorios
    if (!nombre || !email || !password || !confirmPassword) {
      return res.render("authentication", {
        layout: "auth",
        title: "Registro | Plato y Copa",
        isLogin: false,
        error: "Por favor, completa todos los campos obligatorios",
      });
    }

    if (password !== confirmPassword) {
      return res.render("authentication", {
        layout: "auth",
        title: "Registro | Plato y Copa",
        isLogin: false,
        error: "Las contraseñas no coinciden",
      });
    }

    if (!isValidEmail(email)) {
      return res.render("authentication", {
        layout: "auth",
        title: "Registro | Plato y Copa",
        isLogin: false,
        error: "El correo electrónico no es válido",
      });
    }

    if (!isValidPassword(password)) {
      return res.render("authentication", {
        layout: "auth",
        title: "Registro | Plato y Copa",
        isLogin: false,
        error: "La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una minúscula y un número",
      });
    }

    // Sanitizar datos
    const sanitizedData = {
      nombre: sanitizeInput(nombre),
      email: sanitizeInput(email),
      telefono: sanitizeInput(telefono || ""),
    };

    // Lista blanca de correos permitidos para registro
    const allowedEmails = [
      "wenfernansori18@gmail.com",
      "lencitop89@gmail.com",
      "quirozleonel453@gmail.com",
      "cncowners19770@gmail.com",
      "gio.cuautle37@gmail.com",
      "maygaona.18.mgl@gmail.com",
      "alan.cuau123@gmail.com",
      "platoycopa.oficial@gmail.com",
    ];

    // Verificar que el email se encuentre en la lista blanca
    if (!allowedEmails.includes(sanitizedData.email)) {
      return res.render("authentication", {
        layout: "auth",
        title: "Registro | Plato y Copa",
        isLogin: false,
        error: "El correo electrónico no está autorizado para el registro",
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await db.usuariosRepo.getByEmail(sanitizedData.email);
    if (existingUser) {
      return res.render("authentication", {
        layout: "auth",
        title: "Registro | Plato y Copa",
        isLogin: false,
        error: "El correo electrónico ya está registrado",
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Contraseña:", password);
    console.log("Contraseña hasheada:", hashedPassword);

    // Obtener fecha y hora local
    const fechaCreacion = await getLocalDateTime();

    // 👇 Forzar rol admin si el correo es el oficial
    let rolAsignado = "usuario";
    if (sanitizedData.email.trim().toLowerCase() === "platoycopa.oficial@gmail.com") {
      rolAsignado = "admin";
      console.log("Correo oficial detectado en registro, rol forzado a administrador.");
    }

    // Crear usuario con todos los campos necesarios
    const nuevoUsuario = {
      nombre: sanitizedData.nombre,
      email: sanitizedData.email,
      password: hashedPassword,
      rol: rolAsignado,
      telefono: sanitizedData.telefono,
      fecha_creacion: fechaCreacion.toISOString(),
      activo: 1,
    };

    console.log("Enviando datos para crear usuario:", {
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
      passwordLength: nuevoUsuario.password.length,
      rol: nuevoUsuario.rol,
      telefono: nuevoUsuario.telefono,
    });

    // Crear usuario en la base de datos
    const result = await db.usuariosRepo.crearUsuario(nuevoUsuario);

    if (result.success) {
      console.log("Usuario registrado exitosamente con ID:", result.id);

      // Enviar correo de bienvenida
      try {
        const emailResponse = await sendWelcomeEmail({
          to: sanitizedData.email,
          nombre: sanitizedData.nombre,
        });
        if (!emailResponse.success) {
          console.error("Error en sendWelcomeEmail:", emailResponse.error);
        }
      } catch (emailError) {
        console.error("Error al enviar email de bienvenida:", emailError);
      }

      // Mostrar mensaje de éxito
      return res.render("authentication", {
        layout: "auth",
        title: "Iniciar Sesión | Plato y Copa",
        isLogin: true,
        success: "Registro exitoso. Revisa tu correo para ver nuestro mensaje de bienvenida.",
      });
    } else {
      throw new Error(result.message || "Error al crear usuario");
    }
  } catch (error) {
    console.error("Error en registro:", error);
    res.render("authentication", {
      layout: "auth",
      title: "Registro | Plato y Copa",
      isLogin: false,
      error: "Error al registrar usuario. Por favor, intenta nuevamente.",
    });
  }
});


app.get("/logout", isAuthenticated, async (req, res) => {
  // Renderizar la plantilla de cierre de sesión
  res.render("logout", {
    layout: "dashboard-layout",
    title: "Cerrando sesión | Plato y Copa"
  });
  
  // Destruir la sesión después de un breve retraso
  setTimeout(() => {
    req.session.destroy();
  }, 300);
});
 

app.get('/password-recovery', (req, res) => {
  res.render('password-recovery', {
    layout: 'auth',
    title: 'Recuperar Contraseña | Plato y Copa',
    error: req.query.error,
    success: req.query.success
  });
});

app.post('/password-recovery', async (req, res) => {
  try {
    const email = req.query.email || req.body.email;

    // Validar email
    if (!email || !isValidEmail(email)) {
      return res.render("password-recovery", {
        layout: "auth",
        title: "Recuperar Contraseña | Plato y Copa",
        error: "Por favor, ingresa un correo electrónico válido",
      });
    }

    // Sanitizar email
    const sanitizedEmail = sanitizeInput(email);

    // Verificar si el usuario existe
    const user = await db.usuariosRepo.getByEmail(sanitizedEmail);

    if (!user) {
      // Por seguridad, no informamos si el email existe o no
      return res.render("password-recovery", {
        layout: "auth",
        title: "Recuperar Contraseña | Plato y Copa",
        error: "Error al procesar la solicitud. Por favor, intenta nuevamente.",
      });
    }

    // Verificar que el usuario esté activo
    if (!user.activo) {
      // Por seguridad, no informamos que la cuenta está desactivada
      return res.render("password-recovery", {
        layout: "auth",
        title: "Recuperar Contraseña | Plato y Copa",
        error: "Error al procesar la solicitud. Por favor, intenta nuevamente.",
      });
    }

    // Generar código de recuperación (6 dígitos)
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar código en memoria (en producción debería guardarse en la base de datos)
    recoveryCodes[sanitizedEmail] = {
      code: recoveryCode,
      timestamp: Date.now(),
      attempts: 0,
    };

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
    };

    await transporter.sendMail(mailOptions);

    // Redireccionar a la página de verificación de código
    res.redirect(`/verify-code?email=${encodeURIComponent(sanitizedEmail)}`);
  } catch (error) {
    console.error("Error al enviar código de recuperación:", error);
    res.render("password-recovery", {
      layout: "auth",
      title: "Recuperar Contraseña | Plato y Copa",
      error: "Error al enviar el código de recuperación. Por favor, intenta nuevamente.",
    });
  }
});

app.get('/verify-code', (req, res) => {
    const email = req.query.email;
    
    if (!email) {
        return res.redirect('/password-recovery?error=Correo electrónico no proporcionado');
    }

    res.render('verify-code', {
        layout: 'auth',
        title: 'Verificar Código | Plato y Copa',
        email: email,
        error: req.query.error,
        success: req.query.success
    });
});

app.post('/verify-recovery-code', async (req, res) => {
    try {
        const { email, recoveryCode } = req.body;

        // Validar datos
        if (!email || !recoveryCode) {
            return res.redirect(`/verify-code?email=${encodeURIComponent(email)}&error=Por favor, ingresa el código de verificación`);
        }

        // Sanitizar datos
        const sanitizedEmail = sanitizeInput(email);
        const sanitizedCode = sanitizeInput(recoveryCode);

        // Verificar si el código existe y es válido
        if (!recoveryCodes[sanitizedEmail] || recoveryCodes[sanitizedEmail].code !== sanitizedCode) {
            return res.redirect(`/verify-code?email=${encodeURIComponent(sanitizedEmail)}&error=Código de verificación inválido`);
        }

        // Verificar si el código ha expirado (15 minutos)
        const now = Date.now();
        const codeTime = recoveryCodes[sanitizedEmail].timestamp;
        if (now - codeTime > 15 * 60 * 1000) {
            delete recoveryCodes[sanitizedEmail];
            return res.redirect(`/verify-code?email=${encodeURIComponent(sanitizedEmail)}&error=El código ha expirado. Por favor, solicita uno nuevo`);
        }

        // Generar token de restablecimiento
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Guardar el token en recoveryCodes
        recoveryCodes[sanitizedEmail].resetToken = resetToken;

        // Si todo está correcto, redirigir a la página de cambio de contraseña con el token
        res.redirect(`/reset-password?token=${resetToken}`);
    } catch (error) {
        console.error('Error al verificar código:', error);
        res.redirect(`/verify-code?email=${encodeURIComponent(req.body.email)}&error=Error al verificar el código. Por favor, intenta nuevamente`);
    }
});

app.post("/send-recovery-code", async (req, res) => {
  try {
    const email = req.query.email || req.body.email;

    // Validar email
    if (!email || !isValidEmail(email)) {
      return res.render("password-recovery", {
        layout: "auth",
        title: "Recuperar Contraseña | Plato y Copa",
        error: "Por favor, ingresa un correo electrónico válido",
      });
    }

    // Sanitizar email
    const sanitizedEmail = sanitizeInput(email);

    // Verificar si el usuario existe
    const user = await db.usuariosRepo.getByEmail(sanitizedEmail);

    if (!user) {
      // Por seguridad, no informamos si el email existe o no
      return res.render("password-recovery", {
        layout: "auth",
        title: "Recuperar Contraseña | Plato y Copa",
        success: "Si el correo existe en nuestra base de datos, recibirás un código de recuperación.",
      });
    }

    // Verificar que el usuario esté activo
    if (!user.activo) {
      // Por seguridad, no informamos que la cuenta está desactivada
      return res.render("password-recovery", {
        layout: "auth",
        title: "Recuperar Contraseña | Plato y Copa",
        success: "Si el correo existe en nuestra base de datos, recibirás un código de recuperación.",
      });
    }

    // Generar código de recuperación (6 dígitos)
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar código en memoria (en producción debería guardarse en la base de datos)
    recoveryCodes[sanitizedEmail] = {
      code: recoveryCode,
      timestamp: Date.now(),
      attempts: 0,
    };

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
    };

    await transporter.sendMail(mailOptions);

    // Redireccionar a la página de verificación de código
    res.redirect(`/verify-code?email=${encodeURIComponent(sanitizedEmail)}`);
  } catch (error) {
    console.error("Error al enviar código de recuperación:", error);
    res.render("password-recovery", {
      layout: "auth",
      title: "Recuperar Contraseña | Plato y Copa",
      error: "Error al enviar el código de recuperación. Por favor, intenta nuevamente.",
    });
  }
});

app.get("/reset-password", (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    return res.redirect("/password-recovery?error=Token no proporcionado");
  }

  res.render("reset-password", {
    layout: "auth",
    title: "Restablecer Contraseña | Plato y Copa",
    token: token,
    error: req.query.error,
    success: req.query.success
  });
});

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
        success: "Contraseña actualizada correctamente. Ahora puedes iniciar sesin.",
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

// Rutas del panel de administración
app.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    // Obtener estadísticas para el dashboard usando las funciones existentes
    const stats = {
      totalServicios: await db.serviciosRepo.getCount(),
      totalResenas: await db.resenasRepo.getCount(),
      totalMensajes: await db.contactoRepo.getCount(),
      totalCotizaciones: await db.cotizacionesRepo.getCount(),
    }

    // Obtener mensajes recientes
    const mensajesRecientes = await db.contactoRepo.getRecent(5)

    // Obtener mensajes no leídos
    const mensajesNoLeidos = await db.contactoRepo.getMensajesNoLeidos()

    // Obtener cotizaciones recientes
    const cotizacionesRecientes = await db.cotizacionesRepo.getRecent(5)

    // Obtener imágenes de galería
    const imagenes = await db.galeriaRepo.getAll(10)

    res.render("dashboard", {
      layout: "dashboard-layout",
      title: "Dashboard | Plato y Copa",
      user: req.session.user,
      active: "dashboard", // Cambiado de activeDashboard a active para coincidir con el layout

      // Datos para las tarjetas de estadísticas
      stats,
      mensajesRecientes,
      mensajesNoLeidos,
      cotizacionesRecientes,
      imagenes,

      // Datos para la vista
      mensajesNoLeidosCount: mensajesNoLeidos.length,
      cotizacionesCount: cotizacionesRecientes.length,
      imagenesCount: imagenes.length,
    })
  } catch (error) {
    console.error("Error en dashboard:", error)
    res.status(500).render("error", {
      layout: "dashboard-layout",
      title: "Error",
      error: "Error al cargar el dashboard",
    })
  }
})

// Ruta para mensajes
app.get("/dashboard/mensajes", isAuthenticated, async (req, res) => {
  try {
    const mensajes = await db.contactoRepo.getAll()

    res.render("dashboard/mensajes", {
      title: "Mensajes - Dashboard",
      layout: "dashboard-layout",
      user: req.session.user,
      mensajes,
    })
  } catch (error) {
    console.error("Error al cargar mensajes:", error)
    res.status(500).render("error", {
      layout: "dashboard-layout",
      status: 500,
      message: "Error interno del servidor",
      description: "No se pudieron cargar los mensajes",
      stack: process.env.NODE_ENV === "development" ? error.stack : null,
    })
  }
})

// Ruta para usuarios
app.get("/dashboard/usuarios", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const usuarios = await db.usuariosRepo.getAll()
    const roles = await db.usuariosRepo.getAllRoles()

    res.render("dashboard/usuarios", {
      title: "Usuarios - Dashboard",
      layout: "dashboard-layout",
      usuarios,
      user: req.session.user,
      roles,
    })
  } catch (error) {
    console.error("Error al cargar usuarios:", error)
    res.status(500).render("error", {
      layout: "dashboard-layout",
      status: 500,
      message: "Error interno del servidor",
      description: "No se pudieron cargar los usuarios",
      stack: process.env.NODE_ENV === "development" ? error.stack : null,
    })
  }
})

// Ruta para cotizaciones
app.get("/dashboard/cotizaciones", isAuthenticated, async (req, res) => {
  try {
    const cotizaciones = await db.cotizacionesRepo.getAll()
    const tiposEventos = await db.tiposEventosRepo.getAll()

    res.render("dashboard/cotizaciones", {
      title: "Cotizaciones - Dashboard",
      layout: "dashboard-layout",
      cotizaciones,
      tiposEventos,
      user: req.session.user,
    })
  } catch (error) {
    console.error("Error al cargar cotizaciones:", error)
    res.status(500).render("error", {
      layout: "dashboard-layout",
      status: 500,
      message: "Error interno del servidor",
      description: "No se pudieron cargar las cotizaciones",
      stack: process.env.NODE_ENV === "development" ? error.stack : null,
    })
  }
})

// Ruta para contenido
app.get("/dashboard/contenido", isAuthenticated, async (req, res) =>
{
  try {
    const servicios = await db.serviciosRepo.getAll()
    const galeria = await db.galeriaRepo.getAll()
    const tiposEventos = await db.tiposEventosRepo.getAll()

    res.render("dashboard/contenido", {
      title: "Contenido - Dashboard",
      layout: "dashboard-layout",
      servicios,
      galeria,
      tiposEventos,
      user: req.session.user,
    })
  } catch (error) {
    console.error("Error al cargar contenido:", error)
    res.status(500).render("error", {
      layout: "dashboard-layout",
      status: 500,
      message: "Error interno del servidor",
      description: "No se pudo cargar el contenido",
      stack: process.env.NODE_ENV === "development" ? error.stack : null,
    })
  }
}
)

app.get("/dashboard/galeria", isAuthenticated, async (req, res) =>
{
  try {
    const imagenes = await db.galeriaRepo.getAll()
    const tiposEventos = await db.tiposEventosRepo.getAll()

    res.render("dashboard/galeria", {
      title: "Gestión de Galería | Dashboard",
      user: req.user,
      imagenes,
      tiposEventos,
      layout: "dashboard-layout",
      user: req.session.user,
    })
  } catch (error) {
    console.error("Error al cargar gestión de galería:", error)
    res.status(500).render("error", {
      message: "Error al cargar gestión de galería",
      error: process.env.NODE_ENV === "development" ? error : {},
      layout: "dashboard-layout",
    })
  }
}
)

// Ruta para perfil de usuario
app.get("/dashboard/perfil", isAuthenticated, async (req, res) =>
{
  try {
    // Obtener el usuario actual de la sesión
    const userId = req.session.user.id
    const user = await db.usuariosRepo.getById(userId)

    // Obtener actividades del usuario
    const actividades = []

    res.render("dashboard/perfil", {
      title: "Mi Perfil - Dashboard",
      layout: "dashboard-layout",
      user,
      actividades,
    })
  } catch (error) {
    console.error("Error al cargar perfil:", error)
    res.status(500).render("error", {
      layout: "dashboard-layout",
      status: 500,
      message: "Error interno del servidor",
      description: "No se pudo cargar el perfil",
      stack: process.env.NODE_ENV === "development" ? error.stack : null,
    })
  }
}
)

// Ruta para actualizar perfil de usuario
app.post("/dashboard/perfil", isAuthenticated, upload.single("profile_image"), async (req, res) =>
{
  try {
    const userId = req.session.user.id
    const { nombre, email, telefono, current_password, new_password } = req.body

    // Validar datos
    if (!nombre || !email) {
      return res.status(400).json({
        success: false,
        message: "El nombre y el email son obligatorios",
      })
    }

    // Obtener usuario actual
    const user = await db.usuariosRepo.getById(userId)

    // Preparar datos para actualizar
    const userData = {
      nombre: sanitizeInput(nombre),
      email: sanitizeInput(email),
      telefono: sanitizeInput(telefono || ""),
    }

    // Si se subió una imagen, añadirla a los datos
    if (req.file) {
      userData.imagen_url = `/uploads/profiles/${req.file.filename}`
    }

    // Si se está cambiando la contraseña
    if (new_password) {
      // Verificar contraseña actual
      if (!current_password) {
        return res.status(400).json({
          success: false,
          message: "Debes proporcionar tu contraseña actual para cambiarla",
        })
      }

      const passwordMatch = await bcrypt.compare(current_password, user.password)
      if (!passwordMatch) {
        return res.status(400).json({
          success: false,
          message: "La contraseña actual es incorrecta",
        })
      }

      // Validar nueva contraseña
      if (!isValidPassword(new_password)) {
        return res.status(400).json({
          success: false,
          message: "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
        })
      }

      // Actualizar contraseña
      await db.usuariosRepo.actualizarPassword(userId, new_password)
    }

    // Actualizar datos del usuario
    const result = await db.usuariosRepo.actualizarUsuario(userId, userData)

    if (result.success) {
      // Actualizar datos de sesión
      req.session.user = {
        ...req.session.user,
        nombre: userData.nombre,
        email: userData.email,
        telefono: userData.telefono,
        imagen: userData.imagen_url || req.session.user.imagen,
      }

      return res.json({
        success: true,
        message: "Perfil actualizado correctamente",
      })
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || "Error al actualizar perfil",
      })
    }
  } catch (error) {
    console.error("Error al actualizar perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar perfil",
    })
  }
}
)

// API para el dashboard
// Actualizar tipo de evento
app.post("/api/tipos-eventos", isAuthenticated, isAdmin, async (req, res) =>
{
  try {
    const { nombre, descripcion } = req.body

    if (!isNotEmpty(nombre)) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" })
    }

    const result = await db.tiposEventosRepo.crear({ nombre, descripcion })

    if (result.success) {
      // Registrar actividad
      await db.actividadesRepo.registrarActividad({
        usuario_id: req.session.userId,
        tipo: "crear_tipo_evento",
        descripcion: `Creación de tipo de evento: ${nombre}`,
        ip: req.ip,
      })

      res.json({ success: true, id: result.id, message: "Tipo de evento creado exitosamente" })
    } else {
      res.status(500).json({ success: false, message: result.message || "Error al crear tipo de evento" })
    }
  } catch (error) {
    console.error("Error al crear tipo de evento:", error)
    res.status(500).json({ success: false, message: "Error interno del servidor" })
  }
}
)

app.put("/api/tipos-eventos/:id", isAuthenticated, isAdmin, async (req, res) =>
{
  try {
    const { id } = req.params
    const { nombre, descripcion } = req.body

    if (!isNotEmpty(nombre)) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" })
    }

    const result = await db.tiposEventosRepo.actualizar(id, { nombre, descripcion })

    if (result.success) {
      // Registrar actividad
      await db.actividadesRepo.registrarActividad({
        usuario_id: req.session.userId,
        tipo: "actualizar_tipo_evento",
        descripcion: `Actualización de tipo de evento ID ${id}: ${nombre}`,
        ip: req.ip,
      })

      res.json({ success: true, message: "Tipo de evento actualizado exitosamente" })
    } else {
      res.status(500).json({ success: false, message: result.message || "Error al actualizar tipo de evento" })
    }
  } catch (error) {
    console.error("Error al actualizar tipo de evento:", error)
    res.status(500).json({ success: false, message: "Error interno del servidor" })
  }
}
)

app.delete("/api/tipos-eventos/:id", isAuthenticated, isAdmin, async (req, res) =>
{
  try {
    const { id } = req.params

    const result = await db.tiposEventosRepo.eliminar(id)

    if (result.success) {
      // Registrar actividad
      await db.actividadesRepo.registrarActividad({
        usuario_id: req.session.userId,
        tipo: "eliminar_tipo_evento",
        descripcion: `Eliminación de tipo de evento ID ${id}`,
        ip: req.ip,
      })

      res.json({ success: true, message: "Tipo de evento eliminado exitosamente" })
    } else {
      res.status(500).json({ success: false, message: result.message || "Error al eliminar tipo de evento" })
    }
  } catch (error) {
    console.error("Error al eliminar tipo de evento:", error)
    res.status(500).json({ success: false, message: "Error interno del servidor" })
  }
}
)

// API para usuarios
app.post("/api/usuarios", isAuthenticated, isAdmin, upload.single("profile_image"), async (req, res) =>
{
  try {
    const { nombre, email, password, rol, activo, telefono } = req.body

    // Validar datos
    const errors = []

    if (!nombre) errors.push("El nombre es obligatorio")
    if (!email) errors.push("El email es obligatorio")
    if (!isValidEmail(email)) errors.push("El correo electrónico no es válido")
    if (password && !isValidPassword(password))
      errors.push("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(", ") })
    }

    // Verificar si el email ya está registrado
    const existingUser = await db.usuariosRepo.getByEmail(email)

    if (existingUser) {
      return res.status(400).json({ success: false, message: "El correo electrónico ya está registrado" })
    }

    // Encriptar contraseña
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    // Crear usuario
    const newUser = {
      nombre: sanitizeInput(nombre),
      email: sanitizeInput(email),
      password: hashedPassword,
      rol: rol || "usuario",
      activo: activo === "1" || activo === true || activo === 1 ? 1 : 0,
      telefono: sanitizeInput(telefono || ""),
      fecha_creacion: new Date().toISOString(),
    }

    // Si se subió una imagen, añadirla a los datos
    if (req.file) {
      newUser.imagen_url = `/uploads/profiles/${req.file.filename}`
    }

    const result = await db.usuariosRepo.crearUsuario(newUser)

    if (result.success) {
      res.json({ success: true, id: result.id, message: "Usuario creado exitosamente" })
    } else {
      res.status(500).json({ success: false, message: result.message || "Error al crear usuario" })
    }
  } catch (error) {
    console.error("Error al crear usuario:", error)
    res.status(500).json({ success: false, message: "Error interno del servidor" })
  }
}
)

app.put("/api/usuarios/:id", isAuthenticated, isAdmin, upload.single("profile_image"), async (req, res) =>
{
  try {
    const { id } = req.params
    const { nombre, email, rol, activo, telefono, password } = req.body

    // Validar datos
    const errors = []

    if (!nombre) errors.push("El nombre es obligatorio")
    if (!email) errors.push("El email es obligatorio")
    if (!isValidEmail(email)) errors.push("El correo electrónico no es válido")
    if (password && !isValidPassword(password))
      errors.push("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(", ") })
    }

    // Verificar si el email ya está registrado por otro usuario
    const existingUser = await db.usuariosRepo.getByEmail(email)

    if (existingUser && existingUser.id !== Number(id)) {
      return res
        .status(400)
        .json({ success: false, message: "El correo electrónico ya está registrado por otro usuario" })
    }

    // Actualizar usuario
    const userData = {
      nombre: sanitizeInput(nombre),
      email: sanitizeInput(email),
      rol,
      activo: activo === "1" || activo === true || activo === 1 ? 1 : 0,
      telefono: sanitizeInput(telefono || ""),
    }

    // Si se subió una imagen, añadirla a los datos
    if (req.file) {
      userData.imagen_url = `/uploads/profiles/${req.file.filename}`
    }

    const result = await db.usuariosRepo.actualizarUsuario(id, userData)

    // Si se proporcionó una nueva contraseña, actualizarla
    if (password && password.trim() !== "") {
      await db.usuariosRepo.actualizarPassword(id, password)
    }

    if (result.success) {
      res.json({ success: true, message: "Usuario actualizado exitosamente" })
    } else {
      res.status(500).json({ success: false, message: result.message || "Error al actualizar usuario" })
    }
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    res.status(500).json({ success: false, message: "Error interno del servidor" })
  }
}
)

app.put("/api/usuarios/:id/reset-password", isAuthenticated, isAdmin, async (req, res) =>
{
  try {
    const { id } = req.params

    // Generar contraseña aleatoria
    const newPassword = crypto.randomBytes(4).toString("hex")

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar contraseña
    const result = await db.usuariosRepo.actualizarPassword(id, hashedPassword)

    if (result.success) {
      // Obtener datos del usuario
      const user = await db.usuariosRepo.getById(id)

      // Enviar correo con nueva contraseña
      await sendPasswordResetEmail({
        email: user.email,
        nombre: user.nombre,
        newPassword,
      })

      res.json({ success: true, message: "Contraseña restablecida y enviada al usuario" })
    } else {
      res.status(500).json({ success: false, message: result.message || "Error al restablecer contraseña" })
    }
  } catch (error) {
    console.error("Error al restablecer contraseña:", error)
    res.status(500).json({ success: false, message: "Error interno del servidor" })
  }
}
)

// API para cotizaciones
app.put("/api/cotizaciones/:id/estado", isAuthenticated, async (req, res) =>
{
  try {
    const { id } = req.params
    const { estado } = req.body

    if (!["pendiente", "aprobada", "rechazada", "completada"].includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado no válido" })
    }

    const result = await db.cotizacionesRepo.actualizarEstado(id, estado)

    if (result.success) {
      res.json({ success: true, message: "Estado de cotización actualizado exitosamente" })
    } else {
      res.status(500).json({ success: false, message: result.message || "Error al actualizar estado de cotización" })
    }
  } catch (error) {
    console.error("Error al actualizar estado de cotización:", error)
    res.status(500).json({ success: false, message: "Error interno del servidor" })
  }
}
)

// Rutas para la página principal
app.get("/", async (req, res) => {
  try {
    const services = await db.serviciosRepo.getDestacados()
    const reviews = await db.resenasRepo.getAll(3)
    const stats = await db.estadisticasRepo.getAll()
    const galleryImages = await db.galeriaRepo.getDestacadas()
    const tiposEventos = await db.tiposEventosRepo.getAll()

    console.log("Datos para la página de inicio:")
    console.log("- Servicios:", services.length)
    console.log("- Reseñas:", reviews.length)
    console.log("- Estadísticas:", stats.length)
    console.log("- Imágenes de galería:", galleryImages.length)

    res.render("home", {
      title: "Plato y Copa | Servicio Premium de Meseros",
      activeHome: true,
      services,
      reviews,
      stats,
      galleryImages,
      tiposEventos,
      success: req.query.quote === "success",
      error: req.query.error === "true",
    })
  } catch (error) {
    console.error("Error al cargar la página de inicio:", error)
    res.status(500).send("Error al cargar la página")
  }
})


app.get("/servicios", async (req, res) =>
{
  try {
    // Obtener todos los servicios
    const services = await db.serviciosRepo.getAll()

    res.render("services", {
      title: "Servicios | Plato y Copa",
      services,
      activeServices: true,
    })
  } catch (error) {
    console.error("Error al cargar servicios:", error)
    res.status(500).render("error", {
      title: "Error",
      error: "Error al cargar los servicios",
    })
  }
}
)

app.get("/galeria", async (req, res) =>
{
  try {
    // Obtener parámetros de consulta
    const page = Number.parseInt(req.query.page) || 1
    const limit = 12
    const offset = (page - 1) * limit
    const tipo = req.query.tipo

    // Obtener imágenes de la galería
    let galleryItems
    let totalItems

    if (tipo) {
      galleryItems = await db.galeriaRepo.getByTipoEvento(tipo, limit, offset)
      totalItems = await db.galeriaRepo.getCountByTipoEvento(tipo)
    } else {
      galleryItems = await db.galeriaRepo.getAll(limit, offset)
      totalItems = await db.galeriaRepo.getCount()
    }

    // Obtener imágenes destacadas
    const featuredImages = await db.galeriaRepo.getDestacadas()

    // Obtener tipos de eventos populares
    const popularEventTypes = await db.tiposEventosRepo.getAllWithCountImages()

    // Calcular paginación
    const totalPages = Math.ceil(totalItems / limit)
    const pages = []

    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        number: i,
        active: i === page,
      })
    }

    res.render("gallery", {
      title: "Galería | Plato y Copa",
      galleryItems,
      featuredImages,
      popularEventTypes,
      pages,
      currentPage: page,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1,
      currentCategory: tipo,
      activeGallery: true,
    })
  } catch (error) {
    console.error("Error al cargar galería:", error)
    res.status(500).render("error", {
      title: "Error",
      error: "Error al cargar la galería",
    })
  }
}
)

// Ruta para servicios individuales
app.get("/servicios/:id", async (req, res) =>
{
  try {
    const serviceId = req.params.id

    // Obtener todos los servicios
    const services = await db.serviciosRepo.getAll()

    // Redirigir a la página de servicios con el ID como parámetro de consulta
    res.redirect(`/servicios?id=${serviceId}`)
  } catch (error) {
    console.error(`Error al redirigir al servicio con ID ${req.params.id}:`, error)
    res.redirect("/servicios")
  }
}
)

// Ruta para galería filtrada por tipo de evento
app.get("/galeria/tipo/:id", async (req, res) =>
{
  try {
    const eventTypeId = req.params.id

    // Redirigir a la página de galería con el tipo como parámetro de consulta
    res.redirect(`/galeria?tipo=${eventTypeId}`)
  } catch (error) {
    console.error(`Error al redirigir a galería para el tipo de evento ${req.params.id}:`, error)
    res.redirect("/galeria")
  }
}
)

// Ruta para imágenes individuales de la galería
app.get("/galeria/:id", async (req, res) =>
{
  try {
    const galleryId = req.params.id

    // Redirigir a la página de galería con el ID como parámetro de consulta
    res.redirect(`/galeria?id=${galleryId}`)
  } catch (error) {
    console.error(`Error al redirigir a la imagen con ID ${req.params.id}:`, error)
    res.redirect("/galeria")
  }
}
)

app.get("/sobre-nosotros", async (req, res) =>
{
  try {
    // Obtener datos del equipo
    const team = await db.equipoRepo.getAll()

    // Obtener estadísticas
    const stats = await db.estadisticasRepo.getAll()

    res.render("about", {
      title: "Sobre Nosotros | Plato y Copa",
      team,
      stats,
      activeAbout: true,
    })
  } catch (error) {
    console.error("Error al cargar página sobre nosotros:", error)
    res.status(500).render("error", {
      title: "Error",
      error: "Error al cargar la página sobre nosotros",
    })
  }
}
)

app.get("/contacto", async (req, res) =>
{
  try {
    // Obtener tipos de eventos para el formulario
    const tiposEventos = await db.tiposEventosRepo.getAll()

    res.render("contact", {
      title: "Contacto | Plato y Copa",
      tiposEventos,
      activeContact: true,
      success: req.query.success === "true",
      error: req.query.error,
    })
  } catch (error) {
    console.error("Error al cargar página de contacto:", error)
    res.status(500).render("error", {
      title: "Error",
      error: "Error al cargar la página de contacto",
    })
  }
}
)

// Ruta para procesar el formulario de contacto
app.post("/contact-form", async (req, res) =>
{
  try {
    const { name, email, phone, eventType, message } = req.body

    // Validar datos
    if (!name || !email || !message) {
      return res.redirect("/contacto?error=Por favor, completa los campos obligatorios")
    }

    // Sanitizar datos
    const sanitizedData = {
      nombre: sanitizeInput(name),
      email: sanitizeInput(email),
      telefono: sanitizeInput(phone),
      tipo_evento: sanitizeInput(eventType),
      mensaje: sanitizeInput(message),
    }

    // Guardar mensaje en la base de datos
    const result = await db.contactoRepo.guardarMensaje(sanitizedData)

    if (result.success) {
      // Enviar correo de notificación
      await sendContactEmail(sanitizedData)

      return res.redirect("/contacto?success=true")
    } else {
      throw new Error(result.message || "Error al guardar mensaje")
    }
  } catch (error) {
    console.error("Error al procesar formulario de contacto:", error)
    res.redirect("/contacto?error=Error al enviar el mensaje. Por favor, intenta nuevamente.")
  }
}
)

// Ruta para procesar el formulario de cotización
app.post("/quote-form", async (req, res) =>
{
  try {
    const {
      fullName,
      email,
      phone,
      eventDate,
      eventType,
      numWaiters,
      duration,
      location,
      lavalozas,
      cuidaCoches,
      montajeDesmontaje,
    } = req.body

    console.log("Datos de cotización recibidos:", req.body)

    // Validar datos
    if (
      !fullName ||
      !email ||
      !phone ||
      !eventDate ||
      !eventType ||
      !numWaiters ||
      !duration ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "Por favor, completa todos los campos obligatorios",
      })
    }

    // Calcular costos
    const baseServiceCost = duration === "6" ? numWaiters * 350 : numWaiters * 450

    let additionalServicesCost = 0
    if (lavalozas) additionalServicesCost += 300
    if (cuidaCoches) additionalServicesCost += 400
    if (montajeDesmontaje) additionalServicesCost += numWaiters * 80

    let locationCharge = 0
    const totalBeforeLocation = baseServiceCost + additionalServicesCost
    if (location === "foraneo") {
      locationCharge = totalBeforeLocation * 0.2
    }

    const totalCost = totalBeforeLocation + locationCharge

    // Sanitizar datos
    const sanitizedData = {
      fullName: sanitizeInput(fullName),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone),
      eventDate: sanitizeInput(eventDate),
      eventType: sanitizeInput(eventType),
      numWaiters: Number.parseInt(numWaiters),
      serviceDuration: Number.parseInt(duration),
      serviceLocation: sanitizeInput(location),
      lavalozas: lavalozas === "on",
      cuidaCoches: cuidaCoches === "on",
      montajeDesmontaje: montajeDesmontaje === "on",
      baseServiceCost,
      additionalServicesCost,
      locationCharge,
      totalCost,
      status: "pendiente",
      createdAt: new Date().toISOString(),
    }

    // Guardar cotización en la base de datos
    const result = await db.cotizacionesRepo.guardarCotizacion(sanitizedData)

    if (result.success) {
      // Enviar correo de notificación
      await sendQuotationEmail(sanitizedData)

      return res.status(200).json({
        success: true,
        message: "Cotización guardada correctamente",
        id: result.id,
      })
    } else {
      throw new Error(result.message || "Error al guardar cotización")
    }
  } catch (error) {
    console.error("Error al procesar formulario de cotización:", error)
    res.status(500).json({
      success: false,
      message: "Error al guardar la cotización. Por favor, intenta nuevamente.",
    })
  }
}
)

// Manejo de errores 404
app.use((req, res) =>
{
  res.status(404).render("error", {
    title: "Página no encontrada",
    error: "La página que estás buscando no existe",
  })
}
)

// Manejo de errores generales
app.use((err, req, res, next) =>
{
  console.error(err.stack)
  res.status(500).render("error", {
    title: "Error",
    error: "Ha ocurrido un error en el servidor",
  })
}
)

// Iniciar servidor
app.listen(PORT, () =>
{
  console.log(`Servidor iniciado en http://localhost:${PORT}`)
}
)

export default app

// Helper functions
function isNotEmpty(str) {
  return str && str.trim().length > 0
}

function isValidName(str) {
  return /^[a-zA-Z\s]+$/.test(str)
}

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
