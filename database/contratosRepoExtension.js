// Repositorio para gestionar contratos en la base de datos

/**
 * Obtiene todos los contratos con paginación y filtrado opcional
 * @param {Function} getDb - Función para obtener la conexión a la base de datos
 * @param {number} limit - Límite de resultados por página
 * @param {number} offset - Desplazamiento para paginación
 * @param {string} estado - Estado para filtrar (opcional)
 * @returns {Promise<Array>} - Lista de contratos
 */
async function getAll(getDb, limit = 100, offset = 0, estado = "") {
    const db = getDb()
  
    try {
      let query = `
        SELECT c.*, te.nombre as tipo_evento
        FROM contratos c
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
      console.error("Error en contratosRepo.getAll:", error)
      throw error
    }
  }
  
  /**
   * Obtiene el número total de contratos con filtrado opcional
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {string} estado - Estado para filtrar (opcional)
   * @returns {Promise<number>} - Número total de contratos
   */
  async function getCount(getDb, estado = "") {
    const db = getDb()
  
    try {
      let query = "SELECT COUNT(*) as count FROM contratos"
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
      console.error("Error en contratosRepo.getCount:", error)
      throw error
    }
  }
  
  /**
   * Obtiene un contrato por su ID
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID del contrato
   * @returns {Promise<Object>} - Datos del contrato
   */
  async function getById(getDb, id) {
    const db = getDb()
  
    try {
      const query = `
        SELECT c.*, te.nombre as tipo_evento
        FROM contratos c
        LEFT JOIN tipos_eventos te ON c.tipo_evento_id = te.id
        WHERE c.id = ?
      `
  
      return new Promise((resolve, reject) => {
        db.get(query, [id], (err, row) => {
          if (err) {
            reject(err)
          } else {
            resolve(row)
          }
        })
      })
    } catch (error) {
      console.error("Error en contratosRepo.getById:", error)
      throw error
    }
  }
  
  /**
   * Obtiene un contrato por su número
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {string} numeroContrato - Número del contrato
   * @returns {Promise<Object>} - Datos del contrato
   */
  async function getByNumero(getDb, numeroContrato) {
    const db = getDb()
  
    try {
      const query = `
        SELECT c.*, te.nombre as tipo_evento
        FROM contratos c
        LEFT JOIN tipos_eventos te ON c.tipo_evento_id = te.id
        WHERE c.numero_contrato = ?
      `
  
      return new Promise((resolve, reject) => {
        db.get(query, [numeroContrato], (err, row) => {
          if (err) {
            reject(err)
          } else {
            resolve(row)
          }
        })
      })
    } catch (error) {
      console.error("Error en contratosRepo.getByNumero:", error)
      throw error
    }
  }
  
  /**
   * Genera un número de contrato único
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @returns {Promise<string>} - Número de contrato generado
   */
  async function generarNumeroContrato(getDb) {
    const db = getDb()
  
    try {
      // Obtener el año actual
      const year = new Date().getFullYear()
  
      // Obtener el mes actual (1-12)
      const month = new Date().getMonth() + 1
  
      // Obtener el último número de contrato para este año
      const query = `
        SELECT numero_contrato 
        FROM contratos 
        WHERE numero_contrato LIKE 'CONT-${year}-%' 
        ORDER BY id DESC 
        LIMIT 1
      `
  
      return new Promise((resolve, reject) => {
        db.get(query, [], (err, row) => {
          if (err) {
            reject(err)
          } else {
            let nextNumber = 1
  
            if (row && row.numero_contrato) {
              // Extraer el número del último contrato
              const parts = row.numero_contrato.split("-")
              if (parts.length === 3) {
                nextNumber = Number.parseInt(parts[2]) + 1
              }
            }
  
            // Formatear el número con ceros a la izquierda (3 dígitos)
            const formattedNumber = String(nextNumber).padStart(3, "0")
  
            // Generar el número de contrato
            const numeroContrato = `CONT-${year}-${formattedNumber}`
  
            resolve(numeroContrato)
          }
        })
      })
    } catch (error) {
      console.error("Error en contratosRepo.generarNumeroContrato:", error)
      throw error
    }
  }
  
  /**
   * Crea un nuevo contrato
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {Object} contrato - Datos del contrato
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function create(getDb, contrato) {
    const db = getDb()
  
    try {
      // Asegurar que el estado tenga un valor válido
      if (!contrato.estado) {
        contrato.estado = "pendiente"
      }
  
      const query = `
        INSERT INTO contratos (
          numero_contrato, nombre_cliente, fecha_evento, 
          tipo_evento_id, estado, fecha_creacion
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
  
      const params = [
        contrato.numero_contrato,
        contrato.nombre_cliente,
        contrato.fecha_evento,
        contrato.tipo_evento_id,
        contrato.estado,
        contrato.fecha_creacion,
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
      console.error("Error en contratosRepo.create:", error)
      throw error
    }
  }
  
  /**
   * Actualiza un contrato existente
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID del contrato
   * @param {Object} contrato - Datos actualizados del contrato
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function update(getDb, id, contrato) {
    const db = getDb()
  
    try {
      const query = `
        UPDATE contratos SET
          numero_contrato = ?,
          nombre_cliente = ?,
          fecha_evento = ?,
          tipo_evento_id = ?,
          estado = ?
        WHERE id = ?
      `
  
      const params = [
        contrato.numero_contrato,
        contrato.nombre_cliente,
        contrato.fecha_evento,
        contrato.tipo_evento_id,
        contrato.estado,
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
      console.error("Error en contratosRepo.update:", error)
      throw error
    }
  }
  
  /**
   * Elimina un contrato
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID del contrato
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function deleteItem(getDb, id) {
    const db = getDb()
  
    try {
      const query = "DELETE FROM contratos WHERE id = ?"
  
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
      console.error("Error en contratosRepo.delete:", error)
      throw error
    }
  }
  
  /**
   * Actualiza el estado de un contrato
   * @param {Function} getDb - Función para obtener la conexión a la base de datos
   * @param {number} id - ID del contrato
   * @param {string} estado - Nuevo estado
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async function updateEstado(getDb, id, estado) {
    const db = getDb()
  
    try {
      const query = "UPDATE contratos SET estado = ? WHERE id = ?"
  
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
      console.error("Error en contratosRepo.updateEstado:", error)
      throw error
    }
  }
  
  module.exports = {
    getAll,
    getCount,
    getById,
    getByNumero,
    generarNumeroContrato,
    create,
    update,
    delete: deleteItem,
    updateEstado,
  }
  
  