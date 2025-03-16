import sqlite3 from "sqlite3"
import { open } from "sqlite"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Variable para almacenar la conexión a la base de datos
let dbConnection = null

// Función para inicializar la base de datos
export async function initializeDatabase() {
  if (dbConnection) return dbConnection

  console.log("Inicializando la base de datos...")

  // Asegurarse de que el directorio database existe
  const dbDir = path.join(__dirname, "..")
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  try {
    // Abrir la conexión a la base de datos
    dbConnection = await open({
      filename: path.join(dbDir, "platoycopa.db"),
      driver: sqlite3.Database,
    })

    // Verificar si la base de datos ya tiene tablas
    const tableCheck = await dbConnection.get("SELECT name FROM sqlite_master WHERE type='table' AND name='servicios'")

    if (!tableCheck) {
      console.log("Creando esquema de la base de datos...")
      // Ejecutar el esquema SQL para crear las tablas
      const schemaPath = path.join(__dirname, "schema.sql")
      const schema = fs.readFileSync(schemaPath, "utf8")
      await dbConnection.exec(schema)
      console.log("Esquema de la base de datos creado correctamente")
    } else {
      console.log("La base de datos ya está inicializada")
    }

    console.log("Base de datos inicializada correctamente")
    return dbConnection
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error)
    throw error
  }
}

// Función para obtener la conexión a la base de datos
export async function getDb() {
  if (!dbConnection) {
    await initializeDatabase()
  }
  return dbConnection
}

// Repositorio de servicios
export const serviciosRepo = {
  async getAll() {
    const db = await getDb()
    try {
      const services = await db.all("SELECT * FROM servicios ORDER BY orden")
      console.log(`Obtenidos ${services.length} servicios`)
      return services
    } catch (error) {
      console.error("Error al obtener servicios:", error)
      return []
    }
  },

  async getDestacados() {
    const db = await getDb()
    try {
      const services = await db.all("SELECT * FROM servicios WHERE destacado = 1 ORDER BY orden")
      console.log(`Obtenidos ${services.length} servicios destacados`)
      return services
    } catch (error) {
      console.error("Error al obtener servicios destacados:", error)
      return []
    }
  },

  async getById(id) {
    const db = await getDb()
    try {
      return await db.get("SELECT * FROM servicios WHERE id = ?", id)
    } catch (error) {
      console.error(`Error al obtener servicio con id ${id}:`, error)
      return null
    }
  },
}

// Repositorio de tipos de eventos
export const tiposEventosRepo = {
  async getAll() {
    const db = await getDb()
    try {
      const tipos = await db.all("SELECT * FROM tipos_eventos")
      console.log(`Obtenidos ${tipos.length} tipos de eventos`)
      return tipos
    } catch (error) {
      console.error("Error al obtener tipos de eventos:", error)
      return []
    }
  },

  async getById(id) {
    const db = await getDb()
    try {
      return await db.get("SELECT * FROM tipos_eventos WHERE id = ?", id)
    } catch (error) {
      console.error(`Error al obtener tipo de evento con id ${id}:`, error)
      return null
    }
  },
}

// Repositorio de imágenes de galería
export const galeriaRepo = {
  async getAll(limit = 100) {
    const db = await getDb()
    try {
      const imagenes = await db.all(
        `
        SELECT g.*, t.nombre as tipo_evento 
        FROM imagenes_galeria g
        LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
        ORDER BY g.orden
        LIMIT ?
      `,
        limit,
      )
      console.log(`Obtenidas ${imagenes.length} imágenes de galería`)
      return imagenes
    } catch (error) {
      console.error("Error al obtener imágenes de galería:", error)
      return []
    }
  },

  async getDestacadas() {
    const db = await getDb()
    try {
      const imagenes = await db.all(`
        SELECT g.*, t.nombre as tipo_evento 
        FROM imagenes_galeria g
        LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
        WHERE g.destacada = 1
        ORDER BY g.orden
      `)
      console.log(`Obtenidas ${imagenes.length} imágenes destacadas`)
      return imagenes
    } catch (error) {
      console.error("Error al obtener imágenes destacadas:", error)
      return []
    }
  },

  async getByTipoEvento(tipoEventoId) {
    const db = await getDb()
    try {
      return await db.all(
        `
        SELECT g.*, t.nombre as tipo_evento 
        FROM imagenes_galeria g
        LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
        WHERE g.tipo_evento_id = ?
        ORDER BY g.orden
      `,
        tipoEventoId,
      )
    } catch (error) {
      console.error(`Error al obtener imágenes por tipo de evento ${tipoEventoId}:`, error)
      return []
    }
  },
}

// Repositorio de reseñas
export const resenasRepo = {
  async getAll(limit = 10) {
    const db = await getDb()
    try {
      const resenas = await db.all(
        `
        SELECT r.*, t.nombre as tipo_evento, t.icono as eventIcon 
        FROM resenas r
        LEFT JOIN tipos_eventos t ON r.tipo_evento_id = t.id
        WHERE r.verificado = 1
        ORDER BY r.id DESC
        LIMIT ?
      `,
        limit,
      )
      console.log(`Obtenidas ${resenas.length} reseñas`)
      return resenas
    } catch (error) {
      console.error("Error al obtener reseñas:", error)
      return []
    }
  },

  async agregarResena(resena) {
    const db = await getDb()
    try {
      const { numero_contrato, nombre_cliente, tipo_evento_id, calificacion, comentario, imagenes } = resena

      console.log("Datos para agregar reseña:", {
        numero_contrato,
        nombre_cliente,
        tipo_evento_id,
        calificacion,
        comentario,
        imagenes: JSON.stringify(imagenes || []),
      })

      // Verificar si el contrato existe en la tabla de contratos
      const contratoExiste = await contratosRepo.verificarContrato(numero_contrato)
      if (!contratoExiste) {
        console.log(`Reseña rechazada: El contrato ${numero_contrato} no existe en la base de datos`)
        return { success: false, message: "El número de contrato no es válido o no existe en nuestros registros." }
      }

      // Crear la fecha en formato español
      const fecha = new Date().toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      console.log("Intentando insertar reseña con fecha:", fecha)

      // Convertir tipo_evento_id a número si es string
      const tipoEventoId = typeof tipo_evento_id === "string" ? Number.parseInt(tipo_evento_id, 10) : tipo_evento_id

      // Preparar el JSON de imágenes
      const imagenesJSON = JSON.stringify(imagenes || [])

      try {
        const result = await db.run(
          `
          INSERT INTO resenas (numero_contrato, nombre_cliente, fecha, tipo_evento_id, calificacion, comentario, imagenes, verificado)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `,
          [numero_contrato, nombre_cliente, fecha, tipoEventoId, calificacion, comentario, imagenesJSON],
        )

        console.log("Reseña insertada correctamente con ID:", result.lastID)
        return { success: true, id: result.lastID }
      } catch (insertError) {
        console.error("Error específico al insertar reseña:", insertError)
        return { success: false, message: `Error al insertar: ${insertError.message}` }
      }
    } catch (error) {
      console.error("Error general al agregar reseña:", error)
      return { success: false, message: `Error al agregar la reseña: ${error.message}` }
    }
  },
}

// Repositorio de estadísticas
export const estadisticasRepo = {
  async getAll() {
    const db = await getDb()
    try {
      const stats = await db.all("SELECT * FROM estadisticas")
      console.log(`Obtenidas ${stats.length} estadísticas`)
      return stats
    } catch (error) {
      console.error("Error al obtener estadísticas:", error)
      return []
    }
  },
}

// Repositorio de equipo
export const equipoRepo = {
  async getAll() {
    const db = await getDb()
    try {
      const team = await db.all("SELECT * FROM equipo")
      console.log(`Obtenidos ${team.length} miembros del equipo`)
      return team
    } catch (error) {
      console.error("Error al obtener equipo:", error)
      return []
    }
  },
}

// Repositorio de contenido de página
export const contenidoRepo = {
  async getBySeccion(seccion) {
    const db = await getDb()
    try {
      return await db.get("SELECT * FROM contenido_pagina WHERE seccion = ?", seccion)
    } catch (error) {
      console.error(`Error al obtener contenido de sección ${seccion}:`, error)
      return null
    }
  },

  async getAll() {
    const db = await getDb()
    try {
      return await db.all("SELECT * FROM contenido_pagina ORDER BY orden")
    } catch (error) {
      console.error("Error al obtener contenido de página:", error)
      return []
    }
  },
}

// Repositorio de mensajes de contacto
export const contactoRepo = {
  async guardarMensaje(mensaje) {
    const db = await getDb()
    try {
      const { nombre, email, telefono, tipo_evento, mensaje: contenido } = mensaje

      const result = await db.run(
        `
        INSERT INTO contacto_mensajes (nombre, email, telefono, tipo_evento, mensaje)
        VALUES (?, ?, ?, ?, ?)
      `,
        [nombre, email, telefono, tipo_evento, contenido],
      )

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error("Error al guardar mensaje de contacto:", error)
      return { success: false, message: "Error al guardar el mensaje." }
    }
  },

  async getMensajesNoLeidos() {
    const db = await getDb()
    try {
      return await db.all("SELECT * FROM contacto_mensajes WHERE leido = 0 ORDER BY fecha_envio DESC")
    } catch (error) {
      console.error("Error al obtener mensajes no leídos:", error)
      return []
    }
  },
}

// Añadir al final del archivo, antes de export default

// Repositorio de cotizaciones
export const cotizacionesRepo = {
  async guardarCotizacion(cotizacion) {
    const db = await getDb()
    try {
      const result = await db.run(
        `
        INSERT INTO cotizaciones (
          nombre_cliente, 
          email, 
          telefono, 
          fecha_evento, 
          num_meseros, 
          duracion_servicio, 
          ubicacion, 
          tipo_evento_id, 
          lavalozas, 
          cuida_coches, 
          montaje_desmontaje, 
          costo_base, 
          costo_adicionales, 
          cargo_ubicacion, 
          costo_total, 
          estado, 
          fecha_creacion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          cotizacion.fullName,
          cotizacion.email,
          cotizacion.phone,
          cotizacion.eventDate,
          cotizacion.numWaiters,
          cotizacion.serviceDuration,
          cotizacion.serviceLocation,
          cotizacion.eventType,
          cotizacion.lavalozas ? 1 : 0,
          cotizacion.cuidaCoches ? 1 : 0,
          cotizacion.montajeDesmontaje ? 1 : 0,
          cotizacion.baseServiceCost,
          cotizacion.additionalServicesCost,
          cotizacion.locationCharge,
          cotizacion.totalCost,
          cotizacion.status,
          cotizacion.createdAt,
        ],
      )

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error("Error al guardar cotización:", error)
      return { success: false, message: "Error al guardar la cotización." }
    }
  },

  async getAll() {
    const db = await getDb()
    try {
      const cotizaciones = await db.all(`
        SELECT c.*, t.nombre as tipo_evento 
        FROM cotizaciones c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        ORDER BY c.fecha_creacion DESC
      `)
      return cotizaciones
    } catch (error) {
      console.error("Error al obtener cotizaciones:", error)
      return []
    }
  },

  async getById(id) {
    const db = await getDb()
    try {
      return await db.get(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM cotizaciones c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        WHERE c.id = ?
      `,
        id,
      )
    } catch (error) {
      console.error(`Error al obtener cotización con id ${id}:`, error)
      return null
    }
  },
}

// Repositorio de contratos
export const contratosRepo = {
  async getAll() {
    const db = await getDb()
    try {
      const contratos = await db.all(`
        SELECT c.*, t.nombre as tipo_evento 
        FROM contratos c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        ORDER BY c.fecha_creacion DESC
      `)
      console.log(`Obtenidos ${contratos.length} contratos`)
      return contratos
    } catch (error) {
      console.error("Error al obtener contratos:", error)
      return []
    }
  },

  async getByNumeroContrato(numeroContrato) {
    const db = await getDb()
    try {
      const contrato = await db.get(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM contratos c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        WHERE c.numero_contrato = ?
      `,
        numeroContrato,
      )
      return contrato
    } catch (error) {
      console.error(`Error al obtener contrato ${numeroContrato}:`, error)
      return null
    }
  },

  async verificarContrato(numeroContrato) {
    const db = await getDb()
    try {
      const result = await db.get("SELECT COUNT(*) as count FROM contratos WHERE numero_contrato = ?", numeroContrato)
      console.log(`Verificación de contrato ${numeroContrato}: ${result.count > 0 ? "Existe" : "No existe"}`)
      return result.count > 0
    } catch (error) {
      console.error(`Error al verificar contrato ${numeroContrato}:`, error)
      return false
    }
  },
}

// Inicializar la base de datos al importar este módulo
initializeDatabase().catch((err) => {
  console.error("Error al inicializar la base de datos:", err)
})

// Actualizar el export default para incluir el nuevo repositorio
export default {
  initializeDatabase,
  getDb,
  serviciosRepo,
  tiposEventosRepo,
  galeriaRepo,
  resenasRepo,
  estadisticasRepo,
  equipoRepo,
  contenidoRepo,
  contactoRepo,
  cotizacionesRepo,
  contratosRepo,
}

