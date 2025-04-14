// Repositorio para gestionar cotizaciones en la base de datos

/**
 * Obtiene todas las cotizaciones con paginación y filtrado opcional
 * @param {Function} getDb - Función para obtener la conexión a la base de datos
 * @param {number} limit - Límite de resultados por página
 * @param {number} offset - Desplazamiento para paginación
 * @param {string} estado - Estado para filtrar (opcional)
 * @returns {Promise<Array>} - Lista de cotizaciones
 */
async function getAll(getDb, limit = 100, offset = 0, estado = "") {
    const db = getDb()
  
    try {
      let query = `
        SELECT c.*, te.nombre as tipo_evento
        FROM cotizaciones c
        LEFT JOIN tipos_eventos te ON c.tipo_evento_id = te.id
      `
  
      const params = []
  
      if (estado) {
        query += " WHERE c.estado = ?"
        params.push(estado)
      }
  
      query += " ORDER BY c.id DESC LIMIT ? OFFSET ?"
      params.push(limit, offset)
  
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows || [])
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.getAll:", error)
      throw error
    }
  }
  
  /**
   * Obtiene el número total de cotizaciones con filtrado opcional
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {string} estado - Estado para filtrar (opcional)
   * @returns {Promise<number>} - Número total de cotizaciones
   */
  async function getCount(getDb, estado = "") {
    const db = getDb()
  
    try {
      let query = "SELECT COUNT(*) as count FROM cotizaciones"
      const params = []
  
      if (estado) {
        query += " WHERE estado = ?"
        params.push(estado)
      }
  
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) {
            reject(err)
          } else {
            resolve(row ? row.count : 0)
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.getCount:", error)
      throw error
    }
  }
  
  /**
   * Obtiene una cotización por su ID
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID de la cotización
   * @returns {Promise<Object>} - Datos de la cotización
   */
  async function getById(getDb, id) {
    const db = getDb()
  
    try {
      const query = `
        SELECT c.*, te.nombre as tipo_evento
        FROM cotizaciones c
        LEFT JOIN tipos_eventos te ON c.tipo_evento_id = te.id
        WHERE c.id = ?
      `
  
      return new Promise((resolve, reject) => {
        db.get(query, [id], (err, row) => {
          if (err) {
            reject(err)
          } else {
            // Si hay servicios, convertirlos de JSON a array
            if (row && row.servicios) {
              try {
                row.servicios = JSON.parse(row.servicios)
              } catch (e) {
                row.servicios = []
              }
            }
            resolve(row)
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.getById:", error)
      throw error
    }
  }
  
  /**
   * Crea una nueva cotización
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {Object} cotizacion - Datos de la cotización
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function create(getDb, cotizacion) {
    const db = getDb()
  
    try {
      // Convertir array de servicios a JSON si existe
      if (cotizacion.servicios && Array.isArray(cotizacion.servicios)) {
        cotizacion.servicios = JSON.stringify(cotizacion.servicios)
      }
  
      // Calcular costos si no se proporcionaron
      if (!cotizacion.costo_base) {
        cotizacion.costo_base = 0
      }
  
      if (!cotizacion.costo_adicionales) {
        cotizacion.costo_adicionales = 0
      }
  
      if (!cotizacion.cargo_ubicacion) {
        cotizacion.cargo_ubicacion = 0
      }
  
      // Asegurar que el estado tenga un valor válido
      if (!cotizacion.estado) {
        cotizacion.estado = "pendiente"
      }
  
      const query = `
        INSERT INTO cotizaciones (
          nombre_cliente, email, telefono_cliente, fecha_evento, 
          num_meseros, duracion_servicio, ubicacion, tipo_evento_id,
          lavalozas, cuida_coches, montaje_desmontaje, costo_base,
          costo_adicionales, cargo_ubicacion, costo_total, estado,
          fecha_creacion, servicios, numero_contrato, detalles
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
  
      const params = [
        cotizacion.nombre_cliente,
        cotizacion.email_cliente,
        cotizacion.telefono_cliente,
        cotizacion.fecha_evento,
        cotizacion.num_meseros || 0,
        cotizacion.duracion_servicio || 0,
        cotizacion.ubicacion,
        cotizacion.tipo_evento_id,
        cotizacion.lavalozas ? 1 : 0,
        cotizacion.cuida_coches ? 1 : 0,
        cotizacion.montaje_desmontaje ? 1 : 0,
        cotizacion.costo_base,
        cotizacion.costo_adicionales,
        cotizacion.cargo_ubicacion,
        cotizacion.costo_total,
        cotizacion.estado,
        cotizacion.fecha_creacion,
        cotizacion.servicios || null,
        cotizacion.numero_contrato || null,
        cotizacion.detalles || null,
      ]
  
      return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ id: this.lastID })
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.create:", error)
      throw error
    }
  }
  
  /**
   * Actualiza una cotización existente
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID de la cotización
   * @param {Object} cotizacion - Datos actualizados de la cotización
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function update(getDb, id, cotizacion) {
    const db = getDb()
  
    try {
      // Convertir array de servicios a JSON si existe
      if (cotizacion.servicios && Array.isArray(cotizacion.servicios)) {
        cotizacion.servicios = JSON.stringify(cotizacion.servicios)
      }
  
      const query = `
        UPDATE cotizaciones SET
          nombre_cliente = ?,
          email = ?,
          telefono_cliente = ?,
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
          estado = ?,
          servicios = ?,
          numero_contrato = ?,
          detalles = ?
        WHERE id = ?
      `
  
      const params = [
        cotizacion.nombre_cliente,
        cotizacion.email_cliente,
        cotizacion.telefono_cliente,
        cotizacion.fecha_evento,
        cotizacion.num_meseros || 0,
        cotizacion.duracion_servicio || 0,
        cotizacion.ubicacion,
        cotizacion.tipo_evento_id,
        cotizacion.lavalozas ? 1 : 0,
        cotizacion.cuida_coches ? 1 : 0,
        cotizacion.montaje_desmontaje ? 1 : 0,
        cotizacion.costo_base || 0,
        cotizacion.costo_adicionales || 0,
        cotizacion.cargo_ubicacion || 0,
        cotizacion.costo_total,
        cotizacion.estado,
        cotizacion.servicios || null,
        cotizacion.numero_contrato || null,
        cotizacion.detalles || null,
        id,
      ]
  
      return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ changes: this.changes })
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.update:", error)
      throw error
    }
  }
  
  /**
   * Elimina una cotización
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID de la cotización
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function deleteItem(getDb, id) {
    const db = getDb()
  
    try {
      const query = "DELETE FROM cotizaciones WHERE id = ?"
  
      return new Promise((resolve, reject) => {
        db.run(query, [id], function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ changes: this.changes })
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.delete:", error)
      throw error
    }
  }
  
  /**
   * Actualiza el estado de una cotización
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID de la cotización
   * @param {string} estado - Nuevo estado
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function updateEstado(getDb, id, estado) {
    const db = getDb()
  
    try {
      const query = "UPDATE cotizaciones SET estado = ? WHERE id = ?"
  
      return new Promise((resolve, reject) => {
        db.run(query, [estado, id], function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ changes: this.changes })
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.updateEstado:", error)
      throw error
    }
  }
  
  /**
   * Actualiza el número de contrato en cotizaciones
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {string} numeroContrato - Número de contrato
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function updateNumeroContrato(getDb, numeroContrato) {
    const db = getDb()
  
    try {
      const query = `
        UPDATE cotizaciones 
        SET numero_contrato = ? 
        WHERE id IN (
          SELECT id FROM cotizaciones 
          WHERE numero_contrato IS NULL 
          ORDER BY fecha_creacion DESC 
          LIMIT 1
        )
      `
  
      return new Promise((resolve, reject) => {
        db.run(query, [numeroContrato], function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ changes: this.changes })
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.updateNumeroContrato:", error)
      throw error
    }
  }
  
  /**
   * Limpia el número de contrato en cotizaciones
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {string} numeroContrato - Número de contrato a limpiar
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function clearNumeroContrato(getDb, numeroContrato) {
    const db = getDb()
  
    try {
      const query = "UPDATE cotizaciones SET numero_contrato = NULL WHERE numero_contrato = ?"
  
      return new Promise((resolve, reject) => {
        db.run(query, [numeroContrato], function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ changes: this.changes })
          }
        })
      })
    } catch (error) {
      console.error("Error en cotizacionesRepo.clearNumeroContrato:", error)
      throw error
    }
  }
  
  module.exports = {
    getAll,
    getCount,
    getById,
    create,
    update,
    delete: deleteItem,
    updateEstado,
    updateNumeroContrato,
    clearNumeroContrato,
  }
  
  