/**
 * Calculadora de cotizaciones para Plato y Copa
 * Este script maneja el cálculo automático de precios, guardado de cotizaciones,
 * la generación de enlaces a WhatsApp y la descarga de PDF con el contrato premium
 */
document.addEventListener("DOMContentLoaded", () => {
  // Referencias a elementos del DOM
  const reserveButton = document.getElementById("reserveButton")
  const numWaitersInput = document.getElementById("numWaiters")
  const serviceDurationSelect = document.getElementById("serviceDuration")
  const serviceLocationSelect = document.getElementById("serviceLocation")
  const lavalozasCheckbox = document.getElementById("lavalozas")
  const cuidaCochesCheckbox = document.getElementById("cuidaCoches")
  const montajeDesmontajeCheckbox = document.getElementById("montajeDesmontaje")
  const fullNameInput = document.getElementById("fullName")
  const emailInput = document.getElementById("email")
  const phoneInput = document.getElementById("phone")
  const eventDateInput = document.getElementById("eventDate")
  const eventTypeSelect = document.getElementById("eventType")
  const saveQuotationBtn = document.getElementById("saveQuotation")
  const reserveButtonContainer = document.getElementById("reserveButtonContainer")
  const downloadPdfButton = document.getElementById("downloadPdf") // Nuevo botón para descargar PDF

  // Referencias a elementos de resultado
  const baseServiceCostElement = document.getElementById("baseServiceCost")
  const additionalServicesCostElement = document.getElementById("additionalServicesCost")
  const locationChargeElement = document.getElementById("locationCharge")
  const totalPriceElement = document.getElementById("totalPrice")
  const quotationForm = document.getElementById("quotationForm")

  // Precios base
  const PRECIO_6_HORAS = 350
  const PRECIO_8_HORAS = 450
  const PRECIO_LAVALOZAS = 300
  const PRECIO_CUIDACOCHES = 400
  const PRECIO_MONTAJE_DESMONTAJE = 80 // por mesero

  // Variable para almacenar la cotización actual
  let currentQuotation = null

  // Cargar la librería jsPDF
  const loadJsPDF = () => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        resolve(window.jspdf)
        return
      }

      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      script.onload = () => resolve(window.jspdf)
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // Cargar la librería html2canvas
  const loadHtml2Canvas = () => {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) {
        resolve(window.html2canvas)
        return
      }

      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
      script.onload = () => resolve(window.html2canvas)
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // Función para calcular la cotización
  function calculateQuotation() {
    // Verificar si los campos necesarios están completos
    if (
      !numWaitersInput ||
      !numWaitersInput.value ||
      !serviceDurationSelect ||
      !serviceDurationSelect.value ||
      !serviceLocationSelect ||
      !serviceLocationSelect.value
    ) {
      return false
    }

    // Obtener valores
    const numWaiters = Number.parseInt(numWaitersInput.value)
    const duration = Number.parseInt(serviceDurationSelect.value)
    const location = serviceLocationSelect.value

    // Calcular costo base del servicio
    let baseServiceCost = 0
    if (duration === 6) {
      baseServiceCost = numWaiters * PRECIO_6_HORAS
    } else if (duration === 8) {
      baseServiceCost = numWaiters * PRECIO_8_HORAS
    }

    // Calcular costo de servicios adicionales
    let additionalServicesCost = 0
    if (lavalozasCheckbox && lavalozasCheckbox.checked) {
      additionalServicesCost += PRECIO_LAVALOZAS
    }
    if (cuidaCochesCheckbox && cuidaCochesCheckbox.checked) {
      additionalServicesCost += PRECIO_CUIDACOCHES
    }
    if (montajeDesmontajeCheckbox && montajeDesmontajeCheckbox.checked) {
      additionalServicesCost += numWaiters * PRECIO_MONTAJE_DESMONTAJE
    }

    // Calcular cargo por ubicación
    let locationCharge = 0
    const totalBeforeLocation = baseServiceCost + additionalServicesCost
    if (location === "foraneo") {
      // Para servicios foráneos, se aplica un incremento aproximado del 20%
      locationCharge = totalBeforeLocation * 0.2
    }

    // Calcular total
    const total = totalBeforeLocation + locationCharge

    // Actualizar elementos en la interfaz
    if (baseServiceCostElement) baseServiceCostElement.textContent = "$" + baseServiceCost.toFixed(2)
    if (additionalServicesCostElement)
      additionalServicesCostElement.textContent = "$" + additionalServicesCost.toFixed(2)
    if (locationChargeElement) locationChargeElement.textContent = "$" + locationCharge.toFixed(2)
    if (totalPriceElement) totalPriceElement.textContent = "$" + total.toFixed(2)

    // Guardar la cotización actual
    currentQuotation = {
      numWaiters,
      duration,
      location,
      baseServiceCost,
      additionalServicesCost,
      locationCharge,
      total,
      lavalozas: lavalozasCheckbox && lavalozasCheckbox.checked,
      cuidaCoches: cuidaCochesCheckbox && cuidaCochesCheckbox.checked,
      montajeDesmontaje: montajeDesmontajeCheckbox && montajeDesmontajeCheckbox.checked,
    }

    return currentQuotation
  }

  // Función para validar el formulario de cotización
  function validateQuotationForm() {
    // Validar campos personales
    if (!fullNameInput.value) {
      alert("Por favor ingresa tu nombre completo")
      fullNameInput.focus()
      return false
    }

    if (!emailInput.value) {
      alert("Por favor ingresa tu correo electrónico")
      emailInput.focus()
      return false
    }

    if (!phoneInput.value) {
      alert("Por favor ingresa tu número de teléfono")
      phoneInput.focus()
      return false
    }

    if (!eventDateInput.value) {
      alert("Por favor selecciona la fecha del evento")
      eventDateInput.focus()
      return false
    }

    if (!eventTypeSelect.value) {
      alert("Por favor selecciona el tipo de evento")
      eventTypeSelect.focus()
      return false
    }

    // Validar campos de servicio
    if (!numWaitersInput.value) {
      alert("Por favor ingresa el número de meseros")
      numWaitersInput.focus()
      return false
    }

    if (!serviceDurationSelect.value) {
      alert("Por favor selecciona la duración del servicio")
      serviceDurationSelect.focus()
      return false
    }

    if (!serviceLocationSelect.value) {
      alert("Por favor selecciona la ubicación del servicio")
      serviceLocationSelect.focus()
      return false
    }

    return true
  }

  // Función mejorada para generar el mensaje de WhatsApp con todos los datos del formulario
  function generateWhatsAppMessage(quotation) {
    // Obtener todos los datos del formulario
    const fullName = fullNameInput ? fullNameInput.value : ""
    const email = emailInput ? emailInput.value : ""
    const phone = phoneInput ? phoneInput.value : ""
    const eventDate = eventDateInput ? eventDateInput.value : ""

    // Obtener el texto del tipo de evento seleccionado
    let eventType = ""
    if (eventTypeSelect && eventTypeSelect.selectedIndex >= 0) {
      eventType = eventTypeSelect.options[eventTypeSelect.selectedIndex].text
    }

    // Obtener la duración del servicio seleccionada
    let durationText = ""
    if (serviceDurationSelect && serviceDurationSelect.selectedIndex >= 0) {
      durationText = serviceDurationSelect.options[serviceDurationSelect.selectedIndex].text
    }

    // Obtener la ubicación del servicio seleccionada
    let locationText = ""
    if (serviceLocationSelect && serviceLocationSelect.value) {
      locationText = serviceLocationSelect.value === "local" ? "Local" : "Foráneo"
    }

    // Crear lista de servicios adicionales
    const additionalServices = []
    if (lavalozasCheckbox && lavalozasCheckbox.checked) additionalServices.push("Lavalozas ($300)")
    if (cuidaCochesCheckbox && cuidaCochesCheckbox.checked) additionalServices.push("Cuidacoches ($400)")
    if (montajeDesmontajeCheckbox && montajeDesmontajeCheckbox.checked) {
      const montajeCost = numWaitersInput ? Number(numWaitersInput.value) * PRECIO_MONTAJE_DESMONTAJE : 0
      additionalServices.push(`Montaje y desmontaje ($${montajeCost})`)
    }

    // Formatear la fecha en un formato más legible
    let formattedDate = eventDate
    try {
      const dateObj = new Date(eventDate)
      formattedDate = dateObj.toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (e) {
      console.error("Error al formatear la fecha:", e)
    }

    // Construir el mensaje completo con todos los datos
    const message = `
*¡Hola! Me interesa contratar su servicio de meseros*

*INFORMACIÓN PERSONAL:*
• Nombre: ${fullName}
• Email: ${email}
• Teléfono: ${phone}
• Fecha del evento: ${formattedDate}
• Tipo de evento: ${eventType}

*DETALLES DEL SERVICIO:*
• Número de meseros: ${quotation.numWaiters}
• Duración: ${durationText || quotation.duration + " horas"}
• Ubicación: ${locationText}
${additionalServices.length > 0 ? "\n*SERVICIOS ADICIONALES:*\n• " + additionalServices.join("\n• ") : ""}

*COTIZACIÓN:*
• Servicio base: $${quotation.baseServiceCost.toFixed(2)}
• Servicios adicionales: $${quotation.additionalServicesCost.toFixed(2)}
• Cargo por ubicación: $${quotation.locationCharge.toFixed(2)}
• *TOTAL ESTIMADO: $${quotation.total.toFixed(2)}*

Me gustaría confirmar esta reserva. ¿Podría proporcionarme más información sobre disponibilidad para esta fecha?
`

    return encodeURIComponent(message)
  }

  // Función para generar el PDF del contrato con los datos de la cotización en formato premium
  async function generatePremiumContractPDF(quotation) {
    try {
      // Cargar las librerías necesarias
      const jspdfModule = await loadJsPDF()
      const { jsPDF } = jspdfModule

      // Crear un nuevo documento PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Obtener datos del formulario
      const fullName = fullNameInput ? fullNameInput.value : ""
      const email = emailInput ? emailInput.value : ""
      const phone = phoneInput ? phoneInput.value : ""
      const eventDate = eventDateInput ? eventDateInput.value : ""

      // Formatear la fecha en un formato más legible
      let formattedDate = eventDate
      try {
        const dateObj = new Date(eventDate)
        formattedDate = dateObj.toLocaleDateString("es-MX", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      } catch (e) {
        console.error("Error al formatear la fecha:", e)
      }

      // Obtener el texto del tipo de evento seleccionado
      let eventType = ""
      if (eventTypeSelect && eventTypeSelect.selectedIndex >= 0) {
        eventType = eventTypeSelect.options[eventTypeSelect.selectedIndex].text
      }

      // Obtener la duración del servicio seleccionada
      let durationText = ""
      if (serviceDurationSelect && serviceDurationSelect.selectedIndex >= 0) {
        durationText = serviceDurationSelect.options[serviceDurationSelect.selectedIndex].text
      }

      // Obtener la ubicación del servicio seleccionada
      let locationText = ""
      if (serviceLocationSelect && serviceLocationSelect.value) {
        locationText = serviceLocationSelect.value === "local" ? "Local" : "Foráneo"
      }

      // Extraer fecha actual para el contrato
      const today = new Date()
      const day = today.getDate()
      const monthNames = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ]
      const month = monthNames[today.getMonth()]
      const year = today.getFullYear()

      // Configurar colores
      const primaryColor = [139 / 255, 69 / 255, 19 / 255] // Café
      const goldColor = [212 / 255, 175 / 255, 55 / 255] // Dorado

      // Función para agregar encabezado a cada página
      const addHeader = (pageNum, totalPages) => {
        // Título
        doc.setFontSize(16)
        doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
        doc.setFont("helvetica", "bold")
        doc.text("PLATO Y COPA", 105, 15, { align: "center" })

        // Línea decorativa
        doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
        doc.setLineWidth(0.5)
        doc.line(20, 18, 190, 18)

        // Número de página
        doc.setFontSize(8)
        doc.text(`Página ${pageNum} de ${totalPages}`, 190, 10, { align: "right" })
      }

      // Función para agregar pie de página
      const addFooter = () => {
        // Línea decorativa
        doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
        doc.setLineWidth(0.5)
        doc.line(20, 280, 190, 280)

        // Información de contacto
        doc.setFontSize(8)
        doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
        doc.text("Plato y Copa - Servicio de Meseros Profesionales", 105, 285, { align: "center" })
        doc.text("Tel: 222 378 0903 | Email: info@platoycopa.com", 105, 290, { align: "center" })
      }

      // Agregar encabezado a la primera página
      addHeader(1, 1) // Temporalmente 1 de 1
      addFooter()

      // Título del documento
      doc.setFontSize(22)
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.setFont("helvetica", "bold")
      doc.text("CONTRATO DE SERVICIO", 105, 35, { align: "center" })

      // Línea decorativa
      doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
      doc.setLineWidth(1)
      doc.line(50, 38, 160, 38)

      // Número de contrato (dejado en blanco para llenar a mano)
      doc.setFontSize(11)
      doc.text("Contrato No. _______________", 170, 45, { align: "right" })

      // Fecha y datos iniciales
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)

      // Marco para la introducción
      doc.setDrawColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.setLineWidth(0.3)
      doc.rect(20, 50, 170, 35)

      doc.text(`En la ciudad de Puebla el día _____ del mes _________ del año ______, comparecen por una`, 25, 55)
      doc.text(`parte ${fullName} a quien en lo sucesivo se le denominará "El anfitrión", y por la otra`, 25, 60)
      doc.text(`parte la empresa Plato Y Copa, representada por _____________________, a quien en lo`, 25, 65)
      doc.text(`sucesivo se le denominará "Prestador del servicio", quienes celebran el presente contrato`, 25, 70)
      doc.text(`de prestación de servicios bajo los siguientes términos y condiciones:`, 25, 75)

      // Título de cláusulas
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.text("CLÁUSULAS", 105, 90, { align: "center" })

      // Línea decorativa
      doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
      doc.setLineWidth(0.5)
      doc.line(70, 92, 140, 92)

      // Cláusula I
      doc.setFontSize(12)
      doc.text("I. Objeto del servicio:", 25, 100)

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")
      doc.text("El presente contrato tiene por objeto la prestación de servicios de meseros por parte", 25, 105)
      doc.text("de Plato Y Copa, quien se compromete a brindar atención y servicio en el evento", 25, 110)
      doc.text("contratado por el anfitrión. Las funciones del personal incluirán lo siguiente:", 25, 115)

      // Puntos con viñetas simples
      doc.text("• Servicio de alimentos y bebidas: Servir y entregar alimentos en el evento que sean", 30, 122)
      doc.text("  solicitados por el anfitrión.", 30, 127)
      doc.text("• Atención a los invitados: Garantizar que los invitados sean atendidos de manera", 30, 134)
      doc.text("  cordial y eficiente.", 30, 139)
      doc.text("• Mantenimiento de las áreas de trabajo: Realización de tareas como limpieza y", 30, 146)
      doc.text("  orden dentro del área correspondiente durante el evento.", 30, 151)
      doc.text("• En caso de que el anfitrión requiera horas extra, se cobrará un extra de $100 MXN", 30, 158)
      doc.text("  por mesero solicitado.", 30, 163)

      // Cláusula II - Servicios extra
      doc.setFontSize(12)
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.setFont("helvetica", "bold")
      doc.text("II. Servicios extra:", 25, 173)

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")
      doc.text("A continuación, se presentan las opciones disponibles para el servicio. El anfitrión ha", 25, 178)
      doc.text("seleccionado las siguientes opciones adicionales:", 25, 183)

      // Marcar los servicios seleccionados con checkboxes simples
      let yPos = 190

      // Lavalozas
      doc.rect(25, yPos - 3, 4, 4)
      if (lavalozasCheckbox && lavalozasCheckbox.checked) {
        doc.text("✓", 26, yPos)
      }
      doc.text("Lavaloza $300 MXN.", 32, yPos)
      yPos += 8

      // Cuidacoches
      doc.rect(25, yPos - 3, 4, 4)
      if (cuidaCochesCheckbox && cuidaCochesCheckbox.checked) {
        doc.text("✓", 26, yPos)
      }
      doc.text("Cuidacoches $500 MXN.", 32, yPos)
      yPos += 8

      // Montaje/desmontaje
      doc.rect(25, yPos - 3, 4, 4)
      if (montajeDesmontajeCheckbox && montajeDesmontajeCheckbox.checked) {
        doc.text("✓", 26, yPos)
      }
      doc.text("Montar y/o desmontar mesas $80 MXN. Si este servicio se requiere fuera del", 32, yPos)
      yPos += 5
      doc.text("horario establecido en el contrato, se aplicará un cargo adicional de $100 MXN", 32, yPos)
      yPos += 5
      doc.text("por mesero por cada hora extra.", 32, yPos)
      yPos += 10

      // Agregar nueva página para continuar
      doc.addPage()
      addHeader(2, 2) // Temporalmente 2 de 2
      addFooter()

      yPos = 30

      // Resumen de la cotización
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.text("RESUMEN DE COTIZACIÓN", 105, yPos, { align: "center" })

      // Línea decorativa
      doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
      doc.setLineWidth(0.5)
      doc.line(60, yPos + 2, 150, yPos + 2)

      // Tabla de resumen
      yPos += 10
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")

      // Marco para la tabla
      doc.setDrawColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.setLineWidth(0.3)
      doc.rect(20, yPos, 170, 60)

      // Encabezado de tabla
      doc.setFillColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.rect(20, yPos, 170, 8, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.text("CONCEPTO", 25, yPos + 5.5)
      doc.text("MONTO", 160, yPos + 5.5, { align: "right" })

      // Filas de la tabla
      yPos += 12
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")

      // Servicio base
      doc.text(`Servicio base (${quotation.numWaiters} meseros por ${quotation.duration} horas)`, 25, yPos)
      doc.text(`$${quotation.baseServiceCost.toFixed(2)}`, 160, yPos, { align: "right" })

      // Línea separadora
      yPos += 8
      doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
      doc.setLineWidth(0.2)
      doc.line(25, yPos - 2, 165, yPos - 2)

      // Servicios adicionales
      if (quotation.additionalServicesCost > 0) {
        doc.setFont("helvetica", "bold")
        doc.text("Servicios adicionales:", 25, yPos)
        doc.text(`$${quotation.additionalServicesCost.toFixed(2)}`, 160, yPos, { align: "right" })
        doc.setFont("helvetica", "normal")

        // Detallar servicios adicionales
        if (lavalozasCheckbox && lavalozasCheckbox.checked) {
          yPos += 6
          doc.text("- Lavalozas", 30, yPos)
          doc.text("$300.00", 160, yPos, { align: "right" })
        }

        if (cuidaCochesCheckbox && cuidaCochesCheckbox.checked) {
          yPos += 6
          doc.text("- Cuidacoches", 30, yPos)
          doc.text("$400.00", 160, yPos, { align: "right" })
        }

        if (montajeDesmontajeCheckbox && montajeDesmontajeCheckbox.checked) {
          const montajeCost = numWaitersInput ? Number(numWaitersInput.value) * PRECIO_MONTAJE_DESMONTAJE : 0
          yPos += 6
          doc.text(`- Montaje y desmontaje (${quotation.numWaiters} meseros)`, 30, yPos)
          doc.text(`$${montajeCost.toFixed(2)}`, 160, yPos, { align: "right" })
        }

        // Línea separadora
        yPos += 8
        doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
        doc.setLineWidth(0.2)
        doc.line(25, yPos - 2, 165, yPos - 2)
      } else {
        yPos += 6
      }

      // Cargo por ubicación
      if (quotation.locationCharge > 0) {
        doc.text("Cargo por ubicación (foráneo)", 25, yPos)
        doc.text(`$${quotation.locationCharge.toFixed(2)}`, 160, yPos, { align: "right" })

        // Línea separadora
        yPos += 8
        doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
        doc.setLineWidth(0.2)
        doc.line(25, yPos - 2, 165, yPos - 2)
      } else {
        yPos += 6
      }

      // Total
      doc.setFillColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.rect(20, yPos - 2, 170, 8, "F")
      doc.setFont("helvetica", "bold")
      doc.setTextColor(255, 255, 255)
      doc.text("TOTAL", 25, yPos + 3)
      doc.text(`$${quotation.total.toFixed(2)}`, 160, yPos + 3, { align: "right" })

      // Anticipo y resto por pagar
      yPos += 15
      doc.setTextColor(0, 0, 0)
      const anticipo = quotation.total * 0.25
      doc.text("ANTICIPO (25%)", 25, yPos)
      doc.text(`$${anticipo.toFixed(2)}`, 160, yPos, { align: "right" })

      yPos += 8
      const restoPorPagar = quotation.total - anticipo
      doc.text("RESTO POR PAGAR", 25, yPos)
      doc.text(`$${restoPorPagar.toFixed(2)}`, 160, yPos, { align: "right" })

      // Información del evento
      yPos += 15
      doc.setFontSize(14)
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.setFont("helvetica", "bold")
      doc.text("INFORMACIÓN DEL EVENTO", 105, yPos, { align: "center" })

      // Línea decorativa
      doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
      doc.setLineWidth(0.5)
      doc.line(60, yPos + 2, 150, yPos + 2)

      // Marco para la información
      yPos += 10
      doc.setDrawColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.setLineWidth(0.3)
      doc.rect(20, yPos, 170, 50)

      // Contenido de la información
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")

      // Primera columna
      doc.setFont("helvetica", "bold")
      doc.text("Cliente:", 25, yPos + 10)
      doc.text("Teléfono:", 25, yPos + 20)
      doc.text("Email:", 25, yPos + 30)
      doc.text("Fecha del evento:", 25, yPos + 40)

      // Segunda columna
      doc.setFont("helvetica", "normal")
      doc.text(fullName, 70, yPos + 10)
      doc.text(phone, 70, yPos + 20)
      doc.text(email, 70, yPos + 30)
      doc.text(formattedDate, 70, yPos + 40)

      // Tercera columna
      doc.setFont("helvetica", "bold")
      doc.text("Tipo de evento:", 110, yPos + 10)
      doc.text("Ubicación:", 110, yPos + 20)
      doc.text("Duración:", 110, yPos + 30)
      doc.text("Número de meseros:", 110, yPos + 40)

      // Cuarta columna
      doc.setFont("helvetica", "normal")
      doc.text(eventType, 155, yPos + 10)
      doc.text(locationText, 155, yPos + 20)
      doc.text(durationText || `${quotation.duration} horas`, 155, yPos + 30)
      doc.text(quotation.numWaiters.toString(), 155, yPos + 40)

      // Agregar nueva página para las cláusulas restantes
      doc.addPage()
      const totalPages = doc.getNumberOfPages()

      // Actualizar los números de página en todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addHeader(i, totalPages)
      }

      // Continuar con la última página
      addFooter()

      yPos = 30

      // Cláusulas adicionales
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.text("CLÁUSULAS ADICIONALES", 105, yPos, { align: "center" })

      // Línea decorativa
      doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
      doc.setLineWidth(0.5)
      doc.line(60, yPos + 2, 150, yPos + 2)

      // Función para agregar cláusulas
      const addClause = (number, title, points) => {
        yPos += 15
        doc.setFontSize(12)
        doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
        doc.setFont("helvetica", "bold")
        doc.text(`${number}. ${title}`, 25, yPos)

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")

        yPos += 8

        for (let i = 0; i < points.length; i++) {
          // Verificar si necesitamos una nueva página
          if (yPos > 265) {
            doc.addPage()
            const currentPage = doc.getNumberOfPages()
            addHeader(currentPage, totalPages)
            addFooter()
            yPos = 30
          }

          doc.text(`• ${points[i]}`, 30, yPos)
          yPos += 8
        }
      }

      // Cláusula III
      addClause("III", "Obligaciones de Plato Y Copa", [
        "Proporcionar el número de meseros acordados en este contrato.",
        "Presentarse puntualmente al lugar del evento con la vestimenta adecuada, y el personal en condiciones óptimas para trabajar.",
        "Cumplir con las funciones establecidas en la primer cláusula sin realizar actividades extra no acordadas con anterioridad.",
        "Mantener una actitud respetuosa y cordial con el anfitrión, los invitados y el personal del evento.",
        "No abandonar el evento antes del tiempo estipulado en el contrato, salvo que el anfitrión así lo indique o causas de fuerza mayor.",
      ])

      // Cláusula IV
      addClause("IV", "Obligaciones del anfitrión", [
        "Es responsabilidad del anfitrión asumir la seguridad y protección del personal de Plato y Copa durante el evento.",
        "El anfitrión tiene la facultad de intervenir de manera inmediata en caso de que algún invitado muestre comportamientos agresivos.",
        "Respetar las condiciones pactadas en este contrato, así como cumplir debidamente con el monto establecido en el mismo.",
        "El anfitrión deberá dar un trato digno al personal solicitado para tener un ambiente respetuoso.",
      ])

      // Cláusula V
      addClause("V", "Condiciones", [
        "El monto total restante deberá ser pagado en su totalidad antes de iniciar evento.",
        "El anfitrión deberá abonar un 25% del monto total como pago inicial para que el contrato siga teniendo validez.",
        "Si el anfitrión solicita cambios en los servicios con menos de 48 horas de anticipación, Plato Y Copa podrá aceptar o rechazar la solicitud.",
        "En caso de reducción del personal contratado, el anfitrión deberá pagar al menos el 80% del monto acordado por los servicios originalmente pactados.",
      ])

      // Agregar página para firmas
      doc.addPage()
      const finalPageCount = doc.getNumberOfPages()

      // Actualizar los números de página
      for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i)
        addHeader(i, finalPageCount)
      }

      // Continuar con la última página
      addFooter()

      // Espacio para firmas
      yPos = 100
      doc.setFontSize(14)
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.setFont("helvetica", "bold")
      doc.text("FIRMAS DE CONFORMIDAD", 105, yPos, { align: "center" })

      // Línea decorativa
      doc.setDrawColor(goldColor[0] * 255, goldColor[1] * 255, goldColor[2] * 255)
      doc.setLineWidth(0.5)
      doc.line(60, yPos + 2, 150, yPos + 2)

      yPos += 40

      // Líneas para firmas
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(40, yPos, 80, yPos)
      doc.line(120, yPos, 160, yPos)

      // Texto de firmas
      doc.setFont("helvetica", "bold")
      doc.setTextColor(primaryColor[0] * 255, primaryColor[1] * 255, primaryColor[2] * 255)
      doc.text("Anfitrión", 60, yPos + 10, { align: "center" })
      doc.text("Representante de Plato Y Copa", 140, yPos + 10, { align: "center" })

      // Nombres bajo las firmas
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      doc.text(fullName, 60, yPos + 20, { align: "center" })
      doc.text("____________________", 140, yPos + 20, { align: "center" })

      // Texto legal al pie
      yPos += 50
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8)
      doc.text("Este documento constituye un contrato legal vinculante entre las partes firmantes.", 105, yPos, {
        align: "center",
      })
      doc.text("Conserve una copia para su registro.", 105, yPos + 5, { align: "center" })

      // Guardar el PDF con un nombre que incluya el nombre del cliente y la fecha
      const clientNameFormatted = fullName.replace(/\s+/g, "_").toLowerCase()
      const dateFormatted = new Date().toISOString().split("T")[0]
      const fileName = `contrato_platoycopa_${clientNameFormatted}_${dateFormatted}.pdf`

      // Descargar el PDF
      doc.save(fileName)

      return fileName
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      alert("Hubo un error al generar el PDF. Por favor, intenta nuevamente.")
      return null
    }
  }

  // Asignar evento al botón de reserva
  if (reserveButton) {
    reserveButton.addEventListener("click", async (e) => {
      e.preventDefault();
  
      // 1. Validar formulario
      if (!validateQuotationForm()) {
        return;
      }
  
      // 2. Calcular la cotización actual
      const currentQuote = calculateQuotation();
      if (!currentQuote) {
        alert("Por favor completa todos los campos necesarios para calcular la cotización.");
        return;
      }
  
      // 3. Enviar la cotización al servidor
      try {
        const response = await fetch("/quote-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullNameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            eventDate: eventDateInput.value,
            eventType: eventTypeSelect.value,
            numWaiters: currentQuote.numWaiters,
            duration: currentQuote.duration,
            location: currentQuote.location,
            lavalozas: currentQuote.lavalozas,
            cuidaCoches: currentQuote.cuidaCoches,
            montajeDesmontaje: currentQuote.montajeDesmontaje,
            baseServiceCost: currentQuote.baseServiceCost,
            additionalServicesCost: currentQuote.additionalServicesCost,
            locationCharge: currentQuote.locationCharge,
            totalPrice: currentQuote.total
          })
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error al enviar cotización:", errorText);
          alert("Hubo un error al guardar la cotización. Por favor, intenta nuevamente.");
          return;
        }
  
        // 4. Mostrar alerta de éxito en el envío
        const saveAlert = document.createElement("div");
        saveAlert.className = "alert alert-success alert-dismissible fade show position-fixed bottom-0 end-0 m-3";
        saveAlert.innerHTML = `
          ¡Cotización guardada con éxito! Puedes continuar con la reserva.
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(saveAlert);
        setTimeout(() => {
          saveAlert.classList.remove("show");
          setTimeout(() => saveAlert.remove(), 500);
        }, 5000);
  
        // 5. Generar y abrir WhatsApp con el mensaje
        const whatsappMessage = generateWhatsAppMessage(currentQuote);
        window.open(`https://wa.me/5212223780903?text=${whatsappMessage}`, "_blank");
  
        // 6. Generar y descargar el PDF automáticamente
        const fileName = await generatePremiumContractPDF(currentQuote);
        if (fileName) {
          console.log(`PDF generado y descargado: ${fileName}`);
          const pdfAlert = document.createElement("div");
          pdfAlert.className = "alert alert-success alert-dismissible fade show position-fixed bottom-0 end-0 m-3";
          pdfAlert.innerHTML = `
            ¡Contrato generado con éxito! El PDF ha sido descargado automáticamente.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          `;
          document.body.appendChild(pdfAlert);
          setTimeout(() => {
            pdfAlert.classList.remove("show");
            setTimeout(() => pdfAlert.remove(), 500);
          }, 5000);
        }
  
      } catch (error) {
        console.error("Error en el proceso de reserva:", error);
        alert("Ocurrió un error. Por favor, intenta de nuevo más tarde.");
      }
    });
  }
  

  // Agregar botón para descargar PDF manualmente si no existe
  if (!downloadPdfButton && reserveButtonContainer) {
    const downloadBtn = document.createElement("button")
    downloadBtn.id = "downloadPdf"
    downloadBtn.className = "btn btn-secondary ms-2"
    downloadBtn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Descargar Contrato PDF'
    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault()

      // Validar formulario primero
      if (!validateQuotationForm()) {
        return
      }

      // Calcular la cotización actual
      const currentQuote = calculateQuotation()
      if (!currentQuote) {
        alert("Por favor completa todos los campos necesarios para calcular la cotización.")
        return
      }

      // Generar y descargar el PDF
      generatePremiumContractPDF(currentQuote)
    })

    // Agregar el botón junto al botón de reserva
    reserveButtonContainer.appendChild(downloadBtn)
  }

  // Actualizar automáticamente al cambiar cualquier campo
  const allInputs = [
    numWaitersInput,
    serviceDurationSelect,
    serviceLocationSelect,
    lavalozasCheckbox,
    cuidaCochesCheckbox,
    montajeDesmontajeCheckbox,
  ]

  allInputs.forEach((input) => {
    if (input) {
      input.addEventListener("change", () => {
        calculateQuotation()
      })
    }
  })

  // Calcular cotización inicial si todos los campos necesarios tienen valores
  if (
    numWaitersInput &&
    numWaitersInput.value &&
    serviceDurationSelect &&
    serviceDurationSelect.value &&
    serviceLocationSelect &&
    serviceLocationSelect.value
  ) {
    calculateQuotation()
  }

  // Enviar el formulario a la ruta correcta en app.js
  if (quotationForm) {
    quotationForm.addEventListener("submit", (e) => {
      e.preventDefault() // Prevenir el envío normal para manejar con JavaScript

      // Validar el formulario
      if (!validateQuotationForm()) {
        return
      }

      // Calcular la cotización final
      const finalQuotation = calculateQuotation()
      if (!finalQuotation) {
        alert("Por favor completa todos los campos necesarios para calcular la cotización.")
        return
      }

      // Crear FormData para enviar al servidor
      const formData = new FormData(quotationForm)

      // Agregar datos de la cotización calculada
      formData.append("baseServiceCost", finalQuotation.baseServiceCost)
      formData.append("additionalServicesCost", finalQuotation.additionalServicesCost)
      formData.append("locationCharge", finalQuotation.locationCharge)
      formData.append("totalPrice", finalQuotation.total)

      // Enviar a la ruta específica mediante fetch
      fetch("/quote-form", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (response.ok) {
            console.log("Cotización enviada correctamente")
            // Mostrar mensaje de éxito
            const successAlert = document.createElement("div")
            successAlert.className = "alert alert-success alert-dismissible fade show position-fixed bottom-0 end-0 m-3"
            successAlert.innerHTML = `
            ¡Cotización guardada con éxito! Puedes reservar ahora.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          `
            document.body.appendChild(successAlert)
          } else {
            console.error("Error al enviar cotización")
            alert("Hubo un error al guardar la cotización. Por favor, intenta nuevamente.")
          }
        })
        .catch((error) => {
          console.error("Error al enviar cotización:", error)
          alert("Hubo un error al guardar la cotización. Por favor, intenta nuevamente.")
        })
    })
  }
})

