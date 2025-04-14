export default function configureResenasRoutes(app, db) {
  // Reviews page with optional type filter
  app.get("/resenas", async (req, res) => {
    try {
      let resenas
      let tipoEventoActual = null

      // Check if a type filter is applied
      if (req.query.tipo) {
        const tipoEventoId = Number.parseInt(req.query.tipo, 10)
        // You'll need to add a method to filter reviews by event type  10)
        // You'll need to add a method to filter reviews by event type
        resenas = await db.resenasRepo.getByTipoEvento(tipoEventoId)
        tipoEventoActual = await db.tiposEventosRepo.getById(tipoEventoId)
      } else {
        resenas = await db.resenasRepo.getAll()
      }

      // Get all event types for the filter options
      const tiposEventos = await db.tiposEventosRepo.getAll()

      // Get popular event types for filter buttons
      const popularEventTypes = await db.tiposEventosRepo.getAllWithCountResenas()

      // Calculate rating statistics
      const ratingStats = await db.resenasRepo.getRatingStats()
      let totalReviews = 0
      let totalRating = 0
      const ratingDistribution = []

      // Process rating statistics
      for (let i = 5; i >= 1; i--) {
        const stat = ratingStats.find((s) => s.calificacion === i) || { count: 0 }
        totalReviews += stat.count
        totalRating += i * stat.count
        ratingDistribution.push({
          stars: i,
          count: stat.count,
          percentage: 0, // Will be calculated after we know the total
        })
      }

      // Calculate percentages and average
      const ratingAverage = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : "0.0"
      ratingDistribution.forEach((item) => {
        item.percentage = totalReviews > 0 ? Math.round((item.count / totalReviews) * 100) : 0
      })

      // Calculate stars for display
      const fullStars = Math.floor(ratingAverage)
      const halfStar = ratingAverage - fullStars >= 0.5
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)

      res.render("reviews", {
        title: tipoEventoActual ? `Reseñas - ${tipoEventoActual.nombre}` : "Reseñas",
        activeReviews: true,
        reviews: resenas,
        tiposEventos,
        tipoEventoActual,
        popularEventTypes,
        ratingAverage,
        ratingDistribution,
        totalReviews,
        fullStars,
        halfStar,
        emptyStars,
        currentCategory: req.query.tipo || null,
      })
    } catch (error) {
      console.error("Error al cargar las reseñas:", error)
      res.status(500).render("error", {
        message: "Error al cargar las reseñas",
        error: process.env.NODE_ENV === "development" ? error : {},
      })
    }
  })

  // Submit a new review
  app.post("/submit-review", async (req, res) => {
    try {
      const { orderNumber, reviewerName, eventType, calificacion, comentario } = req.body

      // Create current date in Spanish format
      const fecha = new Date().toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      // Process images if any
      const imagenes = []
      if (req.files && req.files.imagenes) {
        const imageFiles = Array.isArray(req.files.imagenes) ? req.files.imagenes : [req.files.imagenes]

        // Process and save images
        for (const file of imageFiles) {
          // In a real app, you would save the file and get a URL
          // For this example, we'll just use a placeholder
          const imageUrl = `/uploads/${file.name}` // This would be the actual saved path
          imagenes.push(imageUrl)
        }
      }

      // Submit review to database
      const result = await db.resenasRepo.agregarResena({
        numero_contrato: orderNumber,
        nombre_cliente: reviewerName,
        tipo_evento_id: eventType,
        calificacion: Number.parseInt(calificacion, 10),
        comentario,
        imagenes,
        fecha,
      })

      if (result.success) {
        res.redirect("/resenas?success=true")
      } else {
        res.redirect("/resenas?error=true")
      }
    } catch (error) {
      console.error("Error al enviar reseña:", error)
      res.redirect("/resenas?error=true")
    }
  })

  // API endpoint to like a review
  app.post("/api/reviews/like", async (req, res) => {
    try {
      const { reviewId } = req.body

      if (!reviewId) {
        return res.status(400).json({ success: false, message: "ID de reseña requerido" })
      }

      const result = await db.resenasRepo.incrementLikes(reviewId)

      if (result.success) {
        res.json({ success: true, likes: result.likes })
      } else {
        res.status(404).json({ success: false, message: result.message })
      }
    } catch (error) {
      console.error("Error al dar me gusta:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  })

  // API endpoint to verify contract before editing
  app.post("/api/reviews/verify-contract", async (req, res) => {
    try {
      const { reviewId, contractNumber } = req.body

      if (!reviewId || !contractNumber) {
        return res.status(400).json({ success: false, message: "ID de reseña y número de contrato requeridos" })
      }

      // Get the review
      const review = await db.resenasRepo.getById(reviewId)

      if (!review) {
        return res.status(404).json({ success: false, message: "Reseña no encontrada" })
      }

      // Verify the contract number matches
      if (review.numero_contrato !== contractNumber) {
        return res.status(403).json({ success: false, message: "Número de contrato incorrecto" })
      }

      res.json({ success: true })
    } catch (error) {
      console.error("Error al verificar contrato:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  })

  // API endpoint to get a review by ID
  app.get("/api/reviews/:id", async (req, res) => {
    try {
      const reviewId = req.params.id;
      const review = await db.resenasRepo.getById(reviewId);
  
      console.log("Contenido de review:", review); // Agrega este log
  
      if (!review) {
        return res.status(404).json({ success: false, message: "Reseña no encontrada" });
      }
  
      res.json(review);
    } catch (error) {
      console.error("Error al obtener reseña:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  });
  

  // API endpoint to edit a review
  // Replace the API endpoint to edit a review with this corrected version
app.post("/api/reviews/edit", async (req, res) => {
    try {
      console.log("Received form data:", req.body);
      
      const { reviewId, contractNumber, reviewerName, eventType, editCalificacion, comentario } = req.body;
      
      if (!contractNumber) {
        return res.status(400).json({ 
          success: false, 
          message: "ID de reseña y número de contrato requeridos" 
        });
      }
  
      // Get the review by ID first
      const review = await db.resenasRepo.getById(reviewId);
      
      if (!review) {
        return res.status(404).json({ 
          success: false, 
          message: "Reseña no encontrada" 
        });
      }
  
      // Verify the contract number matches
      if (review.numero_contrato !== contractNumber) {
        return res.status(403).json({ 
          success: false, 
          message: "Número de contrato incorrecto" 
        });
      }
  
      // Process existing images
      let imagenes = [];
      if (review.imagenes) {
        try {
          // Handle both string and array formats
          imagenes = typeof review.imagenes === 'string' 
            ? JSON.parse(review.imagenes) 
            : review.imagenes;
        } catch (error) {
          console.error("Error parsing existing images:", error);
          imagenes = [];
        }
      }
  
      // Process new images if any
      if (req.files && req.files.imagenes) {
        const imageFiles = Array.isArray(req.files.imagenes) 
          ? req.files.imagenes 
          : [req.files.imagenes];
  
        // Process and save new images
        for (const file of imageFiles) {
          // In a real app, you would save the file and get a URL
          const imageUrl = `/uploads/${file.name}`; // This would be the actual saved path
          imagenes.push(imageUrl);
        }
      }
  
      // Update the review
      const result = await db.resenasRepo.update(reviewId, {
        nombre_cliente: reviewerName,
        tipo_evento_id: eventType,
        calificacion: Number.parseInt(editCalificacion, 10),
        comentario,
        imagenes,
        // Keep the original date and contract number
        fecha: review.fecha,
        numero_contrato: review.numero_contrato,
        verificado: review.verificado,
      });
  
      if (result) {
        // Get the updated event type name for the response
        const tipoEvento = await db.tiposEventosRepo.getById(eventType);
        
        res.json({
          success: true,
          id: reviewId,
          nombre_cliente: reviewerName,
          tipo_evento_id: eventType,
          tipo_evento: tipoEvento ? tipoEvento.nombre : '',
          eventIcon: tipoEvento ? tipoEvento.icono : 'bi-calendar-event',
          calificacion: Number.parseInt(editCalificacion, 10),
          comentario,
          imagenes,
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Error al actualizar la reseña" 
        });
      }
    } catch (error) {
      console.error("Error al editar reseña:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error interno del servidor" 
      });
    }
  });
}

