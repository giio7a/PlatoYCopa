/**
 * Calculadora de cotizaciones para Plato y Copa
 * Este script maneja el cálculo automático de precios, guardado de cotizaciones y la generación de enlaces a WhatsApp
 */
document.addEventListener("DOMContentLoaded", () => {
  // Referencias a elementos del DOM
  const saveQuotationBtn = document.getElementById("saveQuotation")
  const reserveButtonContainer = document.getElementById("reserveButtonContainer")
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

  // Referencias a elementos de resultado
  const baseServiceCostElement = document.getElementById("baseServiceCost")
  const additionalServicesCostElement = document.getElementById("additionalServicesCost")
  const locationChargeElement = document.getElementById("locationCharge")
  const totalPriceElement = document.getElementById("totalPrice")
  const reserveButton = document.getElementById("reserveButton")
  const quotationForm = document.getElementById("quotationForm")

  // Precios base
  const PRECIO_6_HORAS = 350
  const PRECIO_8_HORAS = 450
  const PRECIO_LAVALOZAS = 300
  const PRECIO_CUIDACOCHES = 400
  const PRECIO_MONTAJE_DESMONTAJE = 80 // por mesero

  // Variable para almacenar la cotización actual
  let currentQuotation = null

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

  // Asignar evento al botón de guardar cotización
  if (saveQuotationBtn) {
    saveQuotationBtn.addEventListener("click", async (e) => {
      e.preventDefault()

      // Validar el formulario
      if (!validateQuotationForm()) {
        return
      }

      // Calcular la cotización si no se ha hecho
      if (!currentQuotation) {
        currentQuotation = calculateQuotation()
        if (!currentQuotation) {
          alert("Por favor completa todos los campos necesarios para calcular la cotización.")
          return
        }
      }

      // Mostrar indicador de carga
      saveQuotationBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...'
      saveQuotationBtn.disabled = true

      try {
        // Enviar el formulario
        const formData = new FormData(quotationForm)
        const response = await fetch("/quote-form", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          // Mostrar mensaje de éxito
          saveQuotationBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>¡Guardado!'
          saveQuotationBtn.classList.remove("btn-gold")
          saveQuotationBtn.classList.add("btn-success")

          // Mostrar el botón de reserva
          if (reserveButtonContainer) {
            reserveButtonContainer.style.display = "block"
            reserveButtonContainer.classList.add("show")
          }

          // Actualizar el enlace del botón de reserva con el mensaje mejorado
          if (reserveButton) {
            // No need to set href attribute, we'll handle it in the click event
            reserveButton.addEventListener("click", (e) => {
              e.preventDefault()

              // Validate form first
              if (!validateQuotationForm()) {
                return
              }

              // Calculate the current quotation to ensure it's up-to-date
              const currentQuote = calculateQuotation()
              if (!currentQuote) {
                alert("Por favor completa todos los campos necesarios para calcular la cotización.")
                return
              }

              // Generate the message with current data
              const whatsappMessage = generateWhatsAppMessage(currentQuote)

              // Open WhatsApp in a new window with the message
              window.open(`https://wa.me/5212223780903?text=${whatsappMessage}`, "_blank")
            })
          }

          // Desplazarse hasta el botón de reserva
          setTimeout(() => {
            if (reserveButtonContainer) {
              reserveButtonContainer.scrollIntoView({ behavior: "smooth" })
            }
          }, 500)
        } else {
          // Mostrar mensaje de error
          alert("Hubo un error al guardar la cotización. Por favor, intenta nuevamente.")
          saveQuotationBtn.innerHTML = '<i class="bi bi-save me-2"></i>Guardar cotización'
          saveQuotationBtn.disabled = false
        }
      } catch (error) {
        console.error("Error al guardar la cotización:", error)
        alert("Hubo un error al guardar la cotización. Por favor, intenta nuevamente.")
        saveQuotationBtn.innerHTML = '<i class="bi bi-save me-2"></i>Guardar cotización'
        saveQuotationBtn.disabled = false
      }
    })
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
})

