import express from "express"
import { engine } from "express-handlebars"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"
import Handlebars from "handlebars"
import db from "./database/postgress-db.js"
import * as validation from "./utils/validation.js"
import {
  sanitizeCompletely,
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidMessage,
  isValidContractNumber,
  isPositiveInteger,
  isNotEmpty,
  isValidDate,
  isFutureDate,
} from "./utils/validation.js"

// Importar el servicio de correo
import { sendContactEmail, sendQuotationEmail } from "./utils/email-service.js"

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Express app
const app = express()
// Use process.env.PORT for cloud deployment compatibility or 0.0.0.0 to listen on all network interfaces
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || "0.0.0.0"

// Setup Handlebars as the view engine
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      // Helper to safely output HTML content
      safeHTML: (content) => new Handlebars.SafeString(content),
      // Helper to repeat something n times
      times: (n, block) => {
        let accum = ""
        for (let i = 0; i < n; ++i) {
          accum += block.fn(i)
        }
        return accum
      },
      // Helper to subtract numbers
      subtract: (a, b) => a - b,
      // Helper to check equality
      eq: (a, b) => a === b,
      // Helper to get modulo
      mod: (a, b) => a % b,
      // Helper para obtener la fecha actual en formato YYYY-MM-DD
      currentDate: () => {
        const today = new Date()
        return today.toISOString().split("T")[0]
      },
    },
  }),
)
app.set("view engine", "handlebars")
app.set("views", "./views")

// Serve static files
app.use(express.static(path.join(__dirname, "public")))

// Parse form data
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error("Error en la aplicación:", err)
  res.status(500).send("Error interno del servidor")
})

// Routes
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

// Actualizar la ruta de servicios para incluir información de precios
app.get("/servicios", async (req, res) => {
  try {
    const services = await db.serviciosRepo.getAll()

    console.log("Datos para la página de servicios:")
    console.log("- Servicios:", services.length)

    res.render("services", {
      title: "Servicios - Plato y Copa",
      activeServices: true,
      services,
    })
  } catch (error) {
    console.error("Error al cargar la página de servicios:", error)
    res.status(500).send("Error al cargar la página")
  }
})

app.get("/contacto", async (req, res) => {
  try {
    const contactInfo = [
      { icon: "bi-telephone-plus", title: "Teléfono", text: "+52 (555) 123-4567" },
      { icon: "bi-envelope", title: "Email", text: "info@platoycopa.com" },
      { icon: "bi-facebook", title: "Facebook", text: "Plato y Copa" },
      { icon: "bi-instagram", title: "Instagram", text: "@platoycopa" },
      { icon: "bi-whatsapp", title: "WhatsApp", text: "+52 (555) 123-4567" },
      { icon: "bi-geo-alt", title: "Dirección", text: "Ciudad de México, México" },
    ]

    const tiposEventos = await db.tiposEventosRepo.getAll()

    console.log("Datos para la página de contacto:")
    console.log("- Tipos de eventos:", tiposEventos.length)

    res.render("contact", {
      title: "Contacto - Plato y Copa",
      activeContact: true,
      contactInfo,
      tiposEventos,
      success: req.query.success === "true",
      error: req.query.error === "true",
    })
  } catch (error) {
    console.error("Error al cargar la página de contacto:", error)
    res.status(500).send("Error al cargar la página")
  }
})

app.get("/sobre-nosotros", async (req, res) => {
  try {
    const aboutCards = [
      {
        icon: "bi-clock-history",
        title: "Nuestra Historia",
        text: "Fundada en 2010 por Juan Pérez y María González, Plato y Copa nació de la pasión por ofrecer un servicio de meseros excepcional. Desde nuestros humildes inicios en pequeños eventos familiares, hemos crecido para convertirnos en líderes en la industria de eventos de lujo en México.",
      },
      {
        icon: "bi-award",
        title: "Nuestra Misión",
        text: "Nos dedicamos a elevar cada evento a través de un servicio impecable, atención meticulosa al detalle y una experiencia inolvidable para nuestros clientes y sus invitados. Buscamos ser el estándar de excelencia en el servicio de meseros y catering en México.",
      },
      {
        icon: "bi-gem",
        title: "Nuestros Valores",
        text: "- Excelencia en cada detalle<br>- Profesionalismo y ética laboral<br>- Pasión por el servicio al cliente<br>- Innovación constante<br>- Trabajo en equipo y respeto mutuo<br>- Compromiso con la sostenibilidad",
      },
    ]

    const team = await db.equipoRepo.getAll()
    const achievements = await db.estadisticasRepo.getAll()

    console.log("Datos para la página sobre nosotros:")
    console.log("- Equipo:", team.length)
    console.log("- Logros:", achievements.length)

    res.render("about", {
      title: "Sobre Nosotros - Plato y Copa",
      activeAbout: true,
      aboutCards,
      team,
      achievements,
    })
  } catch (error) {
    console.error("Error al cargar la página sobre nosotros:", error)
    res.status(500).send("Error al cargar la página")
  }
})
// Modificar la ruta de reseñas para obtener los tipos de eventos más populares
app.get("/resenas", async (req, res) => {
  try {
    const reviews = await db.resenasRepo.getAll(50)
    const tiposEventos = await db.tiposEventosRepo.getAll()

    console.log("Datos para la página de reseñas:")
    console.log("- Reseñas:", reviews.length)
    console.log("- Tipos de eventos:", tiposEventos.length)

    // Calcular estadísticas de calificaciones
    const totalReviews = reviews.length
    let ratingAverage = "0.0"
    let ratingDistribution = []
    let fullStars = 0
    let halfStar = false
    let emptyStars = 5

    if (totalReviews > 0) {
      const ratingSum = reviews.reduce((sum, review) => sum + review.calificacion, 0)
      ratingAverage = (ratingSum / totalReviews).toFixed(1)

      // Calcular distribución de calificaciones
      const ratingCounts = [0, 0, 0, 0, 0] // Para calificaciones 1-5
      reviews.forEach((review) => {
        ratingCounts[review.calificacion - 1]++
      })

      ratingDistribution = ratingCounts
        .map((count, index) => ({
          stars: index + 1,
          percentage: Math.round((count / totalReviews) * 100),
        }))
        .reverse() // Invertir para mostrar 5 estrellas primero

      // Calcular estrellas para mostrar
      fullStars = Math.floor(Number.parseFloat(ratingAverage))
      halfStar = Number.parseFloat(ratingAverage) % 1 >= 0.5
      emptyStars = 5 - fullStars - (halfStar ? 1 : 0)
    }

    // Obtener los tipos de eventos más populares (con más reseñas)
    const eventTypeCount = {}
    reviews.forEach((review) => {
      const tipoEventoId = review.tipo_evento_id
      if (tipoEventoId) {
        eventTypeCount[tipoEventoId] = (eventTypeCount[tipoEventoId] || 0) + 1
      }
    })

    // Mapear los IDs de tipos de eventos a objetos con nombre y conteo
    const popularEventTypes = []
    for (const [id, count] of Object.entries(eventTypeCount)) {
      const tipoEvento = tiposEventos.find((tipo) => tipo.id === Number(id))
      if (tipoEvento) {
        popularEventTypes.push({
          id: tipoEvento.id,
          nombre: tipoEvento.nombre,
          count: count,
        })
      }
    }

    // Ordenar por conteo (descendente) y limitar a 5 (o el número que prefieras)
    popularEventTypes.sort((a, b) => b.count - a.count)
    const topEventTypes = popularEventTypes.slice(0, 5) // Obtener solo los 5 más populares

    // Configurar paginación
    const currentPage = Number.parseInt(req.query.page) || 1
    const itemsPerPage = 6
    const totalPages = Math.ceil(totalReviews / itemsPerPage)

    const pages = Array.from({ length: totalPages }, (_, i) => ({
      number: i + 1,
      active: i + 1 === currentPage,
    }))

    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedReviews = reviews.slice(startIndex, startIndex + itemsPerPage)

    // Añadir timestamp para ordenamiento
    paginatedReviews.forEach((review) => {
      // Convertir fecha a timestamp para ordenamiento
      const dateParts = review.fecha.split(" de ")
      const month = {
        enero: 0,
        febrero: 1,
        marzo: 2,
        abril: 3,
        mayo: 4,
        junio: 5,
        julio: 6,
        agosto: 7,
        septiembre: 8,
        octubre: 9,
        noviembre: 10,
        diciembre: 11,
      }
      const day = Number.parseInt(dateParts[0])
      const monthIndex = month[dateParts[1].toLowerCase()]
      const year = Number.parseInt(dateParts[2])

      review.fecha_timestamp = new Date(year, monthIndex, day).getTime()
    })

    res.render("reviews", {
      title: "Reseñas - Plato y Copa",
      activeReviews: true,
      ratingAverage,
      fullStars,
      halfStar,
      emptyStars,
      totalReviews,
      ratingDistribution,
      tiposEventos,
      popularEventTypes: topEventTypes, // Pasar los tipos de eventos populares
      reviews: paginatedReviews,
      pages,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      hasPrevPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
      success: req.query.success === "true",
      error: req.query.error,
    })
  } catch (error) {
    console.error("Error al cargar la página de reseñas:", error)
    res.status(500).send("Error al cargar la página")
  }
})

// Ruta para procesar el formulario de reseñas
app.post("/submit-review", async (req, res) => {
  try {
    console.log("Datos recibidos del formulario de reseña:", req.body)

    const { orderNumber, reviewerName, eventType, calificacion, comentario, imagenes } = req.body

    // Validar datos
    const errors = []

    if (!validation.isNotEmpty(orderNumber)) errors.push("El número de contrato es obligatorio")
    else if (!validation.isValidContractNumber(orderNumber))
      errors.push("El formato del número de contrato no es válido")

    if (!validation.isNotEmpty(reviewerName)) errors.push("El nombre es obligatorio")
    else if (!validation.isValidName(reviewerName)) errors.push("El nombre no es válido")

    if (!validation.isNotEmpty(eventType)) errors.push("El tipo de evento es obligatorio")

    if (!validation.isNotEmpty(calificacion)) errors.push("La calificación es obligatoria")
    else {
      const ratingNum = Number.parseInt(calificacion)
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        errors.push("La calificación debe ser un número entre 1 y 5")
      }
    }

    if (!validation.isNotEmpty(comentario)) errors.push("El texto de la reseña es obligatorio")
    else if (!validation.isValidMessage(comentario, 10, 500))
      errors.push("La reseña debe tener entre 10 y 500 caracteres")

    if (errors.length > 0) {
      console.log("Errores de validación en formulario de reseña:", errors)
      return res.redirect(`/resenas?error=${encodeURIComponent(errors.join(", "))}`)
    }

    // Verificar si el contrato existe
    const contratoExiste = await db.contratosRepo.verificarContrato(orderNumber)
    if (!contratoExiste) {
      console.log(`Contrato ${orderNumber} no encontrado en la base de datos`)
      return res.redirect(
        `/resenas?error=${encodeURIComponent("El número de contrato no es válido o no existe en nuestros registros.")}`,
      )
    }

    // Sanitizar datos
    const sanitizedData = {
      numero_contrato: validation.sanitizeCompletely(orderNumber),
      nombre_cliente: validation.sanitizeCompletely(reviewerName),
      tipo_evento_id: validation.sanitizeCompletely(eventType),
      calificacion: Number.parseInt(validation.sanitizeCompletely(calificacion)),
      comentario: validation.sanitizeCompletely(comentario),
      imagenes: imagenes ? [validation.sanitizeCompletely(imagenes)] : [],
    }

    console.log("Datos sanitizados para agregar reseña:", sanitizedData)

    // Intentar agregar la reseña
    try {
      const result = await db.resenasRepo.agregarResena(sanitizedData)
      console.log("Resultado de agregar reseña:", result)

      if (result && result.success) {
        console.log("Reseña agregada exitosamente con ID:", result.id)
        return res.redirect("/resenas?success=true")
      } else {
        const errorMsg = result ? result.message : "Error desconocido al agregar la reseña"
        console.error("Error al agregar reseña:", errorMsg)
        return res.redirect(`/resenas?error=${encodeURIComponent(errorMsg)}`)
      }
    } catch (dbError) {
      console.error("Error en la base de datos al agregar reseña:", dbError)
      return res.redirect(`/resenas?error=${encodeURIComponent("Error en la base de datos: " + dbError.message)}`)
    }
  } catch (error) {
    console.error("Error general al procesar la reseña:", error)
    return res.redirect(`/resenas?error=${encodeURIComponent("Error interno del servidor")}`)
  }
})

// Modificar la ruta de galería de manera similar
app.get("/galeria", async (req, res) => {
  try {
    const featuredImages = await db.galeriaRepo.getDestacadas()
    const eventTypes = await db.tiposEventosRepo.getAll()
    const galleryItems = await db.galeriaRepo.getAll()

    console.log("Datos para la página de galería:")
    console.log("- Imágenes destacadas:", featuredImages.length)
    console.log("- Tipos de eventos:", eventTypes.length)
    console.log("- Imágenes de galería:", galleryItems.length)

    // Obtener tipos de eventos más populares (con más imágenes)
    const eventTypeCount = {}
    galleryItems.forEach((item) => {
      const tipoEventoId = item.tipo_evento_id
      if (tipoEventoId) {
        eventTypeCount[tipoEventoId] = (eventTypeCount[tipoEventoId] || 0) + 1
      }
    })

    // Mapear los IDs de tipos de eventos a objetos con nombre y conteo
    const popularEventTypes = []
    for (const [id, count] of Object.entries(eventTypeCount)) {
      const tipoEvento = eventTypes.find((tipo) => tipo.id === Number(id))
      if (tipoEvento) {
        popularEventTypes.push({
          id: tipoEvento.id,
          nombre: tipoEvento.nombre,
          count: count,
        })
      }
    }

    // Ordenar por conteo (descendente) y limitar a 5 (o el número que prefieras)
    popularEventTypes.sort((a, b) => b.count - a.count)
    const topEventTypes = popularEventTypes.slice(0, 5)

    // Configurar paginación
    const currentPage = Number.parseInt(req.query.page) || 1
    const itemsPerPage = 9
    const totalItems = galleryItems.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)

    const pages = Array.from({ length: totalPages }, (_, i) => ({
      number: i + 1,
      active: i + 1 === currentPage,
    }))

    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedItems = galleryItems.slice(startIndex, startIndex + itemsPerPage)

    res.render("gallery", {
      title: "Galería - Plato y Copa",
      activeGallery: true,
      featuredImages,
      eventTypes,
      popularEventTypes: topEventTypes, // Pasar los tipos de eventos populares
      galleryItems: paginatedItems,
      pages,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      hasNextPage: currentPage < totalPages,
    })
  } catch (error) {
    console.error("Error al cargar la página de galería:", error)
    res.status(500).send("Error al cargar la página")
  }
})

// Actualizar la ruta para el formulario de contacto
app.post("/contact-form", async (req, res) => {
  try {
    console.log("Datos recibidos del formulario de contacto:", req.body)

    const { name, email, phone, eventType, message } = req.body

    // Validar datos
    const errors = []

    if (!isNotEmpty(name)) errors.push("El nombre es obligatorio")
    else if (!isValidName(name)) errors.push("El nombre no es válido")

    if (!isNotEmpty(email)) errors.push("El correo electrónico es obligatorio")
    else if (!isValidEmail(email)) errors.push("El correo electrónico no es válido")

    if (!isNotEmpty(phone)) errors.push("El teléfono es obligatorio")
    else if (!isValidPhone(phone)) errors.push("El teléfono no es válido")

    if (!isNotEmpty(eventType)) errors.push("El tipo de evento es obligatorio")

    if (!isNotEmpty(message)) errors.push("El mensaje es obligatorio")
    else if (!isValidMessage(message, 10, 500)) errors.push("El mensaje debe tener entre 10 y 500 caracteres")

    if (errors.length > 0) {
      console.log("Errores de validación en formulario de contacto:", errors)
      return res.redirect("/contacto?error=true")
    }

    // Sanitizar datos
    const sanitizedData = {
      nombre: sanitizeCompletely(name),
      email: sanitizeCompletely(email),
      telefono: sanitizeCompletely(phone),
      tipo_evento: sanitizeCompletely(eventType),
      mensaje: sanitizeCompletely(message),
    }

    console.log("Datos sanitizados para guardar mensaje:", sanitizedData)

    // Guardar en la base de datos
    const result = await db.contactoRepo.guardarMensaje(sanitizedData)

    // Enviar correo electrónico
    if (result.success) {
      try {
        const emailResult = await sendContactEmail(sanitizedData)
        console.log("Resultado del envío de correo:", emailResult)
      } catch (emailError) {
        console.error("Error al enviar correo electrónico:", emailError)
        // No redireccionamos con error porque el mensaje se guardó en la BD
      }

      res.redirect("/contacto?success=true")
    } else {
      console.error("Error al guardar mensaje de contacto:", result.message)
      res.redirect("/contacto?error=true")
    }
  } catch (error) {
    console.error("Error al procesar el formulario de contacto:", error)
    res.status(500).send("Error al procesar el formulario")
  }
})

// Actualizar la ruta para guardar cotizaciones
app.post("/quote-form", async (req, res) => {
  try {
    console.log("Datos recibidos del formulario de cotización:", req.body)

    const {
      fullName,
      email,
      phone,
      eventDate,
      numWaiters,
      serviceDuration,
      serviceLocation,
      eventType,
      lavalozas,
      cuidaCoches,
      montajeDesmontaje,
    } = req.body

    // Validar datos
    const errors = []

    if (!isNotEmpty(fullName)) errors.push("El nombre es obligatorio")
    else if (!isValidName(fullName)) errors.push("El nombre no es válido")

    if (!isNotEmpty(email)) errors.push("El correo electrónico es obligatorio")
    else if (!isValidEmail(email)) errors.push("El correo electrónico no es válido")

    if (!isNotEmpty(phone)) errors.push("El teléfono es obligatorio")
    else if (!isValidPhone(phone)) errors.push("El teléfono no es válido")

    if (!isNotEmpty(eventDate)) errors.push("La fecha del evento es obligatoria")
    else if (!isValidDate(eventDate)) errors.push("La fecha no es válida")
    else if (!isFutureDate(eventDate)) errors.push("La fecha debe ser futura")

    if (!isNotEmpty(numWaiters)) errors.push("El número de meseros es obligatorio")
    else if (!isPositiveInteger(numWaiters)) errors.push("El número de meseros debe ser un número entero positivo")

    if (!isNotEmpty(serviceDuration)) errors.push("La duración del servicio es obligatoria")
    if (!isNotEmpty(serviceLocation)) errors.push("La ubicación del servicio es obligatoria")
    if (!isNotEmpty(eventType)) errors.push("El tipo de evento es obligatorio")

    if (errors.length > 0) {
      console.log("Errores de validación en formulario de cotización:", errors)
      return res.redirect("/?error=true")
    }

    // Calcular el costo total
    let baseServiceCost = 0
    const numWaitersInt = Number.parseInt(numWaiters)
    const serviceDurationInt = Number.parseInt(serviceDuration)

    if (serviceDurationInt === 6) {
      baseServiceCost = numWaitersInt * 350
    } else if (serviceDurationInt === 8) {
      baseServiceCost = numWaitersInt * 450
    }

    let additionalServicesCost = 0
    if (lavalozas) additionalServicesCost += 300
    if (cuidaCoches) additionalServicesCost += 400
    if (montajeDesmontaje) additionalServicesCost += numWaitersInt * 80

    let locationCharge = 0
    const totalBeforeLocation = baseServiceCost + additionalServicesCost
    if (serviceLocation === "foraneo") {
      locationCharge = totalBeforeLocation * 0.2
    }

    const totalCost = totalBeforeLocation + locationCharge

    // Sanitizar datos
    const sanitizedData = {
      fullName: sanitizeCompletely(fullName),
      email: sanitizeCompletely(email),
      phone: sanitizeCompletely(phone),
      eventDate: sanitizeCompletely(eventDate),
      numWaiters: sanitizeCompletely(numWaiters),
      serviceDuration: sanitizeCompletely(serviceDuration),
      serviceLocation: sanitizeCompletely(serviceLocation),
      eventType: sanitizeCompletely(eventType),
      lavalozas: lavalozas ? true : false,
      cuidaCoches: cuidaCoches ? true : false,
      montajeDesmontaje: montajeDesmontaje ? true : false,
      baseServiceCost,
      additionalServicesCost,
      locationCharge,
      totalCost,
      status: "pendiente",
      createdAt: new Date().toISOString(),
    }

    console.log("Datos sanitizados para guardar cotización:", sanitizedData)

    // Guardar en la base de datos
    const result = await db.cotizacionesRepo.guardarCotizacion(sanitizedData)

    // Enviar correo electrónico
    if (result.success) {
      try {
        const emailResult = await sendQuotationEmail(sanitizedData)
        console.log("Resultado del envío de correo de cotización:", emailResult)
      } catch (emailError) {
        console.error("Error al enviar correo electrónico de cotización:", emailError)
        // No redireccionamos con error porque la cotización se guardó en la BD
      }

      res.redirect("/?quote=success")
    } else {
      console.error("Error al guardar cotización:", result.message)
      res.redirect("/?error=true")
    }
  } catch (error) {
    console.error("Error al procesar el formulario de cotización:", error)
    res.status(500).send("Error al procesar el formulario")
  }
})

app.post("/submit-review", async (req, res) => {
  try {
    console.log("Datos recibidos del formulario de reseña:", req.body)

    const { orderNumber, reviewerName, eventType, rating, reviewText, reviewImages } = req.body

    // Validar datos
    const errors = []

    if (!isNotEmpty(orderNumber)) errors.push("El número de orden es obligatorio")
    else if (!isValidContractNumber(orderNumber)) errors.push("El número de orden no es válido")

    if (!isNotEmpty(reviewerName)) errors.push("El nombre es obligatorio")
    else if (!isValidName(reviewerName)) errors.push("El nombre no es válido")

    if (!isNotEmpty(eventType)) errors.push("El tipo de evento es obligatorio")

    if (!isNotEmpty(rating)) errors.push("La calificación es obligatoria")
    else {
      const ratingNum = Number.parseInt(rating)
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        errors.push("La calificación debe ser un número entre 1 y 5")
      }
    }

    if (!isNotEmpty(reviewText)) errors.push("El texto de la reseña es obligatorio")
    else if (!isValidMessage(reviewText, 10, 500)) errors.push("La reseña debe tener entre 10 y 500 caracteres")

    if (errors.length > 0) {
      console.log("Errores de validación en formulario de reseña:", errors)
      return res.redirect(`/resenas?error=${encodeURIComponent(errors.join(", "))}`)
    }

    // Sanitizar datos
    const sanitizedData = {
      numero_contrato: sanitizeCompletely(orderNumber),
      nombre_cliente: sanitizeCompletely(reviewerName),
      tipo_evento_id: sanitizeCompletely(eventType),
      calificacion: Number.parseInt(sanitizeCompletely(rating)),
      comentario: sanitizeCompletely(reviewText),
      imagenes: reviewImages ? [sanitizeCompletely(reviewImages)] : [],
    }

    console.log("Datos sanitizados para agregar reseña:", sanitizedData)

    const result = await db.resenasRepo.agregarResena(sanitizedData)

    if (result.success) {
      res.redirect("/resenas?success=true")
    } else {
      res.redirect("/resenas?error=" + encodeURIComponent(result.message))
    }
  } catch (error) {
    console.error("Error al procesar la reseña:", error)
    res.status(500).send("Error al procesar la reseña")
  }
})

// Create necessary directories first, before starting the server
const directories = [
  "views",
  "views/layouts",
  "views/partials",
  "public",
  "public/css",
  "public/js",
  "public/img",
  "database",
  "utils",
]
directories.forEach((dir) => {
  const dirPath = path.join(__dirname, dir)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`Created directory: ${dirPath}`)
  }
})

// For demonstration purposes, let's create the main layout file
const mainLayoutContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400;500;700&display=swap" rel="stylesheet">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/form-validation.css">
</head>
<body>
    <!-- Navbar -->
    {{> navbar}}
    
    <!-- Contenido principal -->
    {{{body}}}
    
    <!-- Footer -->
    {{> footer}}
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Custom JS -->
    <script src="/js/main.js"></script>
    <script src="/js/form-validation.js"></script>
</body>
</html>
`

// Create the main layout file
fs.writeFileSync(path.join(__dirname, "views/layouts/main.handlebars"), mainLayoutContent)
console.log("Created main layout file")

// Inicializar la base de datos antes de iniciar el servidor
async function startServer() {
  try {
    // Asegurarse de que la base de datos esté inicializada
    await db.initializeDatabase()

    // Verificar que hay datos en la base de datos
    const services = await db.serviciosRepo.getAll()
    console.log(`La base de datos contiene ${services.length} servicios`)

    // Iniciar el servidor en todas las interfaces de red (0.0.0.0)
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}`)
      console.log(`For local access: http://localhost:${PORT}`)
      console.log(`For network access: https://192.168.1.138:${PORT}`)
      console.log("Project structure created successfully!")
      console.log("Base de datos SQLite configurada correctamente.")
    })
  } catch (error) {
    console.error("Error al iniciar el servidor:", error)
    process.exit(1)
  }
}

startServer()

