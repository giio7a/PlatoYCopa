/**
 * Plato y Copa - Inicializador de Configuraciones
 *
 * Este archivo se encarga de inicializar el sistema de configuraciones
 * y aplicar las configuraciones guardadas al cargar la página.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Verificar si el sistema de configuraciones ya está inicializado
    if (!window.PlatoYCopa || !window.PlatoYCopa.settings) {
      console.warn("El sistema de configuraciones no está inicializado correctamente")
      return
    }
  
    // Configurar actualización automática para páginas específicas
    setupPageSpecificFeatures()
  
    // Configurar notificaciones si están habilitadas
    if (window.PlatoYCopa.settings.notificationsEnabled) {
      setupNotifications()
    }
  
    // Configurar plantilla de respuesta si está en la página de mensajes
    if (window.location.pathname.includes("/dashboard/mensajes")) {
      setupReplyTemplate()
    }
  
    // Añadir botón de cambio rápido de tema en todas las páginas
    setupQuickThemeToggle()
  
    console.log("Configuraciones de la aplicación inicializadas")
  })
  
  // Configurar características específicas según la página actual
  function setupPageSpecificFeatures() {
    const currentPath = window.location.pathname
  
    // Configurar actualización automática para mensajes
    if (currentPath.includes("/dashboard/mensajes") && window.PlatoYCopa.settings.autoRefresh) {
      setupMessagesAutoRefresh()
    }
  
    // Configurar actualización automática para cotizaciones
    if (currentPath.includes("/dashboard/cotizaciones") && window.PlatoYCopa.settings.autoRefresh) {
      setupQuotesAutoRefresh()
    }
  
    // Configurar actualización automática para el dashboard principal
    if (currentPath === "/dashboard" && window.PlatoYCopa.settings.autoRefresh) {
      setupDashboardAutoRefresh()
    }
  }
  
  // Configurar actualización automática para mensajes
  function setupMessagesAutoRefresh() {
    // Añadir indicador de actualización automática
    const messagesContainer = document.querySelector(".messages-container")
    if (messagesContainer) {
      const refreshIndicator = document.createElement("div")
      refreshIndicator.className = "auto-refresh-indicator"
      refreshIndicator.innerHTML = `
        <span>Actualización automática activada</span>
        <span class="refresh-timer">${window.PlatoYCopa.settings.refreshInterval}s</span>
      `
      messagesContainer.prepend(refreshIndicator)
  
      // Actualizar el contador de tiempo
      let timeLeft = window.PlatoYCopa.settings.refreshInterval
      const timerElement = refreshIndicator.querySelector(".refresh-timer")
  
      setInterval(() => {
        timeLeft -= 1
        if (timeLeft <= 0) {
          timeLeft = window.PlatoYCopa.settings.refreshInterval
        }
        timerElement.textContent = `${timeLeft}s`
      }, 1000)
    }
  }
  
  // Configurar actualización automática para cotizaciones
  function setupQuotesAutoRefresh() {
    // Similar a setupMessagesAutoRefresh pero para cotizaciones
    const quotesContainer = document.querySelector(".quotes-container")
    if (quotesContainer) {
      const refreshIndicator = document.createElement("div")
      refreshIndicator.className = "auto-refresh-indicator"
      refreshIndicator.innerHTML = `
        <span>Actualización automática activada</span>
        <span class="refresh-timer">${window.PlatoYCopa.settings.refreshInterval}s</span>
      `
      quotesContainer.prepend(refreshIndicator)
  
      // Actualizar el contador de tiempo
      let timeLeft = window.PlatoYCopa.settings.refreshInterval
      const timerElement = refreshIndicator.querySelector(".refresh-timer")
  
      setInterval(() => {
        timeLeft -= 1
        if (timeLeft <= 0) {
          timeLeft = window.PlatoYCopa.settings.refreshInterval
        }
        timerElement.textContent = `${timeLeft}s`
      }, 1000)
    }
  }
  
  // Configurar actualización automática para el dashboard
  function setupDashboardAutoRefresh() {
    // Similar a setupMessagesAutoRefresh pero para el dashboard
    const dashboardContainer = document.querySelector(".dashboard-container")
    if (dashboardContainer) {
      const refreshIndicator = document.createElement("div")
      refreshIndicator.className = "auto-refresh-indicator"
      refreshIndicator.innerHTML = `
        <span>Actualización automática activada</span>
        <span class="refresh-timer">${window.PlatoYCopa.settings.refreshInterval}s</span>
      `
  
      // Insertar después del header
      const header = dashboardContainer.querySelector(".main-header")
      if (header) {
        header.insertAdjacentElement("afterend", refreshIndicator)
      } else {
        dashboardContainer.prepend(refreshIndicator)
      }
  
      // Actualizar el contador de tiempo
      let timeLeft = window.PlatoYCopa.settings.refreshInterval
      const timerElement = refreshIndicator.querySelector(".refresh-timer")
  
      setInterval(() => {
        timeLeft -= 1
        if (timeLeft <= 0) {
          timeLeft = window.PlatoYCopa.settings.refreshInterval
          // Actualizar contenido cuando el contador llegue a cero
          if (window.PlatoYCopa && typeof window.PlatoYCopa.refreshContent === "function") {
            window.PlatoYCopa.refreshContent()
          }
        }
        timerElement.textContent = `${timeLeft}s`
      }, 1000)
    }
  }
  
  // Configurar notificaciones
  function setupNotifications() {
    // Solicitar permisos de notificación si no se han concedido
    if (Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission()
    }
  }
  
  // Configurar plantilla de respuesta
  function setupReplyTemplate() {
    // Buscar todos los formularios de respuesta
    const replyForms = document.querySelectorAll(".message-reply-form")
  
    if (replyForms.length > 0 && window.PlatoYCopa.settings.replyTemplate) {
      replyForms.forEach((form) => {
        const textarea = form.querySelector("textarea")
        if (textarea) {
          // Añadir botón para insertar plantilla
          const templateButton = document.createElement("button")
          templateButton.type = "button"
          templateButton.className = "btn-template"
          templateButton.innerHTML = '<i class="bi bi-file-text"></i> Usar plantilla'
          templateButton.title = "Insertar plantilla de respuesta"
  
          // Insertar botón antes del textarea
          textarea.parentNode.insertBefore(templateButton, textarea)
  
          // Añadir evento para insertar la plantilla
          templateButton.addEventListener("click", () => {
            textarea.value = window.PlatoYCopa.settings.replyTemplate
            textarea.focus()
          })
        }
      })
    }
  }
  function setupQuickThemeToggle() {
    const quickThemeToggles = document.querySelectorAll(".quick-theme-toggle");
  
    // Detectar tipo de página
    const isMain      = document.body.classList.contains("main-page");
    const isDashboard = document.body.classList.contains("dashboard-page");
    const isAuth      = document.body.classList.contains("auth-page");
    const isLogout    = document.body.classList.contains("logout-page");
  
    // ¿Qué storage key usamos?
    const themeKey = isMain ? "theme_main" : "theme_dashboard";
  
    function getStoredTheme() {
      return localStorage.getItem(themeKey) === "light";
    }
  
    function applyTheme(isLight) {
      document.documentElement.classList.toggle("light-mode", isLight);
      document.documentElement.classList.toggle("dark-mode", !isLight);
    }
  
    function updateIcons(isLight) {
      quickThemeToggles.forEach(btn => {
        btn.innerHTML = isLight
          ? '<i class="bi bi-moon-stars"></i>'
          : '<i class="bi bi-brightness-high"></i>';
        const title = isLight
          ? "Cambiar a modo oscuro"
          : "Cambiar a modo claro";
        btn.title = title;
        btn.setAttribute("aria-label", title);
      });
    }
  
    // Siempre aplicar tema al cargar (haya o no botones)
    const currentIsLight = getStoredTheme();
    applyTheme(currentIsLight);
  
    // Solo actualizar iconos y agregar click si HAY botón (main y dashboard)
    if (quickThemeToggles.length) {
      updateIcons(currentIsLight);
  
      quickThemeToggles.forEach(btn => {
        btn.addEventListener("click", () => {
          const wasLight = getStoredTheme();
          const nowLight = !wasLight;
          localStorage.setItem(themeKey, nowLight ? "light" : "dark");
          applyTheme(nowLight);
          updateIcons(nowLight);
  
          // Toast solo si existe
          if (typeof showToast === "function") {
            showToast({
              type: "info",
              title: "Tema cambiado",
              message: nowLight
                ? "Modo claro activado. ¡Disfruta de una experiencia más luminosa!"
                : "Modo oscuro activado. ¡Descansa tus ojos!",
              duration: 3000,
            });
          }
  
          // Disparar evento
          document.dispatchEvent(new CustomEvent("settingsChanged", {
            detail: { lightMode: nowLight }
          }));
        });
      });
    }
  }
  
  
  
  



  
  // Estilos para los elementos añadidos dinámicamente
  const dynamicStyles = document.createElement("style")
  dynamicStyles.textContent = `
    .auto-refresh-indicator {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 8px 15px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      background-color: var(--bg-tertiary);
      border-radius: var(--border-radius-md);
      margin: 10px 20px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
    }
    
    .auto-refresh-indicator .refresh-timer {
      margin-left: 8px;
      font-weight: 600;
      color: var(--text-accent);
      background-color: rgba(229, 199, 107, 0.1);
      padding: 2px 8px;
      border-radius: 20px;
    }
    
    .btn-template {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      background-color: var(--button-secondary-bg);
      color: var(--button-secondary-text);
      border: 1px solid var(--button-secondary-border);
      border-radius: var(--border-radius-md);
      font-size: 0.85rem;
      cursor: pointer;
      margin-bottom: 8px;
      transition: all var(--transition-fast);
    }
    
    .btn-template:hover {
      background-color: rgba(201, 169, 77, 0.15);
      color: var(--text-accent);
      border-color: var(--gold-border);
    }
    
    .btn-template i {
      color: var(--text-accent);
    }
    
    .light-mode .auto-refresh-indicator {
      background-color: rgba(201, 169, 77, 0.1);
      border-color: rgba(201, 169, 77, 0.2);
    }
    
    .light-mode .btn-template {
      background-color: rgba(255, 255, 255, 0.9);
      border-color: rgba(201, 169, 77, 0.3);
    }
    
    .light-mode .btn-template:hover {
      background-color: rgba(201, 169, 77, 0.1);
    }
  `
  
  document.head.appendChild(dynamicStyles)
  