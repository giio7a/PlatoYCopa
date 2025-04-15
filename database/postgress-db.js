import pg from "pg"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import bcrypt from "bcrypt"
import { getLocalDateTime } from "../app.js"
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Variable para almacenar la conexión a la base de datos
let dbPool = null

// Función para inicializar la base de datos
export async function initializeDatabase() {

  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  if (dbPool) return dbPool

  console.log("Inicializando la base de datos PostgreSQL...")

  try {
    // Crear el pool de conexiones a PostgreSQL
     dbPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    

    // Verificar la conexión
    const client = await dbPool.connect()
    console.log("Conexión a PostgreSQL establecida correctamente")

    // Verificar si la base de datos ya tiene tablas
    const tableCheck = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'servicios'",
    )

    if (tableCheck.rows.length === 0) {
      console.log("Creando esquema de la base de datos...")
      // Ejecutar el esquema SQL para crear las tablas
      const schemaPath = path.join(__dirname, "schema.sql")
      const schema = fs.readFileSync(schemaPath, "utf8")
      await client.query(schema)
      console.log("Esquema de la base de datos creado correctamente")
    } else {
      console.log("La base de datos ya está inicializada")
    }

    // Verificar si existe la tabla de usuarios
    const usuariosTable = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios'",
    )

    if (usuariosTable.rows.length === 0) {
      console.log("Creando tabla de usuarios...")
      await client.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          nombre TEXT,
          rol TEXT DEFAULT 'admin',
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ultimo_acceso TIMESTAMP,
          telefono TEXT,
          imagen_url TEXT,
          activo INTEGER DEFAULT 1
        );
      `)
    } else {
      // Verificar si existen las columnas telefono e imagen_url
      const telefonoColumnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'telefono'
      `)

      if (telefonoColumnCheck.rows.length === 0) {
        console.log("Añadiendo columna 'telefono' a la tabla usuarios")
        await client.query("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
      }

      const imagenColumnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'imagen_url'
      `)

      if (imagenColumnCheck.rows.length === 0) {
        console.log("Añadiendo columna 'imagen_url' a la tabla usuarios")
        await client.query("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT")
      }

      const activoColumnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'activo'
      `)

      if (activoColumnCheck.rows.length === 0) {
        console.log("Añadiendo columna 'activo' a la tabla usuarios")
        await client.query("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
      }
    }

    client.release()
    console.log("Base de datos PostgreSQL inicializada correctamente")
    return dbPool
  } catch (error) {
    console.error("Error al inicializar la base de datos PostgreSQL:", error)
    throw error
  }
}

// Función para obtener la conexión a la base de datos
export async function getDb() {
  if (!dbPool) {
    await initializeDatabase()
  }
  return dbPool
}

// Función para ejecutar consultas
async function query(text, params) {
  const pool = await getDb()
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// Repositorio de usuarios
export const usuariosRepo = {
  async verificarCredenciales(email, password) {
    try {
      const result = await query("SELECT * FROM usuarios WHERE email = $1", [email])
      const usuario = result.rows[0]

      if (!usuario) {
        return { success: false, message: "Usuario no encontrado" }
      }

      // Verificar si el usuario está activo
      if (!usuario.activo) {
        return { success: false, message: "Usuario desactivado. Contacte al administrador." }
      }

      const passwordMatch = await bcrypt.compare(password, usuario.password)

      if (!passwordMatch) {
        return { success: false, message: "Contraseña incorrecta" }
      }

      // Actualizar último acceso
      await query("UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1", [usuario.id])

      return {
        success: true,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          telefono: usuario.telefono,
          imagen_url: usuario.imagen_url,
          activo: usuario.activo,
        },
      }
    } catch (error) {
      console.error("Error al verificar credenciales:", error)
      return { success: false, message: "Error al verificar credenciales" }
    }
  },

  async getByEmail(email) {
    try {
      const result = await query(
        "SELECT id, email, nombre, password, rol, fecha_creacion, ultimo_acceso, telefono, imagen_url, activo FROM usuarios WHERE email = $1",
        [email],
      )
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener usuario con email ${email}:`, error)
      return null
    }
  },

  async crearUsuario(userData) {
    try {
      let { email, password, nombre, rol = "admin", telefono, imagen_url, activo } = userData

      console.log(
        `Intentando crear usuario con email: ${email}, nombre: ${nombre}, rol: ${rol}, telefono: ${telefono}, imagen: ${imagen_url ? "Sí" : "No"}, activo: ${activo}`,
      )

      // 👉 Forzar rol admin si es el correo oficial
      if (email.trim().toLowerCase() === "platoycopa.oficial@gmail.com") {
        rol = "admin"
        console.log("Correo oficial detectado, rol forzado a administrador.")
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.getByEmail(email)
      if (existingUser) {
        console.log(`Error: El email ${email} ya está registrado`)
        return { success: false, message: "El correo electrónico ya está registrado" }
      }

      // Verificar si existen las columnas necesarias
      const pool = await getDb()
      const client = await pool.connect()

      try {
        // Verificar columna activo
        const activoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'activo'
        `)

        if (activoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'activo' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
        }

        // Verificar columna telefono
        const telefonoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'telefono'
        `)

        if (telefonoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'telefono' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
        }

        // Verificar columna imagen_url
        const imagenColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'imagen_url'
        `)

        if (imagenColumnCheck.rows.length === 0) {
          console.log("Creando columna 'imagen_url' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT")
        }

        // Insertar el nuevo usuario
        console.log("Insertando nuevo usuario en la base de datos")
        const result = await client.query(
          "INSERT INTO usuarios (email, password, nombre, rol, activo, telefono, imagen_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
          [email, password, nombre, rol, activo !== undefined ? activo : 1, telefono || null, imagen_url || null],
        )

        console.log(`Usuario creado con ID: ${result.rows[0].id}`)
        return { success: true, id: result.rows[0].id }
      } finally {
        client.release()
      }
    } catch (error) {
      console.error("Error al crear usuario:", error)
      return { success: false, message: `Error al crear usuario: ${error.message}` }
    }
  },

  async cambiarPassword(email, newPassword) {
    try {
      // Actualizar la contraseña
      const result = await query("UPDATE usuarios SET password = $1 WHERE email = $2", [newPassword, email])

      if (result.rowCount === 0) {
        return { success: false, message: "Usuario no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al cambiar contraseña:", error)
      return { success: false, message: `Error al cambiar contraseña: ${error.message}` }
    }
  },

  // Asegurarse de que la función getAll devuelva el campo activo
  async getAll() {
    try {
      const pool = await getDb()
      const client = await pool.connect()

      try {
        // Verificar columna activo
        const activoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'activo'
        `)

        if (activoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'activo' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
        }

        // Verificar columna telefono
        const telefonoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'telefono'
        `)

        if (telefonoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'telefono' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
        }

        // Verificar columna imagen_url
        const imagenColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'imagen_url'
        `)

        if (imagenColumnCheck.rows.length === 0) {
          console.log("Creando columna 'imagen_url' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT")
        }

        // Obtener todos los usuarios con el campo activo
        const result = await client.query(
          "SELECT id, email, nombre, rol, fecha_creacion, ultimo_acceso, activo, telefono, imagen_url FROM usuarios",
        )

        console.log(`Obtenidos ${result.rows.length} usuarios`)

        // Asegurarse de que todos los usuarios tengan el campo activo
        return result.rows.map((usuario) => ({
          ...usuario,
          activo: usuario.activo !== undefined ? usuario.activo : 1,
          telefono: usuario.telefono || "",
          imagen_url: usuario.imagen_url || null,
        }))
      } finally {
        client.release()
      }
    } catch (error) {
      console.error("Error al obtener usuarios:", error)
      return []
    }
  },

  // Asegurarse de que la función getById devuelva el campo activo
  async getById(id) {
    try {
      const pool = await getDb()
      const client = await pool.connect()

      try {
        // Verificar columna activo
        const activoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'activo'
        `)

        if (activoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'activo' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
        }

        // Verificar columna telefono
        const telefonoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'telefono'
        `)

        if (telefonoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'telefono' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
        }

        // Verificar columna imagen_url
        const imagenColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'imagen_url'
        `)

        if (imagenColumnCheck.rows.length === 0) {
          console.log("Creando columna 'imagen_url' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT")
        }

        // Obtener el usuario con el campo activo
        const result = await client.query(
          "SELECT id, email, nombre, rol, fecha_creacion, ultimo_acceso, activo, telefono, imagen_url, password FROM usuarios WHERE id = $1",
          [id],
        )

        const usuario = result.rows[0]

        if (usuario) {
          // Asegurarse de que el usuario tenga el campo activo
          return {
            ...usuario,
            activo: usuario.activo !== undefined ? usuario.activo : 1,
            telefono: usuario.telefono || "",
            imagen_url: usuario.imagen_url || null,
          }
        }

        return null
      } finally {
        client.release()
      }
    } catch (error) {
      console.error(`Error al obtener usuario con id ${id}:`, error)
      return null
    }
  },

  async getAllRoles() {
    try {
      const result = await query("SELECT rol, COUNT(*) as count FROM usuarios GROUP BY rol")
      return result.rows
    } catch (error) {
      console.error("Error al obtener roles:", error)
      return []
    }
  },

  async actualizarUsuario(id, userData) {
    try {
      const { email, nombre, rol, activo, telefono, imagen_url } = userData

      // Verificar si el email ya está en uso por otro usuario
      if (email) {
        const existingUser = await this.getByEmail(email)
        console.log("datos:", existingUser)
        if (existingUser && Number(existingUser.id) !== Number(id)) {
          return { success: false, message: "El correo electrónico ya está registrado por otro usuario" }
        }
      }

      // Construir la consulta SQL dinámicamente
      let sql = "UPDATE usuarios SET "
      const params = []
      const fields = []
      let paramIndex = 1

      if (email) {
        fields.push(`email = $${paramIndex++}`)
        params.push(email)
      }

      if (nombre) {
        fields.push(`nombre = $${paramIndex++}`)
        params.push(nombre)
      }

      if (rol) {
        fields.push(`rol = $${paramIndex++}`)
        params.push(rol)
      }

      if (activo !== undefined) {
        fields.push(`activo = $${paramIndex++}`)
        params.push(activo)
      }

      if (telefono !== undefined) {
        fields.push(`telefono = $${paramIndex++}`)
        params.push(telefono)
      }

      if (imagen_url !== undefined) {
        fields.push(`imagen_url = $${paramIndex++}`)
        params.push(imagen_url)
      }

      sql += fields.join(", ") + ` WHERE id = $${paramIndex}`
      params.push(id)

      // Actualizar los datos del usuario
      const result = await query(sql, params)

      if (result.rowCount === 0) {
        return { success: false, message: "Usuario no encontrado o no se realizaron cambios" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar usuario con id ${id}:`, error)
      return { success: false, message: `Error al actualizar usuario: ${error.message}` }
    }
  },

  async actualizarPassword(id, newPassword) {
    try {
      // Encriptar la nueva contraseña
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

      // Actualizar la contraseña
      const result = await query("UPDATE usuarios SET password = $1 WHERE id = $2", [hashedPassword, id])

      if (result.rowCount === 0) {
        return { success: false, message: "Usuario no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al cambiar contraseña del usuario con id ${id}:`, error)
      return { success: false, message: `Error al cambiar contraseña: ${error.message}` }
    }
  },

  // Modificar la función activarUsuario para asegurar que la columna activo existe y se actualiza correctamente
  async activarUsuario(id) {
    try {
      const pool = await getDb()
      const client = await pool.connect()

      try {
        // Verificar columna activo
        const activoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'activo'
        `)

        if (activoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'activo' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
        }

        // Actualizar el estado a activo (1)
        console.log(`Activando usuario con ID ${id}`)
        const result = await client.query("UPDATE usuarios SET activo = 1 WHERE id = $1", [id])
        console.log(`Resultado de activación: ${result.rowCount} filas afectadas`)

        if (result.rowCount === 0) {
          return { success: false, message: "Usuario no encontrado o ya está activo" }
        }

        return { success: true }
      } finally {
        client.release()
      }
    } catch (error) {
      console.error(`Error al activar usuario con id ${id}:`, error)
      return { success: false, message: `Error al activar usuario: ${error.message}` }
    }
  },

  // Modificar la función desactivarUsuario para asegurar que la columna activo existe y se actualiza correctamente
  async desactivarUsuario(id) {
    try {
      const pool = await getDb()
      const client = await pool.connect()

      try {
        // Verificar columna activo
        const activoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = 'activo'
        `)

        if (activoColumnCheck.rows.length === 0) {
          console.log("Creando columna 'activo' en la tabla usuarios")
          await client.query("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
        }

        // Actualizar el estado a inactivo (0)
        console.log(`Desactivando usuario con ID ${id}`)
        const result = await client.query("UPDATE usuarios SET activo = 0 WHERE id = $1", [id])
        console.log(`Resultado de desactivación: ${result.rowCount} filas afectadas`)

        if (result.rowCount === 0) {
          return { success: false, message: "Usuario no encontrado o ya está inactivo" }
        }

        return { success: true }
      } finally {
        client.release()
      }
    } catch (error) {
      console.error(`Error al desactivar usuario con id ${id}:`, error)
      return { success: false, message: `Error al desactivar usuario: ${error.message}` }
    }
  },

  async actualizarUltimoAcceso(id) {
    try {
      // Obtener fecha y hora local
      const fechaAcceso = await getLocalDateTime()

      const result = await query("UPDATE usuarios SET ultimo_acceso = $1 WHERE id = $2", [
        fechaAcceso.toISOString(),
        id,
      ])

      if (result.rowCount === 0) {
        return { success: false, message: "Usuario no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar último acceso del usuario con id ${id}:`, error)
      return { success: false, message: `Error al actualizar último acceso: ${error.message}` }
    }
  },

  async eliminarUsuario(id) {
    try {
      // Verificar si el usuario existe
      const usuario = await this.getById(id)
      if (!usuario) {
        return { success: false, message: "Usuario no encontrado" }
      }

      // Eliminar el usuario
      await query("DELETE FROM usuarios WHERE id = $1", [id])

      return {
        success: true,
        message:
          "Usuario eliminado correctamente. Considere desactivar usuarios en lugar de eliminarlos para mantener la integridad de los datos históricos.",
      }
    } catch (error) {
      console.error(`Error al eliminar usuario con id ${id}:`, error)
      return { success: false, message: `Error al eliminar usuario: ${error.message}` }
    }
  },
}

// Repositorio de servicios
export const serviciosRepo = {
  async crear(servicio) {
    try {
      const result = await query(
        `INSERT INTO servicios (
          titulo, descripcion_corta, descripcion_completa, 
          precio, precio_desde, imagen_url, icono, 
          caracteristicas, destacado, orden
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          servicio.titulo,
          servicio.descripcion_corta,
          servicio.descripcion_completa,
          servicio.precio,
          servicio.precio_desde,
          servicio.imagen_url,
          servicio.icono,
          servicio.caracteristicas,
          servicio.destacado,
          servicio.orden,
        ],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al crear servicio:", error)
      return { success: false, message: "Error al crear el servicio" }
    }
  },

  async actualizar(servicio) {
    try {
      await query(
        `UPDATE servicios SET 
          titulo = $1, 
          descripcion_corta = $2, 
          descripcion_completa = $3, 
          precio = $4, 
          precio_desde = $5, 
          imagen_url = $6, 
          icono = $7, 
          caracteristicas = $8, 
          destacado = $9, 
          orden = $10,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $11`,
        [
          servicio.titulo,
          servicio.descripcion_corta,
          servicio.descripcion_completa,
          servicio.precio,
          servicio.precio_desde,
          servicio.imagen_url,
          servicio.icono,
          servicio.caracteristicas,
          servicio.destacado,
          servicio.orden,
          servicio.id,
        ],
      )

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar servicio:", error)
      return { success: false, message: "Error al actualizar el servicio" }
    }
  },

  async eliminar(id) {
    try {
      const result = await query("DELETE FROM servicios WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Servicio no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar servicio:", error)
      return { success: false, message: `Error al eliminar servicio: ${error.message}` }
    }
  },

  async getAll() {
    try {
      const result = await query("SELECT * FROM servicios ORDER BY orden")
      console.log(`Obtenidos ${result.rows.length} servicios`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener servicios:", error)
      return []
    }
  },

  async getDestacados() {
    try {
      const result = await query("SELECT * FROM servicios WHERE destacado = 1 ORDER BY orden")
      console.log(`Obtenidos ${result.rows.length} servicios destacados`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener servicios destacados:", error)
      return []
    }
  },

  async getById(id) {
    try {
      const result = await query("SELECT * FROM servicios WHERE id = $1", [id])
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener servicio con id ${id}:`, error)
      return null
    }
  },

  async getCount() {
    try {
      const result = await query("SELECT COUNT(*) as count FROM servicios")
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      console.error("Error al obtener el conteo de servicios:", error)
      return 0
    }
  },
}

// Repositorio de tipos de eventos
export const tiposEventosRepo = {
  async crear(tipoEvento) {
    try {
      const result = await query(
        `INSERT INTO tipos_eventos (
          nombre, 
          descripcion, 
          icono
        ) VALUES ($1, $2, $3) RETURNING id`,
        [tipoEvento.nombre, tipoEvento.descripcion, tipoEvento.icono],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al crear tipo de evento:", error)
      return { success: false, message: `Error al crear tipo de evento: ${error.message}` }
    }
  },

  // Método para actualizar un tipo de evento
  async actualizar(id, tipoEvento) {
    try {
      const result = await query(
        `UPDATE tipos_eventos SET 
          nombre = $1, 
          descripcion = $2, 
          icono = $3
        WHERE id = $4`,
        [tipoEvento.nombre, tipoEvento.descripcion, tipoEvento.icono, id],
      )

      if (result.rowCount === 0) {
        return { success: false, message: "Tipo de evento no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar tipo de evento:", error)
      return { success: false, message: `Error al actualizar tipo de evento: ${error.message}` }
    }
  },

  // Método para eliminar un tipo de evento
  async eliminar(id) {
    try {
      const result = await query("DELETE FROM tipos_eventos WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Tipo de evento no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar tipo de evento:", error)
      return { success: false, message: `Error al eliminar tipo de evento: ${error.message}` }
    }
  },

  // Método para verificar si un tipo de evento está siendo utilizado
  async isInUse(id) {
    try {
      // Verificar en eventos
      const eventosResult = await query("SELECT COUNT(*) as count FROM contratos WHERE tipo_evento_id = $1", [id])
      const eventosCount = Number.parseInt(eventosResult.rows[0].count)

      // Verificar en reseñas
      const resenasResult = await query("SELECT COUNT(*) as count FROM resenas WHERE tipo_evento_id = $1", [id])
      const resenasCount = Number.parseInt(resenasResult.rows[0].count)

      // Verificar en cotizaciones
      const cotizacionesResult = await query("SELECT COUNT(*) as count FROM cotizaciones WHERE tipo_evento_id = $1", [
        id,
      ])
      const cotizacionesCount = Number.parseInt(cotizacionesResult.rows[0].count)

      return eventosCount > 0 || resenasCount > 0 || cotizacionesCount > 0
    } catch (error) {
      console.error("Error al verificar uso de tipo de evento:", error)
      // En caso de error, asumimos que está en uso para prevenir eliminaciones incorrectas
      return true
    }
  },

  async getAll() {
    try {
      const result = await query("SELECT * FROM tipos_eventos")
      console.log(`Obtenidos ${result.rows.length} tipos de eventos`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener tipos de eventos:", error)
      return []
    }
  },

  async getById(id) {
    try {
      const result = await query("SELECT * FROM tipos_eventos WHERE id = $1", [id])
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener tipo de evento con id ${id}:`, error)
      return null
    }
  },

  // Método agregado para obtener tipos de eventos con un conteo (por ejemplo, de servicios asociados)
  async getAllWithCountImages() {
    try {
      const result = await query(
        `SELECT t.*, 
              (SELECT COUNT(*) FROM imagenes_galeria WHERE tipo_evento_id = t.id) as count
        FROM tipos_eventos t
        WHERE (SELECT COUNT(*) FROM imagenes_galeria WHERE tipo_evento_id = t.id) > 0
        ORDER BY count DESC
        LIMIT 6`,
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener tipos de eventos con count:", error)
      return []
    }
  },

  async getAllWithCountResenas() {
    try {
      const result = await query(
        `SELECT t.*, 
              (SELECT COUNT(*) FROM resenas WHERE tipo_evento_id = t.id) as count
        FROM tipos_eventos t
        WHERE (SELECT COUNT(*) FROM resenas WHERE tipo_evento_id = t.id) > 0
        ORDER BY count DESC
        LIMIT 6`,
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener tipos de eventos con count:", error)
      return []
    }
  },
}

// Repositorio de imágenes de galería
export const galeriaRepo = {
  // Método para crear una imagen
  async crear(imagen) {
    try {
      const result = await query(
        `INSERT INTO imagenes_galeria (
        titulo, 
        descripcion, 
        tipo_evento_id, 
        url_imagen, 
        orden, 
        destacada
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [imagen.titulo, imagen.descripcion, imagen.tipo_evento_id, imagen.url_imagen, imagen.orden, imagen.destacada],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al crear imagen:", error)
      return { success: false, message: `Error al crear imagen: ${error.message}` }
    }
  },

  // Método para actualizar una imagen
  async actualizar(imagen) {
    try {
      const result = await query(
        `UPDATE imagenes_galeria SET
        titulo = $1, 
        descripcion = $2, 
        tipo_evento_id = $3, 
        url_imagen = COALESCE($4, url_imagen), 
        orden = $5, 
        destacada = $6
      WHERE id = $7`,
        [
          imagen.titulo,
          imagen.descripcion,
          imagen.tipo_evento_id,
          imagen.url_imagen,
          imagen.orden,
          imagen.destacada,
          imagen.id,
        ],
      )

      if (result.rowCount === 0) {
        return { success: false, message: "Imagen no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar imagen:", error)
      return { success: false, message: `Error al actualizar imagen: ${error.message}` }
    }
  },

  // Método para eliminar una imagen
  async eliminar(id) {
    try {
      const result = await query("DELETE FROM imagenes_galeria WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Imagen no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar imagen:", error)
      return { success: false, message: `Error al eliminar imagen: ${error.message}` }
    }
  },

  async getById(id) {
    try {
      const result = await query(
        "SELECT id, titulo, descripcion, url_imagen, url_imagen_completa, tipo_evento_id, destacada, orden FROM imagenes_galeria WHERE id = $1",
        [id],
      )
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener imagen con id ${id}:`, error)
      return null
    }
  },

  // Método para obtener imágenes destacadas
  async getDestacadas(limit = 6) {
    try {
      const result = await query(
        `SELECT * FROM imagenes_galeria 
       WHERE destacada = 1 
       ORDER BY orden ASC
       LIMIT $1`,
        [limit],
      )

      return result.rows
    } catch (error) {
      console.error("Error al obtener imágenes destacadas:", error)
      return []
    }
  },

  // Método para obtener imágenes por tipo de evento
  async getByTipoEvento(tipoEventoId, limit = 12, offset = 0) {
    try {
      const result = await query(
        `SELECT * FROM imagenes_galeria 
       WHERE tipo_evento_id = $1 
       ORDER BY orden ASC
       LIMIT $2 OFFSET $3`,
        [tipoEventoId, limit, offset],
      )

      return result.rows
    } catch (error) {
      console.error(`Error al obtener imágenes por tipo de evento ${tipoEventoId}:`, error)
      return []
    }
  },

  // Método para contar imágenes por tipo de evento
  async getCountByTipoEvento(tipoEventoId) {
    try {
      const result = await query("SELECT COUNT(*) as count FROM imagenes_galeria WHERE tipo_evento_id = $1", [
        tipoEventoId,
      ])

      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      console.error(`Error al contar imágenes por tipo de evento ${tipoEventoId}:`, error)
      return 0
    }
  },

  async getAll(limit = 100) {
    try {
      const result = await query(
        `
        SELECT g.*, t.nombre as tipo_evento 
        FROM imagenes_galeria g
        LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
        ORDER BY g.orden
        LIMIT $1
      `,
        [limit],
      )
      console.log(`Obtenidas ${result.rows.length} imágenes de galería`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener imágenes de galería:", error)
      return []
    }
  },

  async getDestacadas() {
    try {
      const result = await query(
        `
        SELECT g.*, t.nombre as tipo_evento 
        FROM imagenes_galeria g
        LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
        WHERE g.destacada = 1
        ORDER BY g.orden
      `,
      )
      console.log(`Obtenidas ${result.rows.length} imágenes destacadas`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener imágenes destacadas:", error)
      return []
    }
  },

  async getByTipoEvento(tipoEventoId) {
    try {
      const result = await query(
        `
        SELECT g.*, t.nombre as tipo_evento 
        FROM imagenes_galeria g
        LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
        WHERE g.tipo_evento_id = $1
        ORDER BY g.orden
      `,
        [tipoEventoId],
      )
      return result.rows
    } catch (error) {
      console.error(`Error al obtener imágenes por tipo de evento ${tipoEventoId}:`, error)
      return []
    }
  },

  async getCount() {
    try {
      const result = await query("SELECT COUNT(*) as count FROM imagenes_galeria")
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      console.error("Error al obtener el conteo de la galería:", error)
      return 0
    }
  },
}

// Repositorio de reseñas
export const resenasRepo = {
  async getByContrato(numero_contrato) {
    try {
      const result = await query("SELECT * FROM resenas WHERE numero_contrato = $1", [numero_contrato])
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener reseña con número de contrato ${numero_contrato}:`, error)
      throw error
    }
  },

  async getAll(limit = 10) {
    try {
      const result = await query(
        `
        SELECT r.*, t.nombre as tipo_evento, t.icono as eventIcon 
        FROM resenas r
        LEFT JOIN tipos_eventos t ON r.tipo_evento_id = t.id
        WHERE r.verificado = 1
        ORDER BY r.id DESC
        LIMIT $1
      `,
        [limit],
      )
      console.log(`Obtenidas ${result.rows.length} reseñas`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener reseñas:", error)
      return []
    }
  },

  async agregarResena(resena) {
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
        const result = await query(
          `
          INSERT INTO resenas (numero_contrato, nombre_cliente, fecha, tipo_evento_id, calificacion, comentario, imagenes, verificado)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 1) RETURNING id
        `,
          [numero_contrato, nombre_cliente, fecha, tipoEventoId, calificacion, comentario, imagenesJSON],
        )

        console.log("Reseña insertada correctamente con ID:", result.rows[0].id)
        return { success: true, id: result.rows[0].id }
      } catch (insertError) {
        console.error("Error específico al insertar reseña:", insertError)
        return { success: false, message: `Error al insertar: ${insertError.message}` }
      }
    } catch (error) {
      console.error("Error general al agregar reseña:", error)
      return { success: false, message: `Error al agregar la reseña: ${error.message}` }
    }
  },

  async getCount() {
    try {
      const result = await query("SELECT COUNT(*) as count FROM resenas")
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      console.error("Error al obtener el conteo de reseñas:", error)
      return 0
    }
  },

  // Nuevo método para obtener estadísticas de calificaciones, agrupadas por calificación
  async getRatingStats() {
    try {
      const result = await query(
        `SELECT calificacion, COUNT(*) as count 
       FROM resenas 
       WHERE verificado = 1 
       GROUP BY calificacion`,
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener estadísticas de reseñas:", error)
      return []
    }
  },

  async getAllWithDetails() {
    try {
      const result = await query(`
      SELECT r.*, te.nombre as tipo_evento, 
             CASE WHEN r.verificado = 1 THEN 1 ELSE 0 END as aprobada
      FROM resenas r
      LEFT JOIN tipos_eventos te ON r.tipo_evento_id = te.id
      ORDER BY r.id DESC
    `)
      return result.rows
    } catch (error) {
      console.error("Error al obtener reseñas:", error)
      return []
    }
  },

  // Obtener una reseña por ID
  async getById(id) {
    try {
      const result = await query(
        `
      SELECT r.*, 
             CASE WHEN r.verificado = 1 THEN 1 ELSE 0 END as aprobada
      FROM resenas r
      WHERE r.id = $1
    `,
        [id],
      )
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Crear una nueva reseña
  async create(resenaDatos) {
    try {
      // Convertir aprobada a verificado
      const verificado = resenaDatos.aprobada ? 1 : 0
      // Preparar datos para inserción
      const {
        nombre_cliente,
        fecha,
        tipo_evento_id,
        calificacion,
        comentario,
        numero_contrato = null,
        imagenes = "[]",
      } = resenaDatos

      const result = await query(
        `
      INSERT INTO resenas (
        nombre_cliente, 
        fecha, 
        tipo_evento_id, 
        calificacion, 
        comentario, 
        numero_contrato,
        imagenes,
        verificado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
        [nombre_cliente, fecha, tipo_evento_id, calificacion, comentario, numero_contrato, imagenes, verificado],
      )
      return { id: result.rows[0].id, ...resenaDatos }
    } catch (error) {
      console.error("Error al crear reseña:", error)
      throw error
    }
  },

  // Actualizar una reseña existente
  async update(id, resenaDatos) {
    try {
      // Convertir aprobada a verificado
      const verificado = resenaDatos.aprobada ? 1 : 0
      // Preparar datos para actualización
      const { nombre_cliente, fecha, tipo_evento_id, calificacion, comentario, numero_contrato, imagenes } = resenaDatos

      await query(
        `
      UPDATE resenas 
      SET nombre_cliente = $1,
          fecha = $2,
          tipo_evento_id = $3,
          calificacion = $4,
          comentario = $5,
          numero_contrato = $6,
          imagenes = $7,
          verificado = $8
      WHERE id = $9
    `,
        [
          nombre_cliente,
          fecha,
          tipo_evento_id,
          calificacion,
          comentario,
          numero_contrato || null,
          imagenes || "[]",
          verificado,
          id,
        ],
      )
      return { id, ...resenaDatos }
    } catch (error) {
      console.error(`Error al actualizar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Eliminar una reseña
  async delete(id) {
    try {
      await query("DELETE FROM resenas WHERE id = $1", [id])
      return { id, deleted: true }
    } catch (error) {
      console.error(`Error al eliminar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Aprobar una reseña
  async approve(id) {
    try {
      await query("UPDATE resenas SET verificado = 1 WHERE id = $1", [id])
      return { id, approved: true }
    } catch (error) {
      console.error(`Error al aprobar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Desaprobar una reseña
  async disapprove(id) {
    try {
      await query("UPDATE resenas SET verificado = 0 WHERE id = $1", [id])
      return { id, disapproved: true }
    } catch (error) {
      console.error(`Error al desaprobar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Obtener reseñas aprobadas para mostrar en el sitio público
  async getApprovedReviews(limit = 6) {
    try {
      const result = await query(
        `
      SELECT r.*, te.nombre as tipo_evento
      FROM resenas r
      LEFT JOIN tipos_eventos te ON r.tipo_evento_id = te.id
      WHERE r.verificado = 1
      ORDER BY r.id DESC
      LIMIT $1
    `,
        [limit],
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener reseñas aprobadas:", error)
      throw error
    }
  },

  // Inside resenasRepo object, add this method:
  async getByTipoEvento(tipoEventoId, limit = 10) {
    try {
      const result = await query(
        `
      SELECT r.*, t.nombre as tipo_evento, t.icono as eventIcon 
      FROM resenas r
      LEFT JOIN tipos_eventos t ON r.tipo_evento_id = t.id
      WHERE r.verificado = 1 AND r.tipo_evento_id = $1
      ORDER BY r.id DESC
      LIMIT $2
      `,
        [tipoEventoId, limit],
      )
      console.log(`Obtenidas ${result.rows.length} reseñas para el tipo de evento ${tipoEventoId}`)
      return result.rows
    } catch (error) {
      console.error(`Error al obtener reseñas para el tipo de evento ${tipoEventoId}:`, error)
      return []
    }
  },

  // Método para incrementar los likes de una reseña
  async incrementLikes(reviewId) {
    try {
      // Verificar si la reseña existe
      const review = await this.getById(reviewId)
      if (!review) {
        return { success: false, message: "Reseña no encontrada" }
      }

      // Incrementar los likes
      const currentLikes = review.likes || 0
      const newLikes = currentLikes + 1

      const result = await query("UPDATE resenas SET likes = $1 WHERE id = $2", [newLikes, reviewId])

      if (result.rowCount === 0) {
        return { success: false, message: "No se pudo actualizar los likes" }
      }

      return { success: true, likes: newLikes }
    } catch (error) {
      console.error(`Error al incrementar likes de la reseña ${reviewId}:`, error)
      return { success: false, message: "Error al incrementar likes" }
    }
  },

  // Método para obtener las reseñas con más likes
  async getMostLiked(limit = 5) {
    try {
      const result = await query(
        `
        SELECT r.*, t.nombre as tipo_evento, t.icono as eventIcon 
        FROM resenas r
        LEFT JOIN tipos_eventos t ON r.tipo_evento_id = t.id
        WHERE r.verificado = 1
        ORDER BY r.likes DESC, r.id DESC
        LIMIT $1
        `,
        [limit],
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener reseñas más gustadas:", error)
      return []
    }
  },
}

// Repositorio de estadísticas
export const estadisticasRepo = {
  async getAll() {
    try {
      const result = await query("SELECT * FROM estadisticas")
      console.log(`Obtenidas ${result.rows.length} estadísticas`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener estadísticas:", error)
      return []
    }
  },
}

// Repositorio de equipo
export const equipoRepo = {
  async getAll() {
    try {
      // Verificar si la tabla existe
      const tableCheck = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'equipo'
      `)

      if (tableCheck.rows.length === 0) {
        // Crear la tabla si no existe
        await query(`
          CREATE TABLE IF NOT EXISTS equipo (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            posicion TEXT NOT NULL,
            bio TEXT,
            imagen TEXT,
            orden INTEGER DEFAULT 0,
            redes_sociales TEXT DEFAULT '{}',
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `)
        return []
      }

      const result = await query("SELECT * FROM equipo ORDER BY orden ASC")
      console.log(`Obtenidos ${result.rows.length} miembros del equipo`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener equipo:", error)
      return []
    }
  },

  async getById(id) {
    try {
      const result = await query("SELECT * FROM equipo WHERE id = $1", [id])
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener miembro del equipo con id ${id}:`, error)
      return null
    }
  },

  async crear(miembroData) {
    try {
      const { nombre, cargo, descripcion, foto_url, orden, redes_sociales } = miembroData

      // Verify if the table exists
      const tableCheck = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'equipo'
      `)

      if (tableCheck.rows.length === 0) {
        // Create the table if it doesn't exist with the redes_sociales column
        await query(`
          CREATE TABLE IF NOT EXISTS equipo (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            posicion TEXT NOT NULL,
            bio TEXT,
            imagen TEXT,
            orden INTEGER DEFAULT 0,
            redes_sociales TEXT DEFAULT '{}',
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `)
      } else {
        // Check if redes_sociales column exists
        const redesColumnCheck = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'equipo' 
          AND column_name = 'redes_sociales'
        `)

        // Add redes_sociales column if it doesn't exist
        if (redesColumnCheck.rows.length === 0) {
          await query("ALTER TABLE equipo ADD COLUMN redes_sociales TEXT DEFAULT '{}'")
        }
      }

      // Insert the new member
      const result = await query(
        `INSERT INTO equipo (nombre, posicion, bio, imagen, orden, redes_sociales)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [nombre, cargo, descripcion, foto_url, orden, redes_sociales],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al crear miembro del equipo:", error)
      return { success: false, message: `Error al crear miembro del equipo: ${error.message}` }
    }
  },

  async actualizar(id, miembroData) {
    try {
      const { nombre, cargo, descripcion, foto_url, orden, redes_sociales } = miembroData

      // Check if redes_sociales column exists
      const redesColumnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'equipo' 
        AND column_name = 'redes_sociales'
      `)

      // Add redes_sociales column if it doesn't exist
      if (redesColumnCheck.rows.length === 0) {
        await query("ALTER TABLE equipo ADD COLUMN redes_sociales TEXT DEFAULT '{}'")
      }

      // Build the SQL query dynamically
      let sql = "UPDATE equipo SET "
      const params = []
      const fields = []
      let paramIndex = 1

      if (nombre !== undefined) {
        fields.push(`nombre = $${paramIndex++}`)
        params.push(nombre)
      }

      if (cargo !== undefined) {
        fields.push(`posicion = $${paramIndex++}`)
        params.push(cargo)
      }

      if (descripcion !== undefined) {
        fields.push(`bio = $${paramIndex++}`)
        params.push(descripcion)
      }

      if (foto_url !== undefined) {
        fields.push(`imagen = $${paramIndex++}`)
        params.push(foto_url)
      }

      if (orden !== undefined) {
        fields.push(`orden = $${paramIndex++}`)
        params.push(orden)
      }

      if (redes_sociales !== undefined) {
        fields.push(`redes_sociales = $${paramIndex++}`)
        params.push(redes_sociales)
      }

      sql += fields.join(", ") + ` WHERE id = $${paramIndex}`
      params.push(id)

      console.log("SQL Query:", sql)
      console.log("Params:", params)

      // Update the member data
      const result = await query(sql, params)

      if (result.rowCount === 0) {
        return { success: false, message: "Miembro no encontrado o no se realizaron cambios" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar miembro del equipo con id ${id}:`, error)
      return { success: false, message: `Error al actualizar miembro del equipo: ${error.message}` }
    }
  },

  async actualizarOrden(id, orden) {
    try {
      const result = await query("UPDATE equipo SET orden = $1 WHERE id = $2", [orden, id])

      if (result.rowCount === 0) {
        return { success: false, message: "Miembro no encontrado o no se realizaron cambios" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar orden del miembro con id ${id}:`, error)
      return { success: false, message: `Error al actualizar orden: ${error.message}` }
    }
  },

  async eliminar(id) {
    try {
      // Obtener información del miembro para eliminar la imagen si existe
      const miembro = await this.getById(id)

      // Eliminar el miembro
      const result = await query("DELETE FROM equipo WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Miembro no encontrado" }
      }

      // Si el miembro tenía una imagen, intentar eliminarla del sistema de archivos
      if (miembro && miembro.imagen) {
        try {
          const filePath = path.join(__dirname, "../public", miembro.imagen)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (fileError) {
          console.error(`Error al eliminar archivo de imagen: ${fileError.message}`)
          // No interrumpimos el flujo si falla la eliminación del archivo
        }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al eliminar miembro del equipo con id ${id}:`, error)
      return { success: false, message: `Error al eliminar miembro del equipo: ${error.message}` }
    }
  },

  // Añadir método para obtener cargos únicos en el repositorio de equipo
  async getCargosUnicos() {
    try {
      const result = await query("SELECT DISTINCT posicion FROM equipo WHERE posicion IS NOT NULL")
      return result.rows.map((item) => item.posicion)
    } catch (error) {
      console.error("Error al obtener cargos únicos:", error)
      return []
    }
  },
}

// Repositorio de contenido de página
export const contenidoRepo = {
  async getBySeccion(seccion) {
    try {
      const result = await query("SELECT * FROM contenido_pagina WHERE seccion = $1", [seccion])
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener contenido de sección ${seccion}:`, error)
      return null
    }
  },

  async getAll() {
    try {
      const result = await query("SELECT * FROM contenido_pagina ORDER BY orden")
      return result.rows
    } catch (error) {
      console.error("Error al obtener contenido de página:", error)
      return []
    }
  },
}

// Repositorio de mensajes de contacto
export const contactoRepo = {
  async guardarMensaje(mensaje) {
    try {
      const { nombre, email, telefono, tipo_evento, mensaje: contenido } = mensaje

      const result = await query(
        `
        INSERT INTO contacto_mensajes (nombre, email, telefono, tipo_evento, mensaje)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `,
        [nombre, email, telefono, tipo_evento, contenido],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al guardar mensaje de contacto:", error)
      return { success: false, message: "Error al guardar el mensaje." }
    }
  },

  async getMensajesNoLeidos() {
    try {
      const result = await query("SELECT * FROM contacto_mensajes WHERE leido = 0 ORDER BY fecha_envio DESC")
      return result.rows
    } catch (error) {
      console.error("Error al obtener mensajes no leídos:", error)
      return []
    }
  },

  async getCount() {
    try {
      const result = await query("SELECT COUNT(*) as count FROM contacto_mensajes")
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      console.error("Error al obtener el conteo de contacto mensajes:", error)
      return 0
    }
  },

  // Nuevo método para obtener los mensajes más recientes
  async getRecent(limit = 5) {
    try {
      const result = await query(
        `
        SELECT * FROM contacto_mensajes 
        ORDER BY fecha_envio DESC 
        LIMIT $1
      `,
        [limit],
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener mensajes recientes:", error)
      return []
    }
  },

  async getAll() {
    try {
      const result = await query("SELECT * FROM contacto_mensajes ORDER BY fecha_envio DESC")
      return result.rows
    } catch (error) {
      console.error("Error al obtener mensajes:", error)
      return []
    }
  },

  // Guardar mensaje con fecha local
  async guardarMensaje(mensaje) {
    try {
      const { nombre, email, telefono, tipo_evento, mensaje: contenido } = mensaje

      // Obtener fecha y hora local
      const fechaEnvio = await getLocalDateTime()

      const result = await query(
        `
        INSERT INTO contacto_mensajes (nombre, email, telefono, tipo_evento, mensaje, fecha_envio)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `,
        [nombre, email, telefono, tipo_evento, contenido, fechaEnvio.toISOString()],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al guardar mensaje de contacto:", error)
      return { success: false, message: "Error al guardar el mensaje." }
    }
  },

  // Obtener un mensaje por ID con nombre del evento
  async obtenerMensajePorId(id) {
    try {
      // Obtener el mensaje
      const result = await query("SELECT * FROM contacto_mensajes WHERE id = $1", [id])
      const mensaje = result.rows[0]

      if (!mensaje) {
        return { success: false, message: "Mensaje no encontrado" }
      }

      console.log(mensaje.tipo_evento)

      // Si hay un tipo de evento, obtener su nombre
      if (mensaje.tipo_evento) {
        try {
          const tipoEvento = await tiposEventosRepo.getById(mensaje.tipo_evento)
          if (tipoEvento) {
            mensaje.tipo_evento_nombre = tipoEvento.nombre
          }
        } catch (err) {
          console.error("Error al obtener nombre del tipo de evento:", err)
        }
      }

      return { success: true, mensaje }
    } catch (error) {
      console.error("Error al obtener mensaje por id:", error)
      return { success: false, message: error.message }
    }
  },

  // Marcar mensaje como leído
  async marcarLeido(id) {
    try {
      // Verificar si existe la columna leido
      const leidoColumnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacto_mensajes' 
        AND column_name = 'leido'
      `)

      // Si no existe, crearla
      if (leidoColumnCheck.rows.length === 0) {
        await query("ALTER TABLE contacto_mensajes ADD COLUMN leido INTEGER DEFAULT 0")
      }

      const result = await query("UPDATE contacto_mensajes SET leido = 1 WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Mensaje no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al marcar mensaje como leído:", error)
      return { success: false, message: error.message }
    }
  },

  // Marcar mensaje como respondido con fecha local
  async marcarRespondido(id, respondidoPor, respuesta) {
    try {
      // Verificar si existen las columnas necesarias
      const pool = await getDb()
      const client = await pool.connect()

      try {
        // Verificar columna respondido
        const respondidoColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'contacto_mensajes' 
          AND column_name = 'respondido'
        `)

        if (respondidoColumnCheck.rows.length === 0) {
          await client.query("ALTER TABLE contacto_mensajes ADD COLUMN respondido INTEGER DEFAULT 0")
        }

        // Verificar columna respondido_por
        const respondidoPorColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'contacto_mensajes' 
          AND column_name = 'respondido_por'
        `)

        if (respondidoPorColumnCheck.rows.length === 0) {
          await client.query("ALTER TABLE contacto_mensajes ADD COLUMN respondido_por TEXT")
        }

        // Verificar columna fecha_respuesta
        const fechaRespuestaColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'contacto_mensajes' 
          AND column_name = 'fecha_respuesta'
        `)

        if (fechaRespuestaColumnCheck.rows.length === 0) {
          await client.query("ALTER TABLE contacto_mensajes ADD COLUMN fecha_respuesta TIMESTAMP")
        }

        // Verificar columna respuesta
        const respuestaColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'contacto_mensajes' 
          AND column_name = 'respuesta'
        `)

        if (respuestaColumnCheck.rows.length === 0) {
          await client.query("ALTER TABLE contacto_mensajes ADD COLUMN respuesta TEXT")
        }

        // Obtener fecha y hora local
        const fechaRespuesta = await getLocalDateTime()

        const result = await client.query(
          `UPDATE contacto_mensajes 
           SET respondido = 1, 
               respondido_por = $1, 
               fecha_respuesta = $2, 
               respuesta = $3 
           WHERE id = $4`,
          [respondidoPor, fechaRespuesta.toISOString(), respuesta, id],
        )

        if (result.rowCount === 0) {
          return { success: false, message: "Mensaje no encontrado" }
        }

        return { success: true }
      } finally {
        client.release()
      }
    } catch (error) {
      console.error("Error al marcar mensaje como respondido:", error)
      return { success: false, message: error.message }
    }
  },

  // Registrar reenvío de mensaje
  async registrarReenvio(id, usuarioId, destinatario) {
    try {
      // Verificar si existe la tabla de reenvíos
      const tableCheck = await query(`
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacto_reenvios'
      `)

      // Si no existe, crearla
      if (tableCheck.rows.length === 0) {
        await query(`
          CREATE TABLE contacto_reenvios (
            id SERIAL PRIMARY KEY,
            contacto_id INTEGER,
            usuario_id INTEGER,
            destinatario TEXT,
            fecha_reenvio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contacto_id) REFERENCES contacto_mensajes(id)
          )
        `)
      }

      const result = await query(
        `INSERT INTO contacto_reenvios (contacto_id, usuario_id, destinatario)
         VALUES ($1, $2, $3) RETURNING id`,
        [id, usuarioId, destinatario],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al registrar reenvío:", error)
      return { success: false, message: error.message }
    }
  },

  // Archivar mensaje
  async archivar(id) {
    try {
      // Verificar si existe la columna archivado
      const archivadoColumnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacto_mensajes' 
        AND column_name = 'archivado'
      `)

      // Si no existe, crearla
      if (archivadoColumnCheck.rows.length === 0) {
        await query("ALTER TABLE contacto_mensajes ADD COLUMN archivado INTEGER DEFAULT 0")
      }

      const result = await query("UPDATE contacto_mensajes SET archivado = 1 WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Mensaje no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al archivar mensaje:", error)
      return { success: false, message: error.message }
    }
  },

  // Desarchivar mensaje
  async desarchivar(id) {
    try {
      // Verificar si existe la columna archivado
      const archivadoColumnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacto_mensajes' 
        AND column_name = 'archivado'
      `)

      // Si no existe, crearla
      if (archivadoColumnCheck.rows.length === 0) {
        await query("ALTER TABLE contacto_mensajes ADD COLUMN archivado INTEGER DEFAULT 0")
        return { success: true } // Si la columna no existía, no hay nada que desarchivar
      }

      const result = await query("UPDATE contacto_mensajes SET archivado = 0 WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Mensaje no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al desarchivar mensaje:", error)
      return { success: false, message: error.message }
    }
  },

  // Eliminar mensaje
  async eliminar(id) {
    try {
      const result = await query("DELETE FROM contacto_mensajes WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Mensaje no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar mensaje:", error)
      return { success: false, message: error.message }
    }
  },
}

// Repositorio de cotizaciones
export const cotizacionesRepo = {
  async guardarCotizacion(cotizacion) {
    try {
      const result = await query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id
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

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al guardar cotización:", error)
      return { success: false, message: "Error al guardar la cotización." }
    }
  },

  async getAll() {
    try {
      const result = await query(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM cotizaciones c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        ORDER BY c.fecha_creacion DESC
      `,
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener cotizaciones:", error)
      return []
    }
  },

  async getById(id) {
    try {
      const result = await query(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM cotizaciones c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        WHERE c.id = $1
      `,
        [id],
      )
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener cotización con id ${id}:`, error)
      return null
    }
  },

  async getCount() {
    try {
      const result = await query("SELECT COUNT(*) as count FROM cotizaciones")
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      console.error("Error al obtener el conteo de cotizaciones:", error)
      return 0
    }
  },

  // Nuevo método para obtener los mensajes más recientes
  async getRecent(limit = 5) {
    try {
      const result = await query(
        `SELECT * FROM cotizaciones 
         ORDER BY fecha_creacion DESC 
         LIMIT $1`,
        [limit],
      )
      return result.rows
    } catch (error) {
      console.error("Error al obtener cotizaciones recientes:", error)
      return []
    }
  },

  // Método para crear una cotización
  async crear(cotizacion) {
    try {
      const result = await query(
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id
    `,
        [
          cotizacion.nombre_cliente,
          cotizacion.email_cliente,
          cotizacion.telefono_cliente,
          cotizacion.fecha_evento,
          cotizacion.num_meseros,
          cotizacion.duracion_servicio,
          cotizacion.ubicacion,
          cotizacion.tipo_evento_id,
          cotizacion.lavalozas,
          cotizacion.cuida_coches,
          cotizacion.montaje_desmontaje,
          cotizacion.costo_base,
          cotizacion.costo_adicionales,
          cotizacion.cargo_ubicacion,
          cotizacion.costo_total,
          cotizacion.estado,
          cotizacion.fecha_creacion,
        ],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al crear cotización:", error)
      return { success: false, message: `Error al crear cotización: ${error.message}` }
    }
  },

  // Método para actualizar una cotización
  async actualizar(cotizacion) {
    try {
      const result = await query(
        `
      UPDATE cotizaciones SET
        nombre_cliente = $1,
        email = $2,
        telefono = $3,
        fecha_evento = $4,
        num_meseros = $5,
        duracion_servicio = $6,
        ubicacion = $7,
        tipo_evento_id = $8,
        lavalozas = $9,
        cuida_coches = $10,
        montaje_desmontaje = $11,
        costo_base = $12,
        costo_adicionales = $13,
        cargo_ubicacion = $14,
        costo_total = $15,
        estado = $16
      WHERE id = $17
    `,
        [
          cotizacion.nombre_cliente,
          cotizacion.email_cliente,
          cotizacion.telefono_cliente,
          cotizacion.fecha_evento,
          cotizacion.num_meseros,
          cotizacion.duracion_servicio,
          cotizacion.ubicacion,
          cotizacion.tipo_evento_id,
          cotizacion.lavalozas,
          cotizacion.cuida_coches,
          cotizacion.montaje_desmontaje,
          cotizacion.costo_base,
          cotizacion.costo_adicionales,
          cotizacion.cargo_ubicacion,
          cotizacion.costo_total,
          cotizacion.estado,
          cotizacion.id,
        ],
      )

      if (result.rowCount === 0) {
        return { success: false, message: "Cotización no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar cotización:", error)
      return { success: false, message: `Error al actualizar cotización: ${error.message}` }
    }
  },

  // Método para eliminar una cotización
  async eliminar(id) {
    try {
      const result = await query("DELETE FROM cotizaciones WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Cotización no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar cotización:", error)
      return { success: false, message: `Error al eliminar cotización: ${error.message}` }
    }
  },

  // Método para actualizar el estado de una cotización
  async actualizarEstado(id, estado) {
    try {
      const result = await query("UPDATE cotizaciones SET estado = $1 WHERE id = $2", [estado, id])

      if (result.rowCount === 0) {
        return { success: false, message: "Cotización no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar estado de cotización:", error)
      return { success: false, message: `Error al actualizar estado: ${error.message}` }
    }
  },

  // Método para asociar servicios a una cotización
  async asociarServicios(cotizacionId, serviciosIds) {
    try {
      // Crear tabla de relación si no existe
      await query(`
      CREATE TABLE IF NOT EXISTS cotizacion_servicios (
        cotizacion_id INTEGER,
        servicio_id INTEGER,
        PRIMARY KEY (cotizacion_id, servicio_id),
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id),
        FOREIGN KEY (servicio_id) REFERENCES servicios(id)
      )
    `)

      // Insertar relaciones
      for (const servicioId of serviciosIds) {
        await query(
          "INSERT INTO cotizacion_servicios (cotizacion_id, servicio_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [cotizacionId, servicioId],
        )
      }

      return { success: true }
    } catch (error) {
      console.error("Error al asociar servicios a cotización:", error)
      return { success: false, message: `Error al asociar servicios: ${error.message}` }
    }
  },

  // Método para eliminar servicios asociados a una cotización
  async eliminarServicios(cotizacionId) {
    try {
      await query("DELETE FROM cotizacion_servicios WHERE cotizacion_id = $1", [cotizacionId])
      return { success: true }
    } catch (error) {
      console.error("Error al eliminar servicios de cotización:", error)
      return { success: false, message: `Error al eliminar servicios: ${error.message}` }
    }
  },

  // Método para actualizar número de contrato
  async actualizarNumeroContrato(id, numeroContrato) {
    try {
      const result = await query("UPDATE cotizaciones SET numero_contrato = $1 WHERE id = $2", [numeroContrato, id])

      if (result.rowCount === 0) {
        return { success: false, message: "Cotización no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar número de contrato:", error)
      return { success: false, message: `Error al actualizar número de contrato: ${error.message}` }
    }
  },

  // Método para obtener servicios asociados a una cotización
  async getServicios(cotizacionId) {
    try {
      // Verificar si la tabla existe
      const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'cotizacion_servicios'
    `)

      if (tableCheck.rows.length === 0) {
        return []
      }

      const result = await query(
        `
      SELECT s.id, s.titulo, s.descripcion_corta, s.precio, s.precio_desde
      FROM servicios s
      JOIN cotizacion_servicios cs ON s.id = cs.servicio_id
      WHERE cs.cotizacion_id = $1
    `,
        [cotizacionId],
      )

      return result.rows.map((s) => s.id)
    } catch (error) {
      console.error(`Error al obtener servicios de cotización ${cotizacionId}:`, error)
      return []
    }
  },
}

// Repositorio de contratos
export const contratosRepo = {
  // Método para obtener el conteo de contratos
  async getCount(estado = null) {
    try {
      let queryText = "SELECT COUNT(*) as count FROM contratos"
      const params = []

      if (estado) {
        queryText += " WHERE estado = $1"
        params.push(estado)
      }

      const result = await query(queryText, params)
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      console.error("Error al obtener el conteo de contratos:", error)
      return 0
    }
  },

  async getAll() {
    try {
      const result = await query(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM contratos c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        ORDER BY c.fecha_creacion DESC
      `,
      )
      console.log(`Obtenidos ${result.rows.length} contratos`)
      return result.rows
    } catch (error) {
      console.error("Error al obtener contratos:", error)
      return []
    }
  },

  async getById(id) {
    try {
      const result = await query(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM contratos c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        WHERE c.id = $1
        `,
        [id],
      )
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener contrato con id ${id}:`, error)
      return null
    }
  },

  // Método para obtener un contrato por número
  async getByNumero(numeroContrato) {
    try {
      const result = await query(
        `
      SELECT c.*, te.nombre as tipo_evento
      FROM contratos c
      LEFT JOIN tipos_eventos te ON c.tipo_evento_id = te.id
      WHERE c.numero_contrato = $1
    `,
        [numeroContrato],
      )
      return result.rows[0]
    } catch (error) {
      console.error(`Error al obtener contrato con número ${numeroContrato}:`, error)
      return null
    }
  },

  // Método para crear un contrato
  async crear(contrato) {
    try {
      const result = await query(
        `
      INSERT INTO contratos (
        numero_contrato,
        nombre_cliente,
        fecha_evento,
        tipo_evento_id,
        estado,
        fecha_creacion
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `,
        [
          contrato.numero_contrato,
          contrato.nombre_cliente,
          contrato.fecha_evento,
          contrato.tipo_evento_id,
          contrato.estado,
          contrato.fecha_creacion,
        ],
      )

      return { success: true, id: result.rows[0].id }
    } catch (error) {
      console.error("Error al crear contrato:", error)
      return { success: false, message: `Error al crear contrato: ${error.message}` }
    }
  },

  // Método para crear o actualizar un contrato
  async crearOActualizar(contrato) {
    try {
      // Verificar si ya existe un contrato con ese número
      const contratoExistente = await this.getByNumero(contrato.numero_contrato)

      if (contratoExistente) {
        // Actualizar contrato existente
        const result = await query(
          `
        UPDATE contratos SET
          nombre_cliente = $1,
          fecha_evento = $2,
          tipo_evento_id = $3,
          estado = $4
        WHERE numero_contrato = $5
      `,
          [
            contrato.nombre_cliente,
            contrato.fecha_evento,
            contrato.tipo_evento_id,
            contrato.estado,
            contrato.numero_contrato,
          ],
        )

        return { success: true, id: contratoExistente.id, updated: true }
      } else {
        // Crear nuevo contrato
        return await this.crear(contrato)
      }
    } catch (error) {
      console.error("Error al crear o actualizar contrato:", error)
      return { success: false, message: `Error al crear o actualizar contrato: ${error.message}` }
    }
  },

  // Método para actualizar un contrato
  async actualizar(contrato) {
    try {
      const result = await query(
        `
      UPDATE contratos SET
        numero_contrato = $1,
        nombre_cliente = $2,
        fecha_evento = $3,
        tipo_evento_id = $4,
        estado = $5
      WHERE id = $6
    `,
        [
          contrato.numero_contrato,
          contrato.nombre_cliente,
          contrato.fecha_evento,
          contrato.tipo_evento_id,
          contrato.estado,
          contrato.id,
        ],
      )

      if (result.rowCount === 0) {
        return { success: false, message: "Contrato no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar contrato:", error)
      return { success: false, message: `Error al actualizar contrato: ${error.message}` }
    }
  },

  // Método para eliminar un contrato
  async eliminar(id) {
    try {
      const result = await query("DELETE FROM contratos WHERE id = $1", [id])

      if (result.rowCount === 0) {
        return { success: false, message: "Contrato no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar contrato:", error)
      return { success: false, message: `Error al eliminar contrato: ${error.message}` }
    }
  },

  // Método para actualizar el estado de un contrato
  async actualizarEstado(numeroContrato, estado) {
    try {
      const result = await query("UPDATE contratos SET estado = $1 WHERE numero_contrato = $2", [
        estado,
        numeroContrato,
      ])

      if (result.rowCount === 0) {
        return { success: false, message: "Contrato no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar estado de contrato:", error)
      return { success: false, message: `Error al actualizar estado: ${error.message}` }
    }
  },

  // Método para verificar si un contrato está siendo utilizado
  async isInUse(numeroContrato) {
    try {
      // Verificar en reseñas
      const result = await query("SELECT COUNT(*) as count FROM resenas WHERE numero_contrato = $1", [numeroContrato])

      return Number.parseInt(result.rows[0].count) > 0
    } catch (error) {
      console.error("Error al verificar uso de contrato:", error)
      // En caso de error, asumimos que está en uso para prevenir eliminaciones incorrectas
      return true
    }
  },

  // Método para verificar si un contrato existe
  async verificarContrato(numeroContrato) {
    try {
      const contrato = await this.getByNumero(numeroContrato)
      return !!contrato
    } catch (error) {
      console.error(`Error al verificar contrato ${numeroContrato}:`, error)
      return false
    }
  },

  // Método para obtener el último número de contrato
  async getUltimoNumero(year, month) {
    try {
      const patron = `CONT-${year}-${month}-%`

      const result = await query(
        "SELECT numero_contrato FROM contratos WHERE numero_contrato LIKE $1 ORDER BY id DESC LIMIT 1",
        [patron],
      )

      return result.rows.length > 0 ? result.rows[0].numero_contrato : null
    } catch (error) {
      console.error("Error al obtener último número de contrato:", error)
      return null
    }
  },
}

// Inicializar la base de datos al importar este módulo
initializeDatabase().catch((err) => {
  console.error("Error al inicializar la base de datos PostgreSQL:", err)
})

// Actualizar el export default para incluir el nuevo repositorio
export default {
  initializeDatabase,
  getDb,
  usuariosRepo,
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
