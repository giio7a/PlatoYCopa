/**
 * Plato y Copa - Gestor de Configuraciones
 *
 * Este archivo maneja todas las configuraciones de usuario para la aplicación
 * y se encarga de aplicarlas de manera consistente en todas las páginas.
 */

// Namespace para evitar conflictos
window.PlatoYCopa = window.PlatoYCopa || {}
;(() => {
  // Configuraciones predeterminadas
  const defaultSettings = {
    lightMode: false,
    fontSize: "medium",
    compactView: false,
    autoRefresh: false,
    refreshInterval: 60,
    replyTemplate: "",
    notificationsEnabled: true,
    emailNotifications: false,
  }

  // Variables para el sistema de actualización automática
  let autoRefreshInterval = null
  let lastRefreshTime = Date.now()

  // Función para obtener configuraciones de las cookies
  function getSettingsFromCookies() {
    const settings = {}

    // Función para obtener el valor de una cookie
    function getCookie(name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(";").shift()
      return null
    }

    // Obtener cada configuración de las cookies
    settings.lightMode = getCookie("lightMode") === "true"
    settings.fontSize = getCookie("fontSize") || defaultSettings.fontSize
    settings.compactView = getCookie("compactView") === "true"
    settings.autoRefresh = getCookie("autoRefresh") === "true"
    settings.refreshInterval = Number.parseInt(getCookie("refreshInterval")) || defaultSettings.refreshInterval

    // Decodificar la plantilla de respuesta para manejar caracteres especiales
    const replyTemplateCookie = getCookie("replyTemplate")
    settings.replyTemplate = replyTemplateCookie
      ? decodeURIComponent(replyTemplateCookie)
      : defaultSettings.replyTemplate

    settings.notificationsEnabled = getCookie("notificationsEnabled") !== "false" // Por defecto true
    settings.emailNotifications = getCookie("emailNotifications") === "true"

    return settings
  }

  // Función para guardar configuraciones en cookies
  function saveSettingsToCookies(settings) {
    const expirationDate = new Date()
    expirationDate.setFullYear(expirationDate.getFullYear() + 1) // 1 año

    // Guardar cada configuración en cookies
    document.cookie = `lightMode=${settings.lightMode}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = `fontSize=${settings.fontSize}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = `compactView=${settings.compactView}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = `autoRefresh=${settings.autoRefresh}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = `refreshInterval=${settings.refreshInterval}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = `replyTemplate=${encodeURIComponent(settings.replyTemplate)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = `notificationsEnabled=${settings.notificationsEnabled}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = `emailNotifications=${settings.emailNotifications}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`
  }

  // Función para eliminar una cookie
  function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
  }

  // Función para aplicar el modo claro/oscuro
  function applyTheme(isLightMode) {
    if (isLightMode) {
      document.documentElement.classList.add("light-mode")
    } else {
      document.documentElement.classList.remove("light-mode")
    }

    // Actualizar el favicon según el tema
    const favicon = document.querySelector('link[rel="icon"]')
    if (favicon) {
      favicon.href = isLightMode ? "/img/favicon-light.ico" : "/img/favicon.ico"
    }

    // Disparar un evento para que otros componentes puedan reaccionar al cambio de tema
    document.dispatchEvent(new CustomEvent("themeChanged", { detail: { isLightMode } }))
  }

  // Función para aplicar el tamaño de fuente
  function applyFontSize(size) {
    // Eliminar clases existentes de tamaño de fuente
    document.documentElement.classList.remove("font-small", "font-medium", "font-large")

    // Añadir la clase correspondiente
    document.documentElement.classList.add(`font-${size}`)

    // Establecer variable CSS personalizada para uso en estilos
    document.documentElement.style.setProperty(
      "--font-size-factor",
      size === "small" ? "0.85" : size === "large" ? "1.2" : "1",
    )
  }

  // Función para aplicar la vista compacta
  function applyCompactView(isCompact) {
    if (isCompact) {
      document.documentElement.classList.add("compact-view")
    } else {
      document.documentElement.classList.remove("compact-view")
    }
  }

  // Función para configurar la actualización automática
  function setupAutoRefresh(isEnabled, interval) {
    // Limpiar intervalo existente
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
      autoRefreshInterval = null
    }

    // Si está habilitado, configurar nuevo intervalo
    if (isEnabled && interval > 0) {
      autoRefreshInterval = setInterval(() => {
        // Registrar tiempo de actualización
        lastRefreshTime = Date.now()

        // Actualizar contenido según la página actual
        refreshCurrentPageContent()
      }, interval * 1000)
    }
  }

  // Función para actualizar el contenido de la página actual
  function refreshCurrentPageContent() {
    const currentPath = window.location.pathname

    // Actualizar diferentes secciones según la página actual
    if (currentPath.includes("/dashboard/mensajes")) {
      refreshMessages()
    } else if (currentPath.includes("/dashboard/cotizaciones")) {
      refreshQuotes()
    } else if (currentPath.includes("/dashboard")) {
      refreshDashboardStats()
    }
  }

  // Función para actualizar mensajes
  function refreshMessages() {
    // Mostrar indicador de carga si existe
    const loadingIndicator = document.querySelector(".messages-loading")
    if (loadingIndicator) {
      loadingIndicator.style.display = "flex"
    }

    // Realizar solicitud AJAX para obtener mensajes actualizados
    fetch("/api/mensajes/recientes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Actualizar la lista de mensajes si existe
          const messagesContainer = document.querySelector(".messages-list")
          if (messagesContainer && data.mensajes) {
            updateMessagesUI(messagesContainer, data.mensajes)
          }

          // Mostrar notificación si hay mensajes nuevos y las notificaciones están habilitadas
          if (data.nuevos && data.nuevos > 0 && window.PlatoYCopa.settings.notificationsEnabled) {
            showNotification("Nuevos mensajes", `Tienes ${data.nuevos} mensaje(s) nuevo(s)`)
          }
        }
      })
      .catch((error) => {
        console.error("Error al actualizar mensajes:", error)
      })
      .finally(() => {
        // Ocultar indicador de carga
        if (loadingIndicator) {
          loadingIndicator.style.display = "none"
        }
      })
  }

  // Función para actualizar cotizaciones
  function refreshQuotes() {
    // Implementación similar a refreshMessages para cotizaciones
    fetch("/api/cotizaciones/recientes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.cotizaciones) {
          // Actualizar la UI con las cotizaciones nuevas
          const quotesContainer = document.querySelector(".quotes-list")
          if (quotesContainer) {
            updateQuotesUI(quotesContainer, data.cotizaciones)
          }

          // Mostrar notificación si hay cotizaciones nuevas
          if (data.nuevas && data.nuevas > 0 && window.PlatoYCopa.settings.notificationsEnabled) {
            showNotification("Nuevas cotizaciones", `Tienes ${data.nuevas} cotización(es) nueva(s)`)
          }
        }
      })
      .catch((error) => {
        console.error("Error al actualizar cotizaciones:", error)
      })
  }

  // Función para actualizar estadísticas del dashboard
  function refreshDashboardStats() {
    fetch("/api/dashboard/stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.stats) {
          // Actualizar cada contador de estadísticas
          updateDashboardUI(data.stats)
        }
      })
      .catch((error) => {
        console.error("Error al actualizar estadísticas del dashboard:", error)
      })
  }

  // Función para actualizar la UI de mensajes
  function updateMessagesUI(container, mensajes) {
    // Esta función actualizaría la lista de mensajes en la UI
    // Implementación depende de la estructura HTML específica

    // Ejemplo básico:
    if (container && mensajes && mensajes.length > 0) {
      // Verificar si hay cambios antes de actualizar la UI
      const currentIds = Array.from(container.querySelectorAll("[data-message-id]")).map((el) =>
        el.getAttribute("data-message-id"),
      )

      const newIds = mensajes.map((m) => m.id.toString())

      // Si hay nuevos mensajes, actualizar la UI
      if (!arraysEqual(currentIds, newIds)) {
        // Aquí iría la lógica para actualizar la UI con los nuevos mensajes
        console.log("Actualizando lista de mensajes con nuevos datos")

        // Ejemplo de actualización (ajustar según la estructura real)
        if (typeof window.actualizarListaMensajes === "function") {
          window.actualizarListaMensajes(mensajes)
        } else {
          // Actualización básica si no existe función específica
          container.innerHTML = ""
          mensajes.forEach((mensaje) => {
            const messageElement = document.createElement("div")
            messageElement.className = "message-item"
            messageElement.setAttribute("data-message-id", mensaje.id)

            // Construir contenido del mensaje según la estructura de datos
            messageElement.innerHTML = `
              <div class="message-header">
                <h3>${mensaje.nombre || "Sin nombre"}</h3>
                <span class="message-date">${mensaje.fecha || "Sin fecha"}</span>
              </div>
              <div class="message-content">
                <p>${mensaje.mensaje || "Sin contenido"}</p>
              </div>
              <div class="message-footer">
                <span class="message-email">${mensaje.email || "Sin email"}</span>
                <div class="message-actions">
                  <button class="btn-action" onclick="marcarLeido(${mensaje.id})">
                    <i class="bi bi-check-circle"></i>
                  </button>
                  <button class="btn-action" onclick="responderMensaje(${mensaje.id})">
                    <i class="bi bi-reply"></i>
                  </button>
                </div>
              </div>
            `

            container.appendChild(messageElement)
          })
        }
      }
    }
  }

  // Función para actualizar la UI de cotizaciones
  function updateQuotesUI(container, cotizaciones) {
    // Implementación similar a updateMessagesUI para cotizaciones
    if (container && cotizaciones && cotizaciones.length > 0) {
      const currentIds = Array.from(container.querySelectorAll("[data-quote-id]")).map((el) =>
        el.getAttribute("data-quote-id"),
      )

      const newIds = cotizaciones.map((c) => c.id.toString())

      if (!arraysEqual(currentIds, newIds)) {
        console.log("Actualizando lista de cotizaciones con nuevos datos")

        // Ejemplo de actualización (ajustar según la estructura real)
        if (typeof window.actualizarListaCotizaciones === "function") {
          window.actualizarListaCotizaciones(cotizaciones)
        } else {
          // Actualización básica si no existe función específica
          container.innerHTML = ""
          cotizaciones.forEach((cotizacion) => {
            const quoteElement = document.createElement("div")
            quoteElement.className = "quote-item"
            quoteElement.setAttribute("data-quote-id", cotizacion.id)

            // Construir contenido de la cotización según la estructura de datos
            quoteElement.innerHTML = `
              <div class="quote-header">
                <h3>${cotizacion.fullName || "Sin nombre"}</h3>
                <span class="quote-date">${cotizacion.createdAt || "Sin fecha"}</span>
              </div>
              <div class="quote-content">
                <p><strong>Evento:</strong> ${cotizacion.eventType || "No especificado"}</p>
                <p><strong>Fecha:</strong> ${cotizacion.eventDate || "No especificada"}</p>
                <p><strong>Total:</strong> ${cotizacion.totalCost || "0.00"}</p>
              </div>
              <div class="quote-footer">
                <span class="quote-status ${cotizacion.status || "pendiente"}">${cotizacion.status || "Pendiente"}</span>
                <div class="quote-actions">
                  <button class="btn-action" onclick="verDetalleCotizacion(${cotizacion.id})">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn-action" onclick="cambiarEstadoCotizacion(${cotizacion.id})">
                    <i class="bi bi-pencil"></i>
                  </button>
                </div>
              </div>
            `

            container.appendChild(quoteElement)
          })
        }
      }
    }
  }

  // Función para actualizar la UI del dashboard
  function updateDashboardUI(stats) {
    // Actualizar cada contador de estadísticas en el dashboard
    for (const [key, value] of Object.entries(stats)) {
      const counterElement = document.querySelector(`[data-stat="${key}"]`)
      if (counterElement) {
        counterElement.textContent = value
      }
    }
  }

  // Función para mostrar notificaciones del navegador
  function showNotification(title, body) {
    // Verificar si las notificaciones están habilitadas y permitidas
    if (window.PlatoYCopa.settings.notificationsEnabled && Notification && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: body,
        icon: "/img/logo.png",
      })

      notification.onclick = function () {
        window.focus()
        this.close()
      }
    }
  }

  // Función para solicitar permisos de notificación
  function requestNotificationPermission() {
    if (!("Notification" in window)) {
      console.log("Este navegador no soporta notificaciones de escritorio")
      return false
    }

    if (Notification.permission === "granted") {
      return true
    }

    if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Permisos de notificación concedidos")
          return true
        }
      })
    }

    return false
  }

  // Función para aplicar todas las configuraciones
  function applyAllSettings(settings) {
    // Aplicar cada configuración
    applyTheme(settings.lightMode)
    applyFontSize(settings.fontSize)
    applyCompactView(settings.compactView)
    setupAutoRefresh(settings.autoRefresh, settings.refreshInterval)

    // Si las notificaciones están habilitadas, solicitar permisos
    if (settings.notificationsEnabled) {
      requestNotificationPermission()
    }

    // Guardar configuraciones en el objeto global
    window.PlatoYCopa.settings = settings

    // Guardar configuraciones en cookies para persistencia
    saveSettingsToCookies(settings)

    // Notificar a otros componentes que las configuraciones han cambiado
    const event = new CustomEvent("settingsChanged", { detail: settings })
    document.dispatchEvent(event)
  }

  // Función para comparar arrays (utilidad)
  function arraysEqual(a, b) {
    if (a === b) return true
    if (a == null || b == null) return false
    if (a.length !== b.length) return false

    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  // Función para alternar entre modo claro y oscuro
  function toggleLightMode() {
    const currentSettings = window.PlatoYCopa.settings || getSettingsFromCookies()
    currentSettings.lightMode = !currentSettings.lightMode
    applyAllSettings(currentSettings)
    return currentSettings.lightMode
  }

  // Inicializar el sistema de configuraciones
  function initSettingsManager() {
    // Obtener configuraciones de las cookies
    const settings = getSettingsFromCookies()

    // Aplicar todas las configuraciones
    applyAllSettings(settings)

    // Exponer funciones públicas
    window.PlatoYCopa.applySettings = applyAllSettings
    window.PlatoYCopa.refreshContent = refreshCurrentPageContent
    window.PlatoYCopa.showNotification = showNotification
    window.PlatoYCopa.getSettings = getSettingsFromCookies
    window.PlatoYCopa.saveSettings = saveSettingsToCookies
    window.PlatoYCopa.toggleLightMode = toggleLightMode
    window.PlatoYCopa.deleteCookie = deleteCookie

    console.log("Sistema de configuraciones inicializado")
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsManager)
  } else {
    initSettingsManager()
  }
})()
