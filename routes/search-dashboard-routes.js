import { Router } from "express"

export default function configureSearchDashboardRoutes(app, db) {
  const router = Router()

  // Middleware para verificar autenticación
  const isAuthenticated =
    app.isAuthenticated ||
    ((req, res, next) => {
      if (req.session && req.session.user) {
        return next()
      }
      res.redirect("/auth")
    })

  // Ruta para la página de resultados de búsqueda
  router.get("/dashboard/buscar", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q || ""

      if (!query || query.length < 2) {
        return res.render("dashboard/search-dashboard-results", {
          title: "Resultados de búsqueda | Dashboard",
          pageTitle: "Resultados de búsqueda",
          user: req.session.user,
          query: query,
          results: [],
          noQuery: true,
          layout: "dashboard-layout",
          active: "search",
        })
      }

      // Realizar búsqueda en diferentes entidades
      const results = await performSearch(query, db)

      // Agrupar resultados por categoría
      const groupedResults = {}
      results.forEach((result) => {
        if (!groupedResults[result.category]) {
          groupedResults[result.category] = []
        }
        groupedResults[result.category].push(result)
      })

      // Añadir secciones del dashboard como resultados si coinciden con la búsqueda
      const dashboardSections = [
        { name: "Dashboard", url: "/dashboard", icon: "bi-speedometer2" },
        { name: "Servicios", url: "/dashboard/servicios", icon: "bi-card-checklist" },
        { name: "Tipos de Eventos", url: "/dashboard/tipos-eventos", icon: "bi-calendar-event" },
        { name: "Galería", url: "/dashboard/galeria", icon: "bi-images" },
        { name: "Cotizaciones", url: "/dashboard/cotizaciones", icon: "bi-receipt" },
        { name: "Mensajes", url: "/dashboard/mensajes", icon: "bi-envelope" },
        { name: "Reseñas", url: "/dashboard/resenas", icon: "bi-star" },
        { name: "Personal", url: "/dashboard/personal", icon: "bi-file-earmark-text" },
        { name: "Usuarios", url: "/dashboard/usuarios", icon: "bi-people" },
      ]

      const lowerQuery = query.toLowerCase()
      
      // Mejorar la búsqueda para detectar términos comunes y secciones
      const matchingSections = dashboardSections.filter((section) => {
        // Buscar coincidencias exactas o parciales en el nombre de la sección
        if (section.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Buscar coincidencias en términos relacionados
        const sectionTerms = {
          "Dashboard": ["inicio", "panel", "principal", "resumen"],
          "Servicios": ["servicio", "producto", "oferta"],
          "Tipos de Eventos": ["evento", "categoría", "tipo", "celebración", "fiesta"],
          "Galería": ["imagen", "foto", "fotografía", "album"],
          "Cotizaciones": ["cotización", "presupuesto", "costo", "precio"],
          "Mensajes": ["mensaje", "contacto", "comunicación", "correo"],
          "Reseñas": ["reseña", "comentario", "opinión", "valoración", "testimonio"],
          "Personal": ["empleado", "staff", "equipo", "trabajador"],
          "Usuarios": ["usuario", "cuenta", "perfil", "admin", "administrador"]
        };
        
        // Verificar si la búsqueda coincide con algún término relacionado
        return sectionTerms[section.name]?.some(term => term.includes(lowerQuery) || lowerQuery.includes(term));
      });

      if (matchingSections.length > 0) {
        groupedResults["Secciones"] = matchingSections.map((section) => ({
          id: section.name,
          title: section.name,
          description: `Ir a la sección ${section.name}`,
          category: "Secciones",
          url: section.url,
          icon: section.icon,
          isSection: true,
        }))
      }

      res.render("dashboard/search-dashboard-results", {
        title: "Resultados de búsqueda | Dashboard",
        pageTitle: "Resultados de búsqueda",
        user: req.session.user,
        query: query,
        results: results,
        groupedResults: groupedResults,
        totalResults: results.length + (groupedResults["Secciones"] ? groupedResults["Secciones"].length : 0),
        layout: "dashboard-layout",
        active: "search",
      })
    } catch (error) {
      console.error("Error al realizar búsqueda:", error)
      res.status(500).render("error", {
        message: "Error al realizar búsqueda",
        error: process.env.NODE_ENV === "development" ? error : {},
        layout: "error-layout",
      })
    }
  })

  // API para búsqueda global (para la barra de búsqueda en tiempo real)
  router.get("/api/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q || ""

      if (!query || query.length < 2) {
        return res.json({ success: true, results: [] })
      }

      // Realizar búsqueda en diferentes entidades
      const results = await performSearch(query, db, 3) // Limitar a 3 resultados por categoría

      // Agrupar resultados por categoría
      const groupedResults = {}
      results.forEach((result) => {
        if (!groupedResults[result.category]) {
          groupedResults[result.category] = []
        }
        groupedResults[result.category].push(result)
      })

      // Añadir secciones del dashboard como resultados si coinciden con la búsqueda
      const dashboardSections = [
        { name: "Dashboard", url: "/dashboard", icon: "bi-speedometer2" },
        { name: "Servicios", url: "/dashboard/servicios", icon: "bi-card-checklist" },
        { name: "Tipos de Eventos", url: "/dashboard/tipos-eventos", icon: "bi-calendar-event" },
        { name: "Galería", url: "/dashboard/galeria", icon: "bi-images" },
        { name: "Cotizaciones", url: "/dashboard/cotizaciones", icon: "bi-receipt" },
        { name: "Mensajes", url: "/dashboard/mensajes", icon: "bi-envelope" },
        { name: "Reseñas", url: "/dashboard/resenas", icon: "bi-star" },
        { name: "Personal", url: "/dashboard/personal", icon: "bi-file-earmark-text" },
        { name: "Usuarios", url: "/dashboard/usuarios", icon: "bi-people" },
      ]

      const lowerQuery = query.toLowerCase()
      
      // Mejorar la búsqueda para detectar términos comunes y secciones
      const matchingSections = dashboardSections.filter((section) => {
        // Buscar coincidencias exactas o parciales en el nombre de la sección
        if (section.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Buscar coincidencias en términos relacionados
        const sectionTerms = {
          "Dashboard": ["inicio", "panel", "principal", "resumen"],
          "Servicios": ["servicio", "producto", "oferta"],
          "Tipos de Eventos": ["evento", "categoría", "tipo", "celebración", "fiesta"],
          "Galería": ["imagen", "foto", "fotografía", "album"],
          "Cotizaciones": ["cotización", "presupuesto", "costo", "precio"],
          "Mensajes": ["mensaje", "contacto", "comunicación", "correo"],
          "Reseñas": ["reseña", "comentario", "opinión", "valoración", "testimonio"],
          "Personal": ["empleado", "staff", "equipo", "trabajador"],
          "Usuarios": ["usuario", "cuenta", "perfil", "admin", "administrador"]
        };
        
        // Verificar si la búsqueda coincide con algún término relacionado
        return sectionTerms[section.name]?.some(term => term.includes(lowerQuery) || lowerQuery.includes(term));
      });

      if (matchingSections.length > 0) {
        groupedResults["Secciones"] = matchingSections.map((section) => ({
          id: section.name,
          title: section.name,
          description: `Ir a la sección ${section.name}`,
          category: "Secciones",
          url: section.url,
          icon: section.icon,
          isSection: true,
        }))
      }

      res.json({
        success: true,
        results: [...results, ...(groupedResults["Secciones"] || [])],
        groupedResults: groupedResults,
      })
    } catch (error) {
      console.error("Error al realizar búsqueda API:", error)
      res.status(500).json({ success: false, message: "Error al realizar búsqueda" })
    }
  })

  // Función para realizar búsqueda en múltiples entidades
  async function performSearch(query, db, limit = 10) {
    const searchResults = []
    const lowerQuery = query.toLowerCase()

    try {
      // Búsqueda en servicios
      const servicios = await db.serviciosRepo.getAll()
      const serviciosResults = servicios
        .filter(
          (servicio) =>
            servicio.titulo.toLowerCase().includes(lowerQuery) ||
            (servicio.descripcion_corta && servicio.descripcion_corta.toLowerCase().includes(lowerQuery)) ||
            (servicio.descripcion_completa && servicio.descripcion_completa.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, limit)
        .map((servicio) => ({
          id: servicio.id,
          title: servicio.titulo,
          description: servicio.descripcion_corta || "",
          category: "Servicios",
          url: "/dashboard/servicios",
          icon: "bi-card-checklist",
          entityId: servicio.id,
          entityType: "servicio",
        }))

      searchResults.push(...serviciosResults)

      // Búsqueda en tipos de eventos
      const tiposEventos = await db.tiposEventosRepo.getAll()
      const tiposEventosResults = tiposEventos
        .filter(
          (tipo) =>
            tipo.nombre.toLowerCase().includes(lowerQuery) ||
            (tipo.descripcion && tipo.descripcion.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, limit)
        .map((tipo) => ({
          id: tipo.id,
          title: tipo.nombre,
          description: tipo.descripcion || "",
          category: "Tipos de Eventos",
          url: "/dashboard/tipos-eventos",
          icon: "bi-calendar-event",
          entityId: tipo.id,
          entityType: "tipo-evento",
        }))

      searchResults.push(...tiposEventosResults)

      // Búsqueda en galería
      const imagenes = await db.galeriaRepo.getAll()
      const imagenesResults = imagenes
        .filter(
          (imagen) =>
            imagen.titulo.toLowerCase().includes(lowerQuery) ||
            (imagen.descripcion && imagen.descripcion.toLowerCase().includes(lowerQuery)) ||
            (imagen.tipo_evento && imagen.tipo_evento.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, limit)
        .map((imagen) => ({
          id: imagen.id,
          title: imagen.titulo,
          description: imagen.descripcion || `Imagen de ${imagen.tipo_evento || "galería"}`,
          category: "Galería",
          url: "/dashboard/galeria",
          icon: "bi-images",
          image: imagen.url_imagen,
          entityId: imagen.id,
          entityType: "imagen",
        }))

      searchResults.push(...imagenesResults)

      // Búsqueda en usuarios
      const usuarios = await db.usuariosRepo.getAll()
      const usuariosResults = usuarios
        .filter(
          (usuario) =>
            usuario.nombre.toLowerCase().includes(lowerQuery) ||
            usuario.email.toLowerCase().includes(lowerQuery) ||
            usuario.rol.toLowerCase().includes(lowerQuery),
        )
        .slice(0, limit)
        .map((usuario) => ({
          id: usuario.id,
          title: usuario.nombre,
          description: `${usuario.rol} - ${usuario.email}`,
          category: "Usuarios",
          url: "/dashboard/usuarios",
          icon: "bi-person",
          entityId: usuario.id,
          entityType: "usuario",
        }))

      searchResults.push(...usuariosResults)

      // Búsqueda en cotizaciones
      const cotizaciones = await db.cotizacionesRepo.getAll()
      const cotizacionesResults = cotizaciones
        .filter(
          (cotizacion) =>
            cotizacion.nombre_cliente.toLowerCase().includes(lowerQuery) ||
            cotizacion.email.toLowerCase().includes(lowerQuery) ||
            (cotizacion.tipo_evento && cotizacion.tipo_evento.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, limit)
        .map((cotizacion) => ({
          id: cotizacion.id,
          title: cotizacion.nombre_cliente,
          description: `Cotización para ${cotizacion.tipo_evento || "evento"} - ${new Date(cotizacion.fecha_evento).toLocaleDateString()}`,
          category: "Cotizaciones",
          url: "/dashboard/cotizaciones",
          icon: "bi-receipt",
          entityId: cotizacion.id,
          entityType: "cotizacion",
        }))

      searchResults.push(...cotizacionesResults)

      // Búsqueda en mensajes de contacto
      const mensajes = await db.contactoRepo.getAll()
      const mensajesResults = mensajes
        .filter(
          (mensaje) =>
            mensaje.nombre.toLowerCase().includes(lowerQuery) ||
            mensaje.email.toLowerCase().includes(lowerQuery) ||
            mensaje.mensaje.toLowerCase().includes(lowerQuery),
        )
        .slice(0, limit)
        .map((mensaje) => ({
          id: mensaje.id,
          title: mensaje.nombre,
          description: mensaje.mensaje.substring(0, 50) + (mensaje.mensaje.length > 50 ? "..." : ""),
          category: "Mensajes",
          url: "/dashboard/mensajes",
          icon: "bi-envelope",
          entityId: mensaje.id,
          entityType: "mensaje",
        }))

      searchResults.push(...mensajesResults)

      // Búsqueda en reseñas
      const resenas = await db.resenasRepo.getAllWithDetails()
      const resenasResults = resenas
        .filter(
          (resena) =>
            resena.nombre_cliente.toLowerCase().includes(lowerQuery) ||
            resena.comentario.toLowerCase().includes(lowerQuery) ||
            (resena.tipo_evento && resena.tipo_evento.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, limit)
        .map((resena) => ({
          id: resena.id,
          title: resena.nombre_cliente,
          description: resena.comentario.substring(0, 50) + (resena.comentario.length > 50 ? "..." : ""),
          category: "Reseñas",
          url: "/dashboard/resenas",
          icon: "bi-star",
          entityId: resena.id,
          entityType: "resena",
        }))

      searchResults.push(...resenasResults)

      // Búsqueda en personal/equipo
      const personal = await db.equipoRepo.getAll()
      const personalResults = personal
        .filter(
          (miembro) =>
            miembro.nombre.toLowerCase().includes(lowerQuery) ||
            (miembro.posicion && miembro.posicion.toLowerCase().includes(lowerQuery)) ||
            (miembro.bio && miembro.bio.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, limit)
        .map((miembro) => ({
          id: miembro.id,
          title: miembro.nombre,
          description: miembro.posicion || "Miembro del equipo",
          category: "Personal",
          url: "/dashboard/personal",
          icon: "bi-file-earmark-text",
          image: miembro.imagen,
          entityId: miembro.id,
          entityType: "personal",
        }))

      searchResults.push(...personalResults)

      // Búsqueda en contratos
      const contratos = await db.contratosRepo.getAll()
      const contratosResults = contratos
        .filter(
          (contrato) =>
            contrato.numero_contrato.toLowerCase().includes(lowerQuery) ||
            contrato.nombre_cliente.toLowerCase().includes(lowerQuery) ||
            (contrato.tipo_evento && contrato.tipo_evento.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, limit)
        .map((contrato) => ({
          id: contrato.id,
          title: `Contrato ${contrato.numero_contrato}`,
          description: `${contrato.nombre_cliente} - ${contrato.tipo_evento || "Evento"}`,
          category: "Contratos",
          url: "/dashboard/contratos",
          icon: "bi-file-earmark-text",
          entityId: contrato.id,
          entityType: "contrato",
        }))

      searchResults.push(...contratosResults)

      // Definir secciones del sidebar y sus términos relacionados
      const sidebarSections = [
        {
          name: "Dashboard",
          url: "/dashboard",
          icon: "bi-speedometer2",
          terms: ["inicio", "panel", "principal", "resumen", "dashboard", "home"]
        },
        {
          name: "Servicios",
          url: "/dashboard/servicios",
          icon: "bi-card-checklist",
          terms: ["servicio", "producto", "oferta", "servicios", "carta", "menú"]
        },
        {
          name: "Tipos de Eventos",
          url: "/dashboard/tipos-eventos",
          icon: "bi-calendar-event",
          terms: ["evento", "categoría", "tipo", "celebración", "fiesta", "eventos", "tipos"]
        },
        {
          name: "Galería",
          url: "/dashboard/galeria",
          icon: "bi-images",
          terms: ["imagen", "foto", "fotografía", "album", "galería", "fotos", "imágenes"]
        },
        {
          name: "Cotizaciones",
          url: "/dashboard/cotizaciones",
          icon: "bi-receipt",
          terms: ["cotización", "presupuesto", "costo", "precio", "cotizaciones", "presupuestos"]
        },
        {
          name: "Mensajes",
          url: "/dashboard/mensajes",
          icon: "bi-envelope",
          terms: ["mensaje", "contacto", "comunicación", "correo", "mensajes", "contactos"]
        },
        {
          name: "Reseñas",
          url: "/dashboard/resenas",
          icon: "bi-star",
          terms: ["reseña", "comentario", "opinión", "valoración", "testimonio", "reseñas", "comentarios"]
        },
        {
          name: "Personal",
          url: "/dashboard/personal",
          icon: "bi-file-earmark-text",
          terms: ["empleado", "staff", "equipo", "trabajador", "personal", "empleados"]
        },
        {
          name: "Usuarios",
          url: "/dashboard/usuarios",
          icon: "bi-people",
          terms: ["usuario", "cuenta", "perfil", "admin", "administrador", "usuarios", "administradores"]
        }
      ]

      // Buscar coincidencias en secciones del sidebar
      const matchingSections = sidebarSections.filter(section => {
        // Buscar coincidencias en el nombre de la sección
        if (section.name.toLowerCase().includes(lowerQuery)) {
          return true
        }
        
        // Buscar coincidencias en términos relacionados
        return section.terms.some(term => 
          term.toLowerCase().includes(lowerQuery) || 
          lowerQuery.includes(term.toLowerCase())
        )
      })

      // Añadir secciones coincidentes a los resultados
      if (matchingSections.length > 0) {
        const sectionResults = matchingSections.map(section => ({
          id: section.name,
          title: section.name,
          description: `Ir a la sección ${section.name}`,
          category: "Secciones",
          url: section.url,
          icon: section.icon,
          isSection: true
        }))

        searchResults.push(...sectionResults)
      }

      return searchResults
    } catch (error) {
      console.error("Error en búsqueda:", error)
      return []
    }
  }

  app.use(router)
}