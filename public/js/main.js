// Cambiar estilo del navbar al hacer scroll
window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar")
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled")
    } else {
      navbar.classList.remove("scrolled")
    }
  })
  
  // Calculadora de cotización
  document.addEventListener("DOMContentLoaded", () => {
    const calculateBtn = document.getElementById("calculateQuotation")
    if (calculateBtn) {
      calculateBtn.addEventListener("click", calculateQuote)
    }
  
    // Inicializar tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))
  
    // Auto-cerrar alertas después de 5 segundos
    setTimeout(() => {
      const alerts = document.querySelectorAll(".alert")
      alerts.forEach((alert) => {
        const bsAlert = new bootstrap.Alert(alert)
        bsAlert.close()
      })
    }, 5000)
    
    // Configurar botones de reserva para WhatsApp
    const botonesReserva = document.querySelectorAll('.btn-reservar');
    botonesReserva.forEach(boton => {
      boton.addEventListener('click', function() {
        const servicio = this.getAttribute('data-servicio');
        const precio = this.getAttribute('data-precio');
        reservarWhatsApp(servicio, precio);
      });
    });
  })
  
  function calculateQuote() {
    // Obtener valores del formulario
    const numWaiters = Number.parseInt(document.getElementById("numWaiters").value) || 0
    const serviceDuration = document.getElementById("serviceDuration").value
    const serviceLocation = document.getElementById("serviceLocation").value
    const lavalozas = document.getElementById("lavalozas").checked
    const cuidaCoches = document.getElementById("cuidaCoches").checked
    const montajeDesmontaje = document.getElementById("montajeDesmontaje").checked
  
    // Validar campos requeridos
    if (!numWaiters || !serviceDuration || !serviceLocation) {
      alert("Por favor completa los campos de número de meseros, duración y ubicación del servicio.")
      return
    }
  
    // Calcular costo base
    let baseServiceCost = 0
    if (serviceDuration === "6") {
      baseServiceCost = numWaiters * 350
    } else if (serviceDuration === "8") {
      baseServiceCost = numWaiters * 450
    }
  
    // Calcular servicios adicionales
    let additionalServicesCost = 0
    if (lavalozas) additionalServicesCost += 300
    if (cuidaCoches) additionalServicesCost += 400
    if (montajeDesmontaje) additionalServicesCost += numWaiters * 80
  
    // Calcular cargo por ubicación
    let locationCharge = 0
    const totalBeforeLocation = baseServiceCost + additionalServicesCost
    if (serviceLocation === "foraneo") {
      locationCharge = totalBeforeLocation * 0.2
    }
  
    // Calcular total
    const total = totalBeforeLocation + locationCharge
  
    // Mostrar resultados
    const baseServiceCostElement = document.getElementById("baseServiceCost")
    const additionalServicesCostElement = document.getElementById("additionalServicesCost")
    const locationChargeElement = document.getElementById("locationCharge")
    const totalPriceElement = document.getElementById("totalPrice")
  
    if (baseServiceCostElement) baseServiceCostElement.textContent = "$" + baseServiceCost.toFixed(2)
    if (additionalServicesCostElement) additionalServicesCostElement.textContent = "$" + additionalServicesCost.toFixed(2)
    if (locationChargeElement) locationChargeElement.textContent = "$" + locationCharge.toFixed(2)
    if (totalPriceElement) totalPriceElement.textContent = "$" + total.toFixed(2)
  }
  
  // Función para el botón de reserva que redirige a WhatsApp
  function reservarWhatsApp(servicio, precio) {
    const telefono = "+525551234567"; // Número de WhatsApp de la empresa
    const mensaje = encodeURIComponent(
      `Hola, estoy interesado en contratar el servicio de ${servicio} con un costo aproximado de $${precio}. ¿Podemos coordinar los detalles?`
    );
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  }

  