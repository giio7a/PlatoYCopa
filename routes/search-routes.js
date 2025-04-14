import express from "express"

export default function configureSearchRoutes(app, db) {
  const router = express.Router()

  // Ruta de búsqueda
  router.get("/buscar", async (req, res) => {
    try {
      const query = req.query.q || ""

      // Si no hay consulta, mostrar página de búsqueda vacía
      if (!query || query.trim() === "") {
        return res.render("search-results", {
          title: "Búsqueda | Plato y Copa",
          query: "",
          results: {},
          totalResults: 0,
          activeSearch: true,
          pageTitle: "Búsqueda", // Para el título en el móvil
        })
      }

      // Sanitizar consulta
      const sanitizedQuery = query.trim().toLowerCase()

      // Obtener la conexión a la base de datos
      const dbConn = await db.getDb()

      // Realizar búsqueda en múltiples entidades
      let servicios = []
      let tiposEventos = []
      let galeria = []
      let resenas = []
      let mensajes = []

      // Solo buscar mensajes si el usuario está autenticado y es admin
      const isAdmin = req.session.user && req.session.user.rol === "admin"

      try {
        // Búsqueda en servicios
        servicios = await dbConn.all(
          `SELECT * FROM servicios 
           WHERE LOWER(titulo) LIKE ? 
           OR LOWER(descripcion_corta) LIKE ? 
           OR LOWER(descripcion_completa) LIKE ?
           ORDER BY destacado DESC, orden ASC`,
          [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`, `%${sanitizedQuery}%`],
        )

        // Búsqueda en tipos de eventos
        tiposEventos = await dbConn.all(
          `SELECT * FROM tipos_eventos 
           WHERE LOWER(nombre) LIKE ? 
           OR LOWER(descripcion) LIKE ?
           ORDER BY id ASC`,
          [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`],
        )

        // Búsqueda en galería
        galeria = await dbConn.all(
          `SELECT g.*, t.nombre as tipo_evento 
           FROM imagenes_galeria g
           LEFT JOIN tipos_eventos t ON g.tipo_evento_id = t.id
           WHERE LOWER(g.titulo) LIKE ? 
           OR LOWER(g.descripcion) LIKE ?
           OR LOWER(t.nombre) LIKE ?
           ORDER BY g.destacada DESC, g.orden ASC`,
          [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`, `%${sanitizedQuery}%`],
        )

        // Búsqueda en reseñas
        resenas = await dbConn.all(
          `SELECT r.*, t.nombre as tipo_evento 
           FROM resenas r
           LEFT JOIN tipos_eventos t ON r.tipo_evento_id = t.id
           WHERE r.verificado = 1 AND (
             LOWER(r.comentario) LIKE ? 
             OR LOWER(r.nombre_cliente) LIKE ?
             OR LOWER(t.nombre) LIKE ?
           )
           ORDER BY r.id DESC`,
          [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`, `%${sanitizedQuery}%`],
        )

        // Búsqueda en mensajes (solo para administradores)
        if (isAdmin) {
          mensajes = await dbConn.all(
            `SELECT * FROM contacto_mensajes 
             WHERE LOWER(nombre) LIKE ? 
             OR LOWER(email) LIKE ?
             OR LOWER(mensaje) LIKE ?
             ORDER BY fecha_envio DESC`,
            [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`, `%${sanitizedQuery}%`],
          )
        }
      } catch (error) {
        console.error("Error en búsqueda:", error)
      }

      // Formatear resultados
      const results = {
        servicios: servicios.map((item) => ({
          type: "servicio",
          icon: item.icono || "bi-star",
          title: item.titulo,
          description: item.descripcion_corta || item.descripcion_completa,
          url: `/servicios#${item.id}`,
          image: item.imagen_url || "/img/service-default.jpg",
        })),

        tiposEventos: tiposEventos.map((item) => ({
          type: "tipo_evento",
          icon: item.icono || "bi-calendar-event",
          title: item.nombre,
          description: item.descripcion,
          url: `/servicios#${item.nombre.toLowerCase().replace(/\s+/g, "-")}`,
          image: item.imagen_url || "/img/event-default.jpg",
        })),

        galeria: galeria.map((item) => ({
          type: "galeria",
          icon: "bi-image",
          title: item.titulo || "Imagen de galería",
          description: item.descripcion || `Imagen de ${item.tipo_evento || "evento"}`,
          url: `/galeria/${item.id}`,
          image: item.url_imagen || "/img/gallery-default.jpg",
        })),

        resenas: resenas.map((item) => {
          // Convertir el string JSON de imágenes a array si existe
          let imagenes = []
          try {
            if (item.imagenes) {
              imagenes = JSON.parse(item.imagenes)
            }
          } catch (e) {
            console.error("Error al parsear imágenes de reseña:", e)
          }

          return {
            type: "resena",
            icon: "bi-chat-square-text",
            title: `Reseña de ${item.nombre_cliente || "cliente"}`,
            description: item.comentario,
            rating: item.calificacion,
            url: `/resenas/${item.id}`,
            image: imagenes.length > 0 ? imagenes[0] : "/img/review-default.jpg",
          }
        }),
      }

      // Agregar mensajes solo para administradores
      if (isAdmin) {
        results.mensajes = mensajes.map((item) => ({
          type: "mensaje",
          icon: "bi-envelope",
          title: `Mensaje de ${item.nombre}`,
          description: item.mensaje,
          url: `/dashboard/mensajes#${item.id}`,
          date: item.fecha_envio,
          email: item.email,
        }))
      }

      // Calcular total de resultados
      const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)

      // Renderizar resultados
      res.render("search-results", {
        title: `Resultados para "${query}" | Plato y Copa`,
        query,
        results,
        totalResults,
        activeSearch: true,
        isAdmin,
        pageTitle: "Resultados de búsqueda", // Para el título en el móvil
      })
    } catch (error) {
      console.error("Error en búsqueda:", error)
      res.status(500).render("error", {
        title: "Error",
        error: "Error al procesar la búsqueda",
        layout: "main",
      })
    }
  })

  app.use("/", router)
}

