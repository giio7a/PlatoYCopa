import { fileURLToPath } from "url"
import path from "path"

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function configureCotizacionesRoutes(app, db) {
  // Middleware para verificar autenticación
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })
// In cotizaciones-routes.js - Fix the dashboard/cotizaciones route
app.get("/dashboard/cotizaciones", isAuthenticated, async (req, res) => {
  try {
    // Obtener parámetros de paginación y filtrado
    const page = Number.parseInt(req.query.page) || 1
    const limit = 10
    const offset = (page - 1) * limit
    const estado = req.query.estado || null
    const tab = req.query.tab || null

    // Obtener cotizaciones con paginación y filtrado
    const cotizaciones = await db.cotizacionesRepo.getAll(limit, offset, estado)

    // Obtener contratos con paginación y filtrado
    const contratos = await db.contratosRepo.getAll(limit, offset, estado)

    // Obtener el total de cotizaciones para la paginación
    const totalCotizaciones = await db.cotizacionesRepo.getCount(estado)
    
    // Obtener el total de contratos para la paginación
    const totalContratos = await db.contratosRepo.getCount(estado)

    // Obtener tipos de eventos para los formularios
    const tiposEventos = await db.tiposEventosRepo.getAll()

    // Obtener servicios para los formularios
    const servicios = await db.serviciosRepo.getAll()

    // Calcular paginación
    const totalPages = Math.ceil(totalCotizaciones / limit)
    const pages = []

    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        number: i,
        active: i === page,
      })
    }

    // Agregar el nombre del tipo de evento a cada cotización
    const cotizacionesConTipoEvento = await Promise.all(
      cotizaciones.map(async (cotizacion) => {
        if (cotizacion.tipo_evento_id) {
          const tipoEvento = await db.tiposEventosRepo.getById(cotizacion.tipo_evento_id)
          return {
            ...cotizacion,
            tipo_evento: tipoEvento ? tipoEvento.nombre : "Desconocido",
          }
        }
        return {
          ...cotizacion,
          tipo_evento: "Sin categoría",
        }
      }),
    )

    // Agregar el nombre del tipo de evento a cada contrato
    const contratosConTipoEvento = await Promise.all(
      contratos.map(async (contrato) => {
        if (contrato.tipo_evento_id) {
          const tipoEvento = await db.tiposEventosRepo.getById(contrato.tipo_evento_id)
          return {
            ...contrato,
            tipo_evento: tipoEvento ? tipoEvento.nombre : "Desconocido",
          }
        }
        return {
          ...contrato,
          tipo_evento: "Sin categoría",
        }
      }),
    )

    res.render("dashboard/cotizaciones", {
      title: "Gestión de Cotizaciones | Dashboard",
      user: req.session.user,
      cotizaciones: cotizacionesConTipoEvento,
      contratos: contratosConTipoEvento,
      tiposEventos,
      servicios,
      totalCotizaciones,
      totalContratos,
      currentPage: page,
      pages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1,
      layout: "dashboard-layout",
      active: "cotizaciones",
      tab: tab
    })
  } catch (error) {
    console.error("Error al cargar gestión de cotizaciones:", error)
    res.status(500).render("error", {
      message: "Error al cargar gestión de cotizaciones",
      error: process.env.NODE_ENV === "development" ? error : {},
      layout: "error-layout",
    })
  }
})

  // Ruta para obtener todos los contratos (dashboard)
  app.get("/dashboard/contratos", isAuthenticated, async (req, res) => {
    try {
      // Obtener parámetros de paginación y filtrado
      const page = Number.parseInt(req.query.page) || 1
      const limit = 10
      const offset = (page - 1) * limit
      const estado = req.query.estado || null

      // Obtener contratos con paginación y filtrado
      const contratos = await db.contratosRepo.getAll(limit, offset, estado)

      // Obtener el total de contratos para la paginación
      const totalContratos = await db.contratosRepo.getCount(estado)

      // Obtener tipos de eventos para los formularios
      const tiposEventos = await db.tiposEventosRepo.getAll()

      // Calcular paginación
      const totalPages = Math.ceil(totalContratos / limit)
      const pages = []

      for (let i = 1; i <= totalPages; i++) {
        pages.push({
          number: i,
          active: i === page,
        })
      }

      // Agregar el nombre del tipo de evento a cada contrato
      const contratosConTipoEvento = await Promise.all(
        contratos.map(async (contrato) => {
          if (contrato.tipo_evento_id) {
            const tipoEvento = await db.tiposEventosRepo.getById(contrato.tipo_evento_id)
            return {
              ...contrato,
              tipo_evento: tipoEvento ? tipoEvento.nombre : "Desconocido",
            }
          }
          return {
            ...contrato,
            tipo_evento: "Sin categoría",
          }
        }),
      )

      res.render("dashboard/contratos", {
        title: "Gestión de Contratos | Dashboard",
        user: req.session.user,
        contratos: contratosConTipoEvento,
        tiposEventos,
        totalContratos,
        currentPage: page,
        pages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1,
        layout: "dashboard-layout",
        active: "contratos",
      })
    } catch (error) {
      console.error("Error al cargar gestión de contratos:", error)
      res.status(500).render("error", {
        message: "Error al cargar gestión de contratos",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "error-layout",
      })
    }
  })

  // API para obtener una cotización por ID
  app.get("/api/cotizaciones/:id", isAuthenticated, async (req, res) => {
    try {
      const cotizacion = await db.cotizacionesRepo.getById(req.params.id)
      console.log("Cotización obtenida:", cotizacion);

      if (!cotizacion) {
        return res.status(404).json({ success: false, message: "Cotización no encontrada" })
      }

      // Obtener el tipo de evento
      if (cotizacion.tipo_evento_id) {
        const tipoEvento = await db.tiposEventosRepo.getById(cotizacion.tipo_evento_id)
        cotizacion.tipo_evento = tipoEvento ? tipoEvento.nombre : "Desconocido"
      } else {
        cotizacion.tipo_evento = "Sin categoría"
      }

      // Obtener servicios asociados a la cotización
      const servicios = await db.cotizacionesRepo.getServicios(req.params.id)
      cotizacion.servicios = servicios
      
      res.json({ success: true, cotizacion })
    } catch (error) {
      console.error(`Error al obtener cotización con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al obtener la cotización" })
    }
  })
// Fix the API endpoint in cotizaciones-routes.js
app.get("/api/contratos/:id", isAuthenticated, async (req, res) => {
  try {
    const contrato = await db.contratosRepo.getById(req.params.id);

    if (!contrato) {
      return res.status(404).json({ success: false, message: "Contrato no encontrado" });
    }

    // Obtener el tipo de evento
    if (contrato.tipo_evento_id) {
      const tipoEvento = await db.tiposEventosRepo.getById(contrato.tipo_evento_id);
      contrato.tipo_evento = tipoEvento ? tipoEvento.nombre : "Desconocido";
    } else {
      contrato.tipo_evento = "Sin categoría";
    }

    res.json({ success: true, contrato });
  } catch (error) {
    console.error(`Error al obtener contrato con ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: "Error al obtener el contrato" });
  }
});

  // API para crear una nueva cotización
 // Update the POST /api/cotizaciones endpoint in cotizaciones-routes.js
app.post("/api/cotizaciones", isAuthenticated, async (req, res) => {
  try {
    const {
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      tipo_evento_id,
      num_invitados,
      fecha_evento,
      hora_evento,
      ubicacion,
      servicios,
      detalles,
      costo_total,
      estado = "pendiente",
    } = req.body;

    // Validar campos requeridos
    if (!nombre_cliente || !email_cliente || !telefono_cliente || !tipo_evento_id || !fecha_evento) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios",
      });
    }

    // Combinar fecha y hora y validar que la fecha sea válida
    const fechaHoraStr = `${fecha_evento}T${hora_evento || "00:00"}:00`;
    console.log("Fecha y hora combinada:", fechaHoraStr);
    const fechaHoraEvento = new Date(fechaHoraStr);
    if (isNaN(fechaHoraEvento.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Fecha u hora del evento inválida",
      });
    }

    // Crear la cotización - Pasamos la función getDb de db
    const cotizacionData = {
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      fecha_evento: fechaHoraEvento.toISOString(),
      num_meseros: Number.parseInt(num_invitados) || 1,
      duracion_servicio: 6, // Valor por defecto
      ubicacion,
      tipo_evento_id,
      lavalozas: 0,
      cuida_coches: 0,
      montaje_desmontaje: 0,
      costo_base: Number.parseFloat(costo_total) || 0,
      costo_adicionales: 0,
      cargo_ubicacion: 0,
      costo_total: Number.parseFloat(costo_total) || 0,
      estado,
      fecha_creacion: new Date().toISOString(),
      numero_contrato: null, // Siempre null ahora
    };

    const result = await db.cotizacionesRepo.crear(cotizacionData, db.getDb);

    if (result.success) {
      // Si se proporcionaron servicios, asociarlos a la cotización
      if (servicios && Array.isArray(servicios) && servicios.length > 0) {
        await db.cotizacionesRepo.asociarServicios(result.id, servicios, db.getDb);
      }

      res.json({ success: true, id: result.id, message: "Cotización creada correctamente" });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Error al crear cotización:", error);
    res.status(500).json({ success: false, message: "Error al crear la cotización" });
  }
});
  

  // API para crear un nuevo contrato
  app.post("/api/contratos", isAuthenticated, async (req, res) => {
    try {
      const { numero_contrato, nombre_cliente, fecha_evento, tipo_evento_id, estado = "pendiente" } = req.body

      // Validar campos requeridos
      if (!numero_contrato || !nombre_cliente || !fecha_evento || !tipo_evento_id) {
        return res.status(400).json({
          success: false,
          message: "Faltan campos obligatorios",
        })
      }

      // Verificar si ya existe un contrato con ese número
      const contratoExistente = await db.contratosRepo.getByNumero(numero_contrato)

      if (contratoExistente) {
        return res.status(400).json({
          success: false,
          message: "Ya existe un contrato con ese número",
        })
      }

      // Crear el contrato - Pasamos la función getDb de db
      const contratoData = {
        numero_contrato,
        nombre_cliente,
        fecha_evento: new Date(fecha_evento).toISOString(),
        tipo_evento_id,
        estado,
        fecha_creacion: new Date().toISOString(),
      }

      const result = await db.contratosRepo.crear(contratoData, db.getDb)

      if (result.success) {
        res.json({ success: true, id: result.id, message: "Contrato creado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error("Error al crear contrato:", error)
      res.status(500).json({ success: false, message: "Error al crear el contrato" })
    }
  })

// Update the PUT /api/cotizaciones/:id endpoint in cotizaciones-routes.js
app.put("/api/cotizaciones/:id", isAuthenticated, async (req, res) => {
  try {
    const {
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      tipo_evento_id,
      num_invitados,
      fecha_evento,
      hora_evento,
      ubicacion,
      servicios,
      detalles,
      costo_total,
      estado,
    } = req.body;

    // Validar campos requeridos
    if (!nombre_cliente || !email_cliente || !telefono_cliente || !tipo_evento_id || !fecha_evento) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios",
      });
    }

    // Obtener la cotización actual
    const cotizacion = await db.cotizacionesRepo.getById(req.params.id);
    if (!cotizacion) {
      return res.status(404).json({ success: false, message: "Cotización no encontrada" });
    }

    // Combinar fecha y hora de manera segura
    let fechaHoraEvento;
    try {
      // Asegurarse de que la fecha tenga el formato correcto (YYYY-MM-DD)
      const fechaParts = fecha_evento.split('-');
      if (fechaParts.length !== 3) {
        throw new Error("Formato de fecha inválido");
      }
      
      // Crear una fecha válida
      if (hora_evento) {
        // Si hay hora, combinarla con la fecha
        const horaParts = hora_evento.split(':');
        const horas = parseInt(horaParts[0], 10);
        const minutos = parseInt(horaParts[1], 10);
        
        fechaHoraEvento = new Date(
          parseInt(fechaParts[0], 10),
          parseInt(fechaParts[1], 10) - 1, // Meses en JS son 0-11
          parseInt(fechaParts[2], 10),
          horas,
          minutos
        );
      } else {
        // Si no hay hora, usar solo la fecha
        fechaHoraEvento = new Date(
          parseInt(fechaParts[0], 10),
          parseInt(fechaParts[1], 10) - 1,
          parseInt(fechaParts[2], 10)
        );
      }
      
      // Verificar que la fecha sea válida
      if (isNaN(fechaHoraEvento.getTime())) {
        throw new Error("Fecha u hora inválida");
      }
    } catch (error) {
      console.error("Error al procesar fecha y hora:", error);
      return res.status(400).json({
        success: false,
        message: "Fecha u hora del evento inválida",
      });
    }

    // Actualizar la cotización - Pasamos la función getDb de db
    const cotizacionData = {
      id: req.params.id,
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      fecha_evento: fechaHoraEvento.toISOString(),
      num_meseros: Number.parseInt(num_invitados) || 1,
      duracion_servicio: cotizacion.duracion_servicio || 6,
      ubicacion,
      tipo_evento_id,
      lavalozas: cotizacion.lavalozas || 0,
      cuida_coches: cotizacion.cuida_coches || 0,
      montaje_desmontaje: cotizacion.montaje_desmontaje || 0,
      costo_base: Number.parseFloat(costo_total) || 0,
      costo_adicionales: cotizacion.costo_adicionales || 0,
      cargo_ubicacion: cotizacion.cargo_ubicacion || 0,
      costo_total: Number.parseFloat(costo_total) || 0,
      estado,
      numero_contrato: cotizacion.numero_contrato, // Mantener el valor existente
    };

    const result = await db.cotizacionesRepo.actualizar(cotizacionData, db.getDb);

    if (result.success) {
      // Actualizar servicios asociados
      if (servicios && Array.isArray(servicios)) {
        // Primero eliminar las asociaciones existentes
        await db.cotizacionesRepo.eliminarServicios(req.params.id, db.getDb);

        // Luego crear las nuevas asociaciones
        if (servicios.length > 0) {
          await db.cotizacionesRepo.asociarServicios(req.params.id, servicios, db.getDb);
        }
      }

      res.json({ success: true, message: "Cotización actualizada correctamente" });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error(`Error al actualizar cotización con ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: "Error al actualizar la cotización" });
  }
});

  // API para actualizar un contrato
  app.put("/api/contratos/:id", isAuthenticated, async (req, res) => {
    try {
      const { numero_contrato, nombre_cliente, fecha_evento, tipo_evento_id, estado } = req.body

      // Validar campos requeridos
      if (!numero_contrato || !nombre_cliente || !fecha_evento || !tipo_evento_id) {
        return res.status(400).json({
          success: false,
          message: "Faltan campos obligatorios",
        })
      }

      // Obtener el contrato actual
      const contrato = await db.contratosRepo.getById(req.params.id)
      if (!contrato) {
        return res.status(404).json({ success: false, message: "Contrato no encontrado" })
      }

      // Verificar si ya existe otro contrato con ese número
      if (numero_contrato !== contrato.numero_contrato) {
        const contratoExistente = await db.contratosRepo.getByNumero(numero_contrato)

        if (contratoExistente && contratoExistente.id !== Number.parseInt(req.params.id)) {
          return res.status(400).json({
            success: false,
            message: "Ya existe otro contrato con ese número",
          })
        }
      }

      // Actualizar el contrato - Pasamos la función getDb de db
      const contratoData = {
        id: req.params.id,
        numero_contrato,
        nombre_cliente,
        fecha_evento: new Date(fecha_evento).toISOString(),
        tipo_evento_id,
        estado,
      }

      const result = await db.contratosRepo.actualizar(contratoData, db.getDb)

      if (result.success) {
        res.json({ success: true, message: "Contrato actualizado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al actualizar contrato con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al actualizar el contrato" })
    }
  })

  // API para eliminar una cotización
  app.delete("/api/cotizaciones/:id", isAuthenticated, async (req, res) => {
    try {
      // Verificar si la cotización existe
      const cotizacion = await db.cotizacionesRepo.getById(req.params.id)
      if (!cotizacion) {
        return res.status(404).json({ success: false, message: "Cotización no encontrada" })
      }

      // Eliminar servicios asociados primero
      await db.cotizacionesRepo.eliminarServicios(req.params.id, db.getDb)

      // Eliminar la cotización - Pasamos la función getDb de db
      const result = await db.cotizacionesRepo.eliminar(req.params.id, db.getDb)

      if (result.success) {
        res.json({ success: true, message: "Cotización eliminada correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al eliminar cotización con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al eliminar la cotización" })
    }
  })


  
  // API para eliminar un contrato
  app.delete("/api/contratos/:id", isAuthenticated, async (req, res) => {
    try {
      // Verificar si el contrato existe
      const contrato = await db.contratosRepo.getById(req.params.id)
      if (!contrato) {
        return res.status(404).json({ success: false, message: "Contrato no encontrado" })
      }

      // Verificar si el contrato está siendo utilizado en reseñas
      const isInUse = await db.contratosRepo.isInUse(contrato.numero_contrato, db.getDb)
      if (isInUse) {
        return res.status(400).json({
          success: false,
          message: "No se puede eliminar este contrato porque está siendo utilizado en reseñas",
        })
      }

      // Eliminar el contrato - Pasamos la función getDb de db
      const result = await db.contratosRepo.eliminar(req.params.id, db.getDb)

      if (result.success) {
        res.json({ success: true, message: "Contrato eliminado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al eliminar contrato con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al eliminar el contrato" })
    }
  })

  // API para cambiar el estado de una cotización
  app.put("/api/cotizaciones/:id/estado", isAuthenticated, async (req, res) => {
    try {
      const { estado } = req.body

      // Validar estado
      if (!["pendiente", "confirmada", "cancelada"].includes(estado)) {
        return res.status(400).json({ success: false, message: "Estado no válido" })
      }

      // Obtener la cotización actual
      const cotizacion = await db.cotizacionesRepo.getById(req.params.id)
      if (!cotizacion) {
        return res.status(404).json({ success: false, message: "Cotización no encontrada" })
      }

      // Actualizar el estado - Pasamos la función getDb de db
      const result = await db.cotizacionesRepo.actualizarEstado(req.params.id, estado, db.getDb)

      if (result.success) {
        // Si la cotización tiene un contrato asociado y el estado es "confirmada", actualizar el contrato
        if (cotizacion.numero_contrato && estado === "confirmada") {
          await db.contratosRepo.actualizarEstado(cotizacion.numero_contrato, "completado", db.getDb)
        }

        res.json({ success: true, message: "Estado actualizado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al actualizar estado de cotización con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al actualizar el estado" })
    }
  })

  // API para cambiar el estado de un contrato
  app.put("/api/contratos/:id/estado", isAuthenticated, async (req, res) => {
    try {
      const { estado } = req.body

      // Validar estado
      if (!["pendiente", "completado", "cancelado"].includes(estado)) {
        return res.status(400).json({ success: false, message: "Estado no válido" })
      }

      // Obtener el contrato actual
      const contrato = await db.contratosRepo.getById(req.params.id)
      if (!contrato) {
        return res.status(404).json({ success: false, message: "Contrato no encontrado" })
      }

      // Actualizar el estado - Pasamos la función getDb de db
      const result = await db.contratosRepo.actualizarEstado(contrato.numero_contrato, estado, db.getDb)

      if (result.success) {
        res.json({ success: true, message: "Estado actualizado correctamente" })
      } else {
        res.status(500).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error(`Error al actualizar estado de contrato con ID ${req.params.id}:`, error)
      res.status(500).json({ success: false, message: "Error al actualizar el estado" })
    }
  })

  // API para verificar si un número de contrato existe
  app.get("/api/contratos/verificar/:numero", isAuthenticated, async (req, res) => {
    try {
      const contrato = await db.contratosRepo.getByNumero(req.params.numero)

      res.json({
        success: true,
        existe: !!contrato,
        contrato: contrato || null,
      })
    } catch (error) {
      console.error(`Error al verificar contrato ${req.params.numero}:`, error)
      res.status(500).json({ success: false, message: "Error al verificar el contrato" })
    }
  })

  // API para generar un número de contrato único
  app.get("/api/contratos/generar-numero", isAuthenticated, async (req, res) => {
    try {
      const year = new Date().getFullYear()
      const month = (new Date().getMonth() + 1).toString().padStart(2, "0")

      // Obtener el último número de contrato para este año/mes
      const ultimoContrato = await db.contratosRepo.getUltimoNumero(year, month, db.getDb)

      let numero = 1
      if (ultimoContrato) {
        // Extraer el número del último contrato
        const match = ultimoContrato.match(/(\d+)$/)
        if (match) {
          numero = Number.parseInt(match[1]) + 1
        }
      }

      // Formatear el nuevo número de contrato
      const nuevoNumero = `CONT-${year}-${month}-${numero.toString().padStart(3, "0")}`

      res.json({
        success: true,
        numero: nuevoNumero,
      })
    } catch (error) {
      console.error("Error al generar número de contrato:", error)
      res.status(500).json({ success: false, message: "Error al generar número de contrato" })
    }
  })
  // Add this endpoint to cotizaciones-routes.js if it doesn't exist
app.get("/api/contratos/numero/:numero", isAuthenticated, async (req, res) => {
  try {
    const contrato = await db.contratosRepo.getByNumero(req.params.numero);

    if (!contrato) {
      return res.status(404).json({ success: false, message: "Contrato no encontrado" });
    }

    res.json({ success: true, contrato });
  } catch (error) {
    console.error(`Error al obtener contrato con número ${req.params.numero}:`, error);
    res.status(500).json({ success: false, message: "Error al obtener el contrato" });
  }
});


}

