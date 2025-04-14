import sqlite3 from "sqlite3"
import { open } from "sqlite"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import bcrypt from "bcrypt"
import { getLocalDateTime } from '../app.js'

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

    // Verificar si existe la tabla de usuarios
    const usuariosTable = await dbConnection.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'",
    )

    if (!usuariosTable) {
      console.log("Creando tabla de usuarios...")
      await dbConnection.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      const tableInfo = await dbConnection.all("PRAGMA table_info(usuarios)")

      // Verificar si existe la columna telefono
      const telefonoColumnExists = tableInfo.some((column) => column.name === "telefono")
      if (!telefonoColumnExists) {
        console.log("Añadiendo columna 'telefono' a la tabla usuarios")
        await dbConnection.run("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
      }

      // Verificar si existe la columna imagen_url
      const imagenColumnExists = tableInfo.some((column) => column.name === "imagen_url")
      if (!imagenColumnExists) {
        console.log("Añadiendo columna 'imagen_url' a la tabla usuarios")
        await dbConnection.run("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT")
      }

      // Verificar si existe la columna activo
      const activoColumnExists = tableInfo.some((column) => column.name === "activo")
      if (!activoColumnExists) {
        console.log("Añadiendo columna 'activo' a la tabla usuarios")
        await dbConnection.run("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
      }
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

// Repositorio de usuarios
export const usuariosRepo = {
  async verificarCredenciales(email, password) {
    const db = await getDb()
    try {
      const usuario = await db.get("SELECT * FROM usuarios WHERE email = ?", email)

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
      await db.run("UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?", usuario.id)

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
    const db = await getDb()
    try {
      return await db.get(
        "SELECT id, email, nombre, password, rol, fecha_creacion, ultimo_acceso, telefono, imagen_url, activo FROM usuarios WHERE email = ?",
        email,
      )
    } catch (error) {
      console.error(`Error al obtener usuario con email ${email}:`, error)
      return null
    }
  },

  async crearUsuario(userData) {
    const db = await getDb();
    try {
      let { email, password, nombre, rol = "admin", telefono, imagen_url, activo } = userData;
  
      console.log(
        `Intentando crear usuario con email: ${email}, nombre: ${nombre}, rol: ${rol}, telefono: ${telefono}, imagen: ${imagen_url ? "Sí" : "No"}, activo: ${activo}`,
      );
  
      // 👉 Forzar rol admin si es el correo oficial
      if (email.trim().toLowerCase() === "platoycopa.oficial@gmail.com") {
        rol = "admin";
        console.log("Correo oficial detectado, rol forzado a administrador.");
      }
  
      // Verificar si el usuario ya existe
      const existingUser = await this.getByEmail(email);
      if (existingUser) {
        console.log(`Error: El email ${email} ya está registrado`);
        return { success: false, message: "El correo electrónico ya está registrado" };
      }
  
      // Verificar si la columna activo existe
      const tableInfo = await db.all("PRAGMA table_info(usuarios)");
      const activoColumnExists = tableInfo.some((column) => column.name === "activo");
  
      if (!activoColumnExists) {
        console.log("Creando columna 'activo' en la tabla usuarios");
        await db.run("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1");
      }
  
      const telefonoColumnExists = tableInfo.some((column) => column.name === "telefono");
      if (!telefonoColumnExists) {
        console.log("Creando columna 'telefono' en la tabla usuarios");
        await db.run("ALTER TABLE usuarios ADD COLUMN telefono TEXT");
      }
  
      const imagenColumnExists = tableInfo.some((column) => column.name === "imagen_url");
      if (!imagenColumnExists) {
        console.log("Creando columna 'imagen_url' en la tabla usuarios");
        await db.run("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT");
      }
  
      // Insertar el nuevo usuario
      console.log("Insertando nuevo usuario en la base de datos");
      const result = await db.run(
        "INSERT INTO usuarios (email, password, nombre, rol, activo, telefono, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [email, password, nombre, rol, activo !== undefined ? activo : 1, telefono || null, imagen_url || null],
      );
  
      console.log(`Usuario creado con ID: ${result.lastID}`);
      return { success: true, id: result.lastID };
    } catch (error) {
      console.error("Error al crear usuario:", error);
      return { success: false, message: `Error al crear usuario: ${error.message}` };
    }
  }
  ,

  async cambiarPassword(email, newPassword) {
    const db = await getDb()
    try {

      // Actualizar la contraseña
      const result = await db.run("UPDATE usuarios SET password = ? WHERE email = ?", [newPassword, email])

      if (result.changes === 0) {
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
    const db = await getDb()
    try {
      // Verificar si la columna activo existe
      const tableInfo = await db.all("PRAGMA table_info(usuarios)")
      const activoColumnExists = tableInfo.some((column) => column.name === "activo")

      // Si la columna no existe, crearla
      if (!activoColumnExists) {
        console.log("Creando columna 'activo' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
      }

      // Verificar si la columna telefono existe
      const telefonoColumnExists = tableInfo.some((column) => column.name === "telefono")

      // Si la columna no existe, crearla
      if (!telefonoColumnExists) {
        console.log("Creando columna 'telefono' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
      }

      // Verificar si la columna imagen_url existe
      const imagenColumnExists = tableInfo.some((column) => column.name === "imagen_url")

      // Si la columna no existe, crearla
      if (!imagenColumnExists) {
        console.log("Creando columna 'imagen_url' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT")
      }

      // Obtener todos los usuarios con el campo activo
      const usuarios = await db.all(
        "SELECT id, email, nombre, rol, fecha_creacion, ultimo_acceso, activo, telefono, imagen_url FROM usuarios",
      )
      console.log(`Obtenidos ${usuarios.length} usuarios`)

      // Asegurarse de que todos los usuarios tengan el campo activo
      return usuarios.map((usuario) => ({
        ...usuario,
        activo: usuario.activo !== undefined ? usuario.activo : 1,
        telefono: usuario.telefono || "",
        imagen_url: usuario.imagen_url || null,
      }))
    } catch (error) {
      console.error("Error al obtener usuarios:", error)
      return []
    }
  },

  // Asegurarse de que la función getById devuelva el campo activo
  async getById(id) {
    const db = await getDb()
    try {
      // Verificar si la columna activo existe
      const tableInfo = await db.all("PRAGMA table_info(usuarios)")
      const activoColumnExists = tableInfo.some((column) => column.name === "activo")

      // Si la columna no existe, crearla
      if (!activoColumnExists) {
        console.log("Creando columna 'activo' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
      }

      // Verificar si la columna telefono existe
      const telefonoColumnExists = tableInfo.some((column) => column.name === "telefono")

      // Si la columna no existe, crearla
      if (!telefonoColumnExists) {
        console.log("Creando columna 'telefono' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
      }

      // Verificar si la columna imagen_url existe
      const imagenColumnExists = tableInfo.some((column) => column.name === "imagen_url")

      // Si la columna no existe, crearla
      if (!imagenColumnExists) {
        console.log("Creando columna 'imagen_url' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN imagen_url TEXT")
      }

      // Obtener el usuario con el campo activo
      const usuario = await db.get(
        "SELECT id, email, nombre, rol, fecha_creacion, ultimo_acceso, activo, telefono, imagen_url, password FROM usuarios WHERE id = ?",
        id,
      )

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
    } catch (error) {
      console.error(`Error al obtener usuario con id ${id}:`, error)
      return null
    }
  },
  async getAllRoles() {
    const db = await getDb()
    try {
      return await db.all("SELECT rol, COUNT(*) as count FROM usuarios GROUP BY rol")
    } catch (error) {
      console.error("Error al obtener roles:", error)
      return []
    }
  },
  async actualizarUsuario(id, userData) {
    const db = await getDb()
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

      if (email) {
        fields.push("email = ?")
        params.push(email)
      }

      if (nombre) {
        fields.push("nombre = ?")
        params.push(nombre)
      }

      if (rol) {
        fields.push("rol = ?")
        params.push(rol)
      }

      if (activo !== undefined) {
        fields.push("activo = ?")
        params.push(activo)
      }

      if (telefono !== undefined) {
        fields.push("telefono = ?")
        params.push(telefono)
      }

      if (imagen_url !== undefined) {
        fields.push("imagen_url = ?")
        params.push(imagen_url)
      }

      sql += fields.join(", ") + " WHERE id = ?"
      params.push(id)

      // Actualizar los datos del usuario
      const result = await db.run(sql, params)

      if (result.changes === 0) {
        return { success: false, message: "Usuario no encontrado o no se realizaron cambios" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar usuario con id ${id}:`, error)
      return { success: false, message: `Error al actualizar usuario: ${error.message}` }
    }
  },

  async actualizarPassword(id, newPassword) {
    const db = await getDb()
    try {
      // Encriptar la nueva contraseña
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

      // Actualizar la contraseña
      const result = await db.run("UPDATE usuarios SET password = ? WHERE id = ?", [hashedPassword, id])

      if (result.changes === 0) {
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
    const db = await getDb()
    try {
      // Verificar si la columna activo existe
      const tableInfo = await db.all("PRAGMA table_info(usuarios)")
      const activoColumnExists = tableInfo.some((column) => column.name === "activo")

      // Si la columna no existe, crearla
      if (!activoColumnExists) {
        console.log("Creando columna 'activo' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
      }

      // Actualizar el estado a activo (1)
      console.log(`Activando usuario con ID ${id}`)
      const result = await db.run("UPDATE usuarios SET activo = 1 WHERE id = ?", [id])
      console.log(`Resultado de activación: ${result.changes} filas afectadas`)

      if (result.changes === 0) {
        return { success: false, message: "Usuario no encontrado o ya está activo" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al activar usuario con id ${id}:`, error)
      return { success: false, message: `Error al activar usuario: ${error.message}` }
    }
  },

  // Modificar la función desactivarUsuario para asegurar que la columna activo existe y se actualiza correctamente
  async desactivarUsuario(id) {
    const db = await getDb()
    try {
      // Verificar si la columna activo existe
      const tableInfo = await db.all("PRAGMA table_info(usuarios)")
      const activoColumnExists = tableInfo.some((column) => column.name === "activo")

      // Si la columna no existe, crearla
      if (!activoColumnExists) {
        console.log("Creando columna 'activo' en la tabla usuarios")
        await db.run("ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1")
      }

      // Actualizar el estado a inactivo (0)
      console.log(`Desactivando usuario con ID ${id}`)
      const result = await db.run("UPDATE usuarios SET activo = 0 WHERE id = ?", [id])
      console.log(`Resultado de desactivación: ${result.changes} filas afectadas`)

      if (result.changes === 0) {
        return { success: false, message: "Usuario no encontrado o ya está inactivo" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al desactivar usuario con id ${id}:`, error)
      return { success: false, message: `Error al desactivar usuario: ${error.message}` }
    }
  },

  async actualizarUltimoAcceso(id) {
    const db = await getDb()
    try {
      // Obtener fecha y hora local
      const fechaAcceso = await getLocalDateTime()
      
      const result = await db.run(
        "UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?", 
        [fechaAcceso.toISOString(), id]
      )

      if (result.changes === 0) {
        return { success: false, message: "Usuario no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar último acceso del usuario con id ${id}:`, error)
      return { success: false, message: `Error al actualizar último acceso: ${error.message}` }
    }
  },

  async eliminarUsuario(id) {
    const db = await getDb()
    try {
      // Verificar si el usuario existe
      const usuario = await this.getById(id)
      if (!usuario) {
        return { success: false, message: "Usuario no encontrado" }
      }

      // Eliminar el usuario
      const result = await db.run("DELETE FROM usuarios WHERE id = ?", [id])

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
  async crear(servicio, getDb) {
    try {
      const db = await getDb();
      const result = await db.run(
        `INSERT INTO servicios (
          titulo, descripcion_corta, descripcion_completa, 
          precio, precio_desde, imagen_url, icono, 
          caracteristicas, destacado, orden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          servicio.orden
        ]
      );

      return { success: true, id: result.lastID };
    } catch (error) {
      console.error("Error al crear servicio:", error);
      return { success: false, message: "Error al crear el servicio" };
    }
  },

  async actualizar(servicio) {
    try {
      const db = await getDb();
      await db.run(
        `UPDATE servicios SET 
          titulo = ?, 
          descripcion_corta = ?, 
          descripcion_completa = ?, 
          precio = ?, 
          precio_desde = ?, 
          imagen_url = ?, 
          icono = ?, 
          caracteristicas = ?, 
          destacado = ?, 
          orden = ?,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = ?`,
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
          servicio.id
        ]
      );

      return { success: true };
    } catch (error) {
      console.error("Error al actualizar servicio:", error);
      return { success: false, message: "Error al actualizar el servicio" };
    }
  },

  async eliminar(id, getDb) {
    const db = await getDb()
    try {
      const result = await db.run("DELETE FROM servicios WHERE id = ?", id)

      if (result.changes === 0) {
        return { success: false, message: "Servicio no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar servicio:", error)
      return { success: false, message: `Error al eliminar servicio: ${error.message}` }
    }
  },
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

  async getCount() {
    const db = await getDb()
    try {
      const result = await db.get("SELECT COUNT(*) as count FROM servicios")
      return result.count
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
      const db = await getDb()
      const result = await db.run(
        `INSERT INTO tipos_eventos (
          nombre, 
          descripcion, 
          icono
        ) VALUES (?, ?, ?)`,
        [tipoEvento.nombre, tipoEvento.descripcion, tipoEvento.icono],
      )

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error("Error al crear tipo de evento:", error)
      return { success: false, message: `Error al crear tipo de evento: ${error.message}` }
    }
  },

  // Método para actualizar un tipo de evento
  async actualizar(id, tipoEvento) {
    try {
      const db = await getDb()
      const result = await db.run(
        `UPDATE tipos_eventos SET 
          nombre = ?, 
          descripcion = ?, 
          icono = ?
        WHERE id = ?`,
        [tipoEvento.nombre, tipoEvento.descripcion, tipoEvento.icono, id],
      )

      if (result.changes === 0) {
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
      const db = await getDb()
      const result = await db.run("DELETE FROM tipos_eventos WHERE id = ?", id)

      if (result.changes === 0) {
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
      const db = await getDb()

      // Verificar en eventos
      const eventosCount = await db.get("SELECT COUNT(*) as count FROM contratos WHERE tipo_evento_id = ?", [id])

      // Verificar en reseñas
      const resenasCount = await db.get("SELECT COUNT(*) as count FROM resenas WHERE tipo_evento_id = ?", [id])

      // Verificar en cotizaciones
      const cotizacionesCount = await db.get("SELECT COUNT(*) as count FROM cotizaciones WHERE tipo_evento_id = ?", [
        id,
      ])

      return eventosCount.count > 0 || resenasCount.count > 0 || cotizacionesCount.count > 0
    } catch (error) {
      console.error("Error al verificar uso de tipo de evento:", error)
      // En caso de error, asumimos que está en uso para prevenir eliminaciones incorrectas
      return true
    }
  },
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

  // Método agregado para obtener tipos de eventos con un conteo (por ejemplo, de servicios asociados)
  async getAllWithCountImages() {
    const db = await getDb()
    try {
      const tipos = await db.all(
        `SELECT t.*, 
              (SELECT COUNT(*) FROM imagenes_galeria WHERE tipo_evento_id = t.id) as count
        FROM tipos_eventos t
        WHERE (SELECT COUNT(*) FROM imagenes_galeria WHERE tipo_evento_id = t.id) > 0
        ORDER BY count DESC
        LIMIT 6;
        `,
      )
      return tipos
    } catch (error) {
      console.error("Error al obtener tipos de eventos con count:", error)
      return []
    }
  },

  async getAllWithCountResenas() {
    const db = await getDb()
    try {
      const tipos = await db.all(
        `SELECT t.*, 
              (SELECT COUNT(*) FROM resenas WHERE tipo_evento_id = t.id) as count
        FROM tipos_eventos t
        WHERE (SELECT COUNT(*) FROM resenas WHERE tipo_evento_id = t.id) > 0
        ORDER BY count DESC
        LIMIT 6;
        `,
      )
      return tipos
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
      const db = await getDb()
      const result = await db.run(
        `INSERT INTO imagenes_galeria (
        titulo, 
        descripcion, 
        tipo_evento_id, 
        url_imagen, 
        orden, 
        destacada
      ) VALUES (?, ?, ?, ?, ?, ?)`,
        [imagen.titulo, imagen.descripcion, imagen.tipo_evento_id, imagen.url_imagen, imagen.orden, imagen.destacada],
      )

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error("Error al crear imagen:", error)
      return { success: false, message: `Error al crear imagen: ${error.message}` }
    }
  },

  // Método para actualizar una imagen
  async actualizar(imagen) {
    try {
      const db = await getDb()
      const result = await db.run(
        `UPDATE imagenes_galeria SET
        titulo = ?, 
        descripcion = ?, 
        tipo_evento_id = ?, 
        url_imagen = COALESCE(?, url_imagen), 
        orden = ?, 
        destacada = ?
      WHERE id = ?`,
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

      if (result.changes === 0) {
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
      const db = await getDb()
      const result = await db.run("DELETE FROM imagenes_galeria WHERE id = ?", id)

      if (result.changes === 0) {
        return { success: false, message: "Imagen no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar imagen:", error)
      return { success: false, message: `Error al eliminar imagen: ${error.message}` }
    }
  },

  async getById(id) {
    const db = await getDb()
    try {
      return await db.get(
        "SELECT id, titulo, descripcion, url_imagen, url_imagen_completa, tipo_evento_id, destacada, orden FROM imagenes_galeria WHERE id = ?",
        id,
      )
    } catch (error) {
      console.error(`Error al obtener usuario con id ${id}:`, error)
      return null
    }
  },

  // Método para obtener imágenes destacadas
  async getDestacadas(limit = 6, getDb) {
    try {
      const db = await getDb()
      const imagenes = await db.all(
        `SELECT * FROM galeria 
       WHERE destacada = 1 
       ORDER BY orden ASC, fecha_creacion DESC 
       LIMIT ?`,
        [limit],
      )

      return imagenes
    } catch (error) {
      console.error("Error al obtener imágenes destacadas:", error)
      return []
    }
  },

  // Método para obtener imágenes por tipo de evento
  async getByTipoEvento(tipoEventoId, limit = 12, offset = 0, getDb) {
    try {
      const db = await getDb()
      const imagenes = await db.all(
        `SELECT * FROM galeria 
       WHERE tipo_evento_id = ? 
       ORDER BY orden ASC, fecha_creacion DESC 
       LIMIT ? OFFSET ?`,
        [tipoEventoId, limit, offset],
      )

      return imagenes
    } catch (error) {
      console.error(`Error al obtener imágenes por tipo de evento ${tipoEventoId}:`, error)
      return []
    }
  },

  // Método para contar imágenes por tipo de evento
  async getCountByTipoEvento(tipoEventoId) {
    try {
      const db = await getDb()
      const result = await db.get("SELECT COUNT(*) as count FROM imagenes_galeria WHERE tipo_evento_id = ?", [
        tipoEventoId,
      ])

      return result.count
    } catch (error) {
      console.error(`Error al contar imágenes por tipo de evento ${tipoEventoId}:`, error)
      return 0
    }
  },
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
      const imagenes = await db.all(
        `
        SELECT g.*, t.nombre as tipo_evento 
        FROM imagenes_galeria g
        LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
        WHERE g.destacada = 1
        ORDER BY g.orden
      `,
      )
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

  async getCount() {
    const db = await getDb()
    try {
      const result = await db.get("SELECT COUNT(*) as count FROM imagenes_galeria")
      return result.count
    } catch (error) {
      console.error("Error al obtener el conteo de la galería:", error)
      return 0
    }
  },
}

// Repositorio de reseñas
export const resenasRepo = {
  async getByContrato(numero_contrato) {
    const db = await getDb()
    try {
      const query = `SELECT * FROM resenas WHERE numero_contrato = ?`
      const row = await db.get(query, [numero_contrato])
      return row
    } catch (error) {
      console.error(`Error al obtener reseña con número de contrato ${numero_contrato}:`, error)
      throw error
    }
  },
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

  async getCount() {
    const db = await getDb()
    try {
      const result = await db.get("SELECT COUNT(*) as count FROM resenas")
      return result.count
    } catch (error) {
      console.error("Error al obtener el conteo de reseñas:", error)
      return 0
    }
  },
  // Nuevo método para obtener estadísticas de calificaciones
  // Nuevo método para obtener estadísticas de calificaciones, agrupadas por calificación
  async getRatingStats() {
    const db = await getDb()
    try {
      const stats = await db.all(
        `SELECT calificacion, COUNT(*) as count 
       FROM resenas 
       WHERE verificado = 1 
       GROUP BY calificacion`,
      )
      return stats
    } catch (error) {
      console.error("Error al obtener estadísticas de reseñas:", error)
      return []
    }
  },
  async getAllWithDetails() {
    const db = await getDb()
    try {
      const rows = await db.all(`
      SELECT r.*, te.nombre as tipo_evento, 
             CASE WHEN r.verificado = 1 THEN 1 ELSE 0 END as aprobada
      FROM resenas r
      LEFT JOIN tipos_eventos te ON r.tipo_evento_id = te.id
      ORDER BY r.id DESC
    `)
      return rows
    } catch (error) {
      console.error("Error al obtener reseñas:", error)
      return []
    }
  },

  // Obtener una reseña por ID
  async getById(id) {
    const db = await getDb()
    try {
      const query = `
      SELECT r.*, 
             CASE WHEN r.verificado = 1 THEN 1 ELSE 0 END as aprobada
      FROM resenas r
      WHERE r.id = ?
    `
      const row = await db.get(query, [id])
      return row
    } catch (error) {
      console.error(`Error al obtener reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Crear una nueva reseña
  async create(resenaDatos) {
    const db = await getDb()
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

      const query = `
      INSERT INTO resenas (
        nombre_cliente, 
        fecha, 
        tipo_evento_id, 
        calificacion, 
        comentario, 
        numero_contrato,
        imagenes,
        verificado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      const result = await db.run(query, [
        nombre_cliente,
        fecha,
        tipo_evento_id,
        calificacion,
        comentario,
        numero_contrato,
        imagenes,
        verificado,
      ])
      return { id: result.lastID, ...resenaDatos }
    } catch (error) {
      console.error("Error al crear reseña:", error)
      throw error
    }
  },

  // Actualizar una reseña existente
  async update(id, resenaDatos) {
    const db = await getDb()
    try {
      // Convertir aprobada a verificado
      const verificado = resenaDatos.aprobada ? 1 : 0
      // Preparar datos para actualización
      const { nombre_cliente, fecha, tipo_evento_id, calificacion, comentario, numero_contrato, imagenes } = resenaDatos

      const query = `
      UPDATE resenas 
      SET nombre_cliente = ?,
          fecha = ?,
          tipo_evento_id = ?,
          calificacion = ?,
          comentario = ?,
          numero_contrato = ?,
          imagenes = ?,
          verificado = ?
      WHERE id = ?
    `
      await db.run(query, [
        nombre_cliente,
        fecha,
        tipo_evento_id,
        calificacion,
        comentario,
        numero_contrato || null,
        imagenes || "[]",
        verificado,
        id,
      ])
      return { id, ...resenaDatos }
    } catch (error) {
      console.error(`Error al actualizar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Eliminar una reseña
  async delete(id) {
    const db = await getDb()
    try {
      const query = "DELETE FROM resenas WHERE id = ?"
      await db.run(query, [id])
      return { id, deleted: true }
    } catch (error) {
      console.error(`Error al eliminar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Aprobar una reseña
  async approve(id) {
    const db = await getDb()
    try {
      const query = "UPDATE resenas SET verificado = 1 WHERE id = ?"
      await db.run(query, [id])
      return { id, approved: true }
    } catch (error) {
      console.error(`Error al aprobar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Desaprobar una reseña
  async disapprove(id) {
    const db = await getDb()
    try {
      const query = "UPDATE resenas SET verificado = 0 WHERE id = ?"
      await db.run(query, [id])
      return { id, disapproved: true }
    } catch (error) {
      console.error(`Error al desaprobar reseña con ID ${id}:`, error)
      throw error
    }
  },

  // Obtener reseñas aprobadas para mostrar en el sitio público
  async getApprovedReviews(limit = 6) {
    const db = await getDb()
    try {
      const query = `
      SELECT r.*, te.nombre as tipo_evento
      FROM resenas r
      LEFT JOIN tipos_eventos te ON r.tipo_evento_id = te.id
      WHERE r.verificado = 1
      ORDER BY r.id DESC
      LIMIT ?
    `
      const rows = await db.all(query, [limit])
      return rows
    } catch (error) {
      console.error("Error al obtener reseñas aprobadas:", error)
      throw error
    }
  },
  // Add this method to the resenasRepo in your postgress-db.js file

  // Inside resenasRepo object, add this method:
  async getByTipoEvento(tipoEventoId, limit = 10) {
    const db = await getDb()
    try {
      const resenas = await db.all(
        `
      SELECT r.*, t.nombre as tipo_evento, t.icono as eventIcon 
      FROM resenas r
      LEFT JOIN tipos_eventos t ON r.tipo_evento_id = t.id
      WHERE r.verificado = 1 AND r.tipo_evento_id = ?
      ORDER BY r.id DESC
      LIMIT ?
      `,
        [tipoEventoId, limit],
      )
      console.log(`Obtenidas ${resenas.length} reseñas para el tipo de evento ${tipoEventoId}`)
      return resenas
    } catch (error) {
      console.error(`Error al obtener reseñas para el tipo de evento ${tipoEventoId}:`, error)
      return []
    }
  },
  // Método para incrementar los likes de una reseña
  async incrementLikes(reviewId) {
    const db = await getDb()
    try {
      // Verificar si la reseña existe
      const review = await this.getById(reviewId)
      if (!review) {
        return { success: false, message: "Reseña no encontrada" }
      }

      // Incrementar los likes
      const currentLikes = review.likes || 0
      const newLikes = currentLikes + 1

      const result = await db.run("UPDATE resenas SET likes = ? WHERE id = ?", [newLikes, reviewId])

      if (result.changes === 0) {
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
    const db = await getDb()
    try {
      const resenas = await db.all(
        `
        SELECT r.*, t.nombre as tipo_evento, t.icono as eventIcon 
        FROM resenas r
        LEFT JOIN tipos_eventos t ON r.tipo_evento_id = t.id
        WHERE r.verificado = 1
        ORDER BY r.likes DESC, r.id DESC
        LIMIT ?
        `,
        [limit],
      )
      return resenas
    } catch (error) {
      console.error("Error al obtener reseñas más gustadas:", error)
      return []
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
      // Verificar si la tabla existe
      const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='equipo'")

      if (!tableExists) {
        // Crear la tabla si no existe
        await db.exec(`
          CREATE TABLE IF NOT EXISTS equipo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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

      const team = await db.all("SELECT * FROM equipo ORDER BY orden ASC")
      console.log(`Obtenidos ${team.length} miembros del equipo`)
      return team
    } catch (error) {
      console.error("Error al obtener equipo:", error)
      return []
    }
  },

  async getById(id) {
    const db = await getDb()
    try {
      return await db.get("SELECT * FROM equipo WHERE id = ?", id)
    } catch (error) {
      console.error(`Error al obtener miembro del equipo con id ${id}:`, error)
      return null
    }
  },

  async crear(miembroData) {
    const db = await getDb()
    try {
      const { nombre, cargo, descripcion, foto_url, orden, redes_sociales } = miembroData

      // Verify if the table exists
      const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='equipo'")

      if (!tableExists) {
        // Create the table if it doesn't exist with the redes_sociales column
        await db.exec(`
          CREATE TABLE IF NOT EXISTS equipo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        const tableInfo = await db.all("PRAGMA table_info(equipo)")
        const redesColumnExists = tableInfo.some((column) => column.name === "redes_sociales")

        // Add redes_sociales column if it doesn't exist
        if (!redesColumnExists) {
          await db.run("ALTER TABLE equipo ADD COLUMN redes_sociales TEXT DEFAULT '{}'")
        }
      }

      // Insert the new member
      const result = await db.run(
        `INSERT INTO equipo (nombre, posicion, bio, imagen, orden, redes_sociales)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre, cargo, descripcion, foto_url, orden, redes_sociales],
      )

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error("Error al crear miembro del equipo:", error)
      return { success: false, message: `Error al crear miembro del equipo: ${error.message}` }
    }
  },

  async actualizar(id, miembroData) {
    const db = await getDb()
    try {
      const { nombre, cargo, descripcion, foto_url, orden, redes_sociales } = miembroData

      // Check if redes_sociales column exists
      const tableInfo = await db.all("PRAGMA table_info(equipo)")
      const redesColumnExists = tableInfo.some((column) => column.name === "redes_sociales")

      // Add redes_sociales column if it doesn't exist
      if (!redesColumnExists) {
        await db.run("ALTER TABLE equipo ADD COLUMN redes_sociales TEXT DEFAULT '{}'")
      }

      // Build the SQL query dynamically
      let sql = "UPDATE equipo SET "
      const params = []
      const fields = []

      if (nombre !== undefined) {
        fields.push("nombre = ?")
        params.push(nombre)
      }

      if (cargo !== undefined) {
        fields.push("posicion = ?")
        params.push(cargo)
      }

      if (descripcion !== undefined) {
        fields.push("bio = ?")
        params.push(descripcion)
      }

      if (foto_url !== undefined) {
        fields.push("imagen = ?")
        params.push(foto_url)
      }

      if (orden !== undefined) {
        fields.push("orden = ?")
        params.push(orden)
      }

      if (redes_sociales !== undefined) {
        fields.push("redes_sociales = ?")
        params.push(redes_sociales)
      }

      sql += fields.join(", ") + " WHERE id = ?"
      params.push(id)

      console.log("SQL Query:", sql)
      console.log("Params:", params)

      // Update the member data
      const result = await db.run(sql, params)

      if (result.changes === 0) {
        return { success: false, message: "Miembro no encontrado o no se realizaron cambios" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar miembro del equipo con id ${id}:`, error)
      return { success: false, message: `Error al actualizar miembro del equipo: ${error.message}` }
    }
  },

  async actualizarOrden(id, orden) {
    const db = await getDb()
    try {
      const result = await db.run("UPDATE equipo SET orden = ? WHERE id = ?", [orden, id])

      if (result.changes === 0) {
        return { success: false, message: "Miembro no encontrado o no se realizaron cambios" }
      }

      return { success: true }
    } catch (error) {
      console.error(`Error al actualizar orden del miembro con id ${id}:`, error)
      return { success: false, message: `Error al actualizar orden: ${error.message}` }
    }
  },

  async eliminar(id) {
    const db = await getDb()
    try {
      // Obtener información del miembro para eliminar la imagen si existe
      const miembro = await this.getById(id)

      // Eliminar el miembro
      const result = await db.run("DELETE FROM equipo WHERE id = ?", id)

      if (result.changes === 0) {
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
    const db = await getDb()
    try {
      const result = await db.all("SELECT DISTINCT posicion FROM equipo WHERE posicion IS NOT NULL")
      return result.map((item) => item.posicion)
    } catch (error) {
      console.error("Error al obtener cargos únicos:", error)
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
  async getCount() {
    const db = await getDb()
    try {
      const result = await db.get("SELECT COUNT(*) as count FROM contacto_mensajes")
      return result.count
    } catch (error) {
      console.error("Error al obtener el conteo de contacto mensajes:", error)
      return 0
    }
  },
  // Nuevo método para obtener los mensajes más recientes
  async getRecent(limit = 5) {
    const db = await getDb()
    try {
      return await db.all(
        `
        SELECT * FROM contacto_mensajes 
        ORDER BY fecha_envio DESC 
        LIMIT ?
      `,
        [limit],
      )
    } catch (error) {
      console.error("Error al obtener mensajes recientes:", error)
      return []
    }
  },
  async getAll() {
    const db = await getDb()
    try {
      return await db.all("SELECT * FROM contacto_mensajes ORDER BY fecha_envio DESC")
    } catch (error) {
      console.error("Error al obtener mensajes:", error)
      return []
    }
  },
  // Guardar mensaje con fecha local
async guardarMensaje(mensaje) {
  const db = await getDb()
  try {
    const { nombre, email, telefono, tipo_evento, mensaje: contenido } = mensaje
    
    // Obtener fecha y hora local
    const fechaEnvio = await getLocalDateTime()
    
    const result = await db.run(
      `
      INSERT INTO contacto_mensajes (nombre, email, telefono, tipo_evento, mensaje, fecha_envio)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [nombre, email, telefono, tipo_evento, contenido, fechaEnvio.toISOString()]
    )

    return { success: true, id: result.lastID }
  } catch (error) {
    console.error("Error al guardar mensaje de contacto:", error)
    return { success: false, message: "Error al guardar el mensaje." }
  }
},
// Obtener un mensaje por ID con nombre del evento
async obtenerMensajePorId(id) {
  const db = await getDb()
  try {
    // Obtener el mensaje
    const mensaje = await db.get("SELECT * FROM contacto_mensajes WHERE id = ?", id)
    
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
  const db = await getDb()
  try {
    // Verificar si existe la columna leido
    const tableInfo = await db.all("PRAGMA table_info(contacto_mensajes)")
    const leidoColumnExists = tableInfo.some(column => column.name === "leido")
    
    // Si no existe, crearla
    if (!leidoColumnExists) {
      await db.run("ALTER TABLE contacto_mensajes ADD COLUMN leido INTEGER DEFAULT 0")
    }
    
    const result = await db.run("UPDATE contacto_mensajes SET leido = 1 WHERE id = ?", id)
    
    if (result.changes === 0) {
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
  const db = await getDb()
  try {
    // Verificar si existen las columnas necesarias
    const tableInfo = await db.all("PRAGMA table_info(contacto_mensajes)")
    
    // Verificar columna respondido
    const respondidoColumnExists = tableInfo.some(column => column.name === "respondido")
    if (!respondidoColumnExists) {
      await db.run("ALTER TABLE contacto_mensajes ADD COLUMN respondido INTEGER DEFAULT 0")
    }
    
    // Verificar columna respondido_por
    const respondidoPorColumnExists = tableInfo.some(column => column.name === "respondido_por")
    if (!respondidoPorColumnExists) {
      await db.run("ALTER TABLE contacto_mensajes ADD COLUMN respondido_por TEXT")
    }
    
    // Verificar columna fecha_respuesta
    const fechaRespuestaColumnExists = tableInfo.some(column => column.name === "fecha_respuesta")
    if (!fechaRespuestaColumnExists) {
      await db.run("ALTER TABLE contacto_mensajes ADD COLUMN fecha_respuesta TIMESTAMP")
    }
    
    // Verificar columna respuesta
    const respuestaColumnExists = tableInfo.some(column => column.name === "respuesta")
    if (!respuestaColumnExists) {
      await db.run("ALTER TABLE contacto_mensajes ADD COLUMN respuesta TEXT")
    }
    
    // Obtener fecha y hora local
    const fechaRespuesta = await getLocalDateTime()
    
    const result = await db.run(
      `UPDATE contacto_mensajes 
       SET respondido = 1, 
           respondido_por = ?, 
           fecha_respuesta = ?, 
           respuesta = ? 
       WHERE id = ?`,
      [respondidoPor, fechaRespuesta.toISOString(), respuesta, id]
    )
    
    if (result.changes === 0) {
      return { success: false, message: "Mensaje no encontrado" }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error al marcar mensaje como respondido:", error)
    return { success: false, message: error.message }
  }
},

// Registrar reenvío de mensaje
async registrarReenvio(id, usuarioId, destinatario) {
  const db = await getDb()
  try {
    // Verificar si existe la tabla de reenvíos
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='contacto_reenvios'")
    
    // Si no existe, crearla
    if (!tableExists) {
      await db.run(`
        CREATE TABLE contacto_reenvios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contacto_id INTEGER,
          usuario_id INTEGER,
          destinatario TEXT,
          fecha_reenvio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contacto_id) REFERENCES contacto_mensajes(id)
        )
      `)
    }
    
    const result = await db.run(
      `INSERT INTO contacto_reenvios (contacto_id, usuario_id, destinatario)
       VALUES (?, ?, ?)`,
      [id, usuarioId, destinatario]
    )
    
    return { success: true, id: result.lastID }
  } catch (error) {
    console.error("Error al registrar reenvío:", error)
    return { success: false, message: error.message }
  }
},

// Archivar mensaje
async archivar(id) {
  const db = await getDb()
  try {
    // Verificar si existe la columna archivado
    const tableInfo = await db.all("PRAGMA table_info(contacto_mensajes)")
    const archivadoColumnExists = tableInfo.some(column => column.name === "archivado")
    
    // Si no existe, crearla
    if (!archivadoColumnExists) {
      await db.run("ALTER TABLE contacto_mensajes ADD COLUMN archivado INTEGER DEFAULT 0")
    }
    
    const result = await db.run("UPDATE contacto_mensajes SET archivado = 1 WHERE id = ?", id)
    
    if (result.changes === 0) {
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
  const db = await getDb()
  try {
    // Verificar si existe la columna archivado
    const tableInfo = await db.all("PRAGMA table_info(contacto_mensajes)")
    const archivadoColumnExists = tableInfo.some(column => column.name === "archivado")
    
    // Si no existe, crearla
    if (!archivadoColumnExists) {
      await db.run("ALTER TABLE contacto_mensajes ADD COLUMN archivado INTEGER DEFAULT 0")
      return { success: true } // Si la columna no existía, no hay nada que desarchivar
    }
    
    const result = await db.run("UPDATE contacto_mensajes SET archivado = 0 WHERE id = ?", id)
    
    if (result.changes === 0) {
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
  const db = await getDb()
  try {
    const result = await db.run("DELETE FROM contacto_mensajes WHERE id = ?", id)
    
    if (result.changes === 0) {
      return { success: false, message: "Mensaje no encontrado" }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error al eliminar mensaje:", error)
    return { success: false, message: error.message }
  }
}
  
          
}

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
      const cotizaciones = await db.all(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM cotizaciones c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        ORDER BY c.fecha_creacion DESC
      `,
      )
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

  async getCount() {
    const db = await getDb()
    try {
      const result = await db.get("SELECT COUNT(*) as count FROM cotizaciones")
      return result.count
    } catch (error) {
      console.error("Error al obtener el conteo de cotizaciones:", error)
      return 0
    }
  },

  // Nuevo método para obtener los mensajes más recientes
  async getRecent(limit = 5) {
    const db = await getDb()
    try {
      return await db.all(
        `SELECT * FROM cotizaciones 
         ORDER BY fecha_creacion DESC 
         LIMIT ?`,
        [limit],
      )
    } catch (error) {
      console.error("Error al obtener cotizaciones recientes:", error)
      return []
    }
  },

  // Método para crear una cotización
  async crear(cotizacion, getDb) {
    try {
      const db = await getDb()
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error("Error al crear cotización:", error)
      return { success: false, message: `Error al crear cotización: ${error.message}` }
    }
  },

  // Método para actualizar una cotización
  async actualizar(cotizacion, getDb) {
    try {
      const db = await getDb()
      const result = await db.run(
        `
      UPDATE cotizaciones SET
        nombre_cliente = ?,
        email = ?,
        telefono = ?,
        fecha_evento = ?,
        num_meseros = ?,
        duracion_servicio = ?,
        ubicacion = ?,
        tipo_evento_id = ?,
        lavalozas = ?,
        cuida_coches = ?,
        montaje_desmontaje = ?,
        costo_base = ?,
        costo_adicionales = ?,
        cargo_ubicacion = ?,
        costo_total = ?,
        estado = ?
      WHERE id = ?
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

      if (result.changes === 0) {
        return { success: false, message: "Cotización no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar cotización:", error)
      return { success: false, message: `Error al actualizar cotización: ${error.message}` }
    }
  },

  // Método para eliminar una cotización
  async eliminar(id, getDb) {
    try {
      const db = await getDb()
      const result = await db.run("DELETE FROM cotizaciones WHERE id = ?", [id])

      if (result.changes === 0) {
        return { success: false, message: "Cotización no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar cotización:", error)
      return { success: false, message: `Error al eliminar cotización: ${error.message}` }
    }
  },

  // Método para actualizar el estado de una cotización
  async actualizarEstado(id, estado, getDb) {
    try {
      const db = await getDb()
      const result = await db.run("UPDATE cotizaciones SET estado = ? WHERE id = ?", [estado, id])

      if (result.changes === 0) {
        return { success: false, message: "Cotización no encontrada" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar estado de cotización:", error)
      return { success: false, message: `Error al actualizar estado: ${error.message}` }
    }
  },

  // Método para asociar servicios a una cotización
  async asociarServicios(cotizacionId, serviciosIds, getDb) {
    try {
      const db = await getDb()

      // Crear tabla de relación si no existe
      await db.run(`
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
        await db.run("INSERT OR IGNORE INTO cotizacion_servicios (cotizacion_id, servicio_id) VALUES (?, ?)", [
          cotizacionId,
          servicioId,
        ])
      }

      return { success: true }
    } catch (error) {
      console.error("Error al asociar servicios a cotización:", error)
      return { success: false, message: `Error al asociar servicios: ${error.message}` }
    }
  },

  // Método para eliminar servicios asociados a una cotización
  async eliminarServicios(cotizacionId, getDb) {
    try {
      const db = await getDb()

      await db.run("DELETE FROM cotizacion_servicios WHERE cotizacion_id = ?", [cotizacionId])

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar servicios de cotización:", error)
      return { success: false, message: `Error al eliminar servicios: ${error.message}` }
    }
  },
  // Add this method to cotizacionesRepo in postgress-db.js
  async actualizarNumeroContrato(id, numeroContrato, getDb) {
    try {
      const db = await getDb()
      const result = await db.run("UPDATE cotizaciones SET numero_contrato = ? WHERE id = ?", [numeroContrato, id])

      if (result.changes === 0) {
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
      const db = await getDb()

      // Verificar si la tabla existe
      const tableExists = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='cotizacion_servicios'
    `)

      if (!tableExists) {
        return []
      }

      const servicios = await db.all(
        `
      SELECT s.id, s.titulo, s.descripcion_corta, s.precio, s.precio_desde
      FROM servicios s
      JOIN cotizacion_servicios cs ON s.id = cs.servicio_id
      WHERE cs.cotizacion_id = ?
    `,
        [cotizacionId],
      )

      return servicios.map((s) => s.id)
    } catch (error) {
      console.error(`Error al obtener servicios de cotización ${cotizacionId}:`, error)
      return []
    }
  },
}

// Repositorio de contratos
export const contratosRepo = {
  // Add to contratosRepo in postgress-db.js
  async getCount(estado = null) {
    const db = await getDb()
    try {
      let query = "SELECT COUNT(*) as count FROM contratos"
      const params = []

      if (estado) {
        query += " WHERE estado = ?"
        params.push(estado)
      }

      const result = await db.get(query, params)
      return result.count
    } catch (error) {
      console.error("Error al obtener el conteo de contratos:", error)
      return 0
    }
  },
  async getAll() {
    const db = await getDb()
    try {
      const contratos = await db.all(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM contratos c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        ORDER BY c.fecha_creacion DESC
      `,
      )
      console.log(`Obtenidos ${contratos.length} contratos`)
      return contratos
    } catch (error) {
      console.error("Error al obtener contratos:", error)
      return []
    }
  },
  async getById(id) {
    const db = await getDb()
    try {
      return await db.get(
        `
        SELECT c.*, t.nombre as tipo_evento 
        FROM contratos c
        LEFT JOIN tipos_eventos t ON c.tipo_evento_id = t.id
        WHERE c.id = ?
        `,
        id,
      )
    } catch (error) {
      console.error(`Error al obtener contrato con id ${id}:`, error)
      return null
    }
  },

  // Método para obtener un contrato por número
  async getByNumero(numeroContrato) {
    try {
      const db = await getDb()
      const contrato = await db.get(
        `
      SELECT c.*, te.nombre as tipo_evento
      FROM contratos c
      LEFT JOIN tipos_eventos te ON c.tipo_evento_id = te.id
      WHERE c.numero_contrato = ?
    `,
        [numeroContrato],
      )

      return contrato
    } catch (error) {
      console.error(`Error al obtener contrato con número ${numeroContrato}:`, error)
      return null
    }
  },

  // Método para crear un contrato
  async crear(contrato, getDb) {
    try {
      const db = await getDb()
      const result = await db.run(
        `
      INSERT INTO contratos (
        numero_contrato,
        nombre_cliente,
        fecha_evento,
        tipo_evento_id,
        estado,
        fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, ?)
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

      return { success: true, id: result.lastID }
    } catch (error) {
      console.error("Error al crear contrato:", error)
      return { success: false, message: `Error al crear contrato: ${error.message}` }
    }
  },

  // Método para crear o actualizar un contrato
  async crearOActualizar(contrato, getDb) {
    try {
      const db = await getDb()

      // Verificar si ya existe un contrato con ese número
      const contratoExistente = await this.getByNumero(contrato.numero_contrato)

      if (contratoExistente) {
        // Actualizar contrato existente
        const result = await db.run(
          `
        UPDATE contratos SET
          nombre_cliente = ?,
          fecha_evento = ?,
          tipo_evento_id = ?,
          estado = ?
        WHERE numero_contrato = ?
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
        return await this.crear(contrato, getDb)
      }
    } catch (error) {
      console.error("Error al crear o actualizar contrato:", error)
      return { success: false, message: `Error al crear o actualizar contrato: ${error.message}` }
    }
  },

  // Método para actualizar un contrato
  async actualizar(contrato, getDb) {
    try {
      const db = await getDb()
      const result = await db.run(
        `
      UPDATE contratos SET
        numero_contrato = ?,
        nombre_cliente = ?,
        fecha_evento = ?,
        tipo_evento_id = ?,
        estado = ?
      WHERE id = ?
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

      if (result.changes === 0) {
        return { success: false, message: "Contrato no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar contrato:", error)
      return { success: false, message: `Error al actualizar contrato: ${error.message}` }
    }
  },

  // Método para eliminar un contrato
  async eliminar(id, getDb) {
    try {
      const db = await getDb()
      const result = await db.run("DELETE FROM contratos WHERE id = ?", [id])

      if (result.changes === 0) {
        return { success: false, message: "Contrato no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al eliminar contrato:", error)
      return { success: false, message: `Error al eliminar contrato: ${error.message}` }
    }
  },

  // Método para actualizar el estado de un contrato
  async actualizarEstado(numeroContrato, estado, getDb) {
    try {
      const db = await getDb()
      const result = await db.run("UPDATE contratos SET estado = ? WHERE numero_contrato = ?", [estado, numeroContrato])

      if (result.changes === 0) {
        return { success: false, message: "Contrato no encontrado" }
      }

      return { success: true }
    } catch (error) {
      console.error("Error al actualizar estado de contrato:", error)
      return { success: false, message: `Error al actualizar estado: ${error.message}` }
    }
  },

  // Método para verificar si un contrato está siendo utilizado
  async isInUse(numeroContrato, getDb) {
    try {
      const db = await getDb()

      // Verificar en reseñas
      const resenasCount = await db.get("SELECT COUNT(*) as count FROM resenas WHERE numero_contrato = ?", [
        numeroContrato,
      ])

      return resenasCount.count > 0
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
  async getUltimoNumero(year, month, getDb) {
    try {
      const db = await getDb()
      const patron = `CONT-${year}-${month}-%`

      const result = await db.get(
        "SELECT numero_contrato FROM contratos WHERE numero_contrato LIKE ? ORDER BY id DESC LIMIT 1",
        [patron],
      )

      return result ? result.numero_contrato : null
    } catch (error) {
      console.error("Error al obtener último número de contrato:", error)
      return null
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

