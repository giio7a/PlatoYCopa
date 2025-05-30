/**
 * Validación de formularios del lado del cliente
 * Esta versión preserva el diseño original y mantiene los iconos en su lugar
 */
document.addEventListener("DOMContentLoaded", () => {
  // Patrones de validación
  const patterns = {
    name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,50}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^(\+?52|0)?[ -]?(\d{3}|$$\d{3}$$)[ -]?\d{3}[ -]?\d{4}$/,
    message: /^.{10,500}$/,
    contractNumber: /^[A-Z0-9-]{5,20}$/,
    number: /^[0-9]+$/,
  }

  // Mensajes de error
  const errorMessages = {
    name: "Por favor ingresa un nombre válido",
    email: "Por favor ingresa un correo electrónico válido",
    phone: "Por favor ingresa un número de teléfono válido",
    message: "Por favor ingresa un mensaje (mínimo 10 caracteres)",
    contractNumber: "Por favor ingresa un número de contrato válido",
    select: "Por favor selecciona una opción",
    required: "Este campo es obligatorio",
    number: "Por favor ingresa solo números",
  }

  // Función para validar un campo
  function validateField(field) {
    // Si el campo está vacío y es requerido
    if (field.required && field.value.trim() === "") {
      showError(field, errorMessages.required)
      return false
    }

    // Si el campo es un select y no se ha seleccionado una opción
    if (field.tagName === "SELECT" && field.value === "") {
      showError(field, errorMessages.select)
      return false
    }

    // Si el campo tiene un patrón de validación
    const patternName = field.dataset.validate
    if (patternName && patterns[patternName]) {
      if (!patterns[patternName].test(field.value)) {
        showError(field, errorMessages[patternName])
        return false
      }
    }

    // Si el campo es válido
    removeError(field)
    // Añadir clase is-valid para indicar que el campo es válido
    field.classList.add("is-valid")

    // Buscar el contenedor del campo
    const fieldContainer = field.closest(".form-group")
    
    const tooltip = fieldContainer.querySelector(".form-tooltip, .checkbox-tooltip")

     // Si existe, mostrar

     if(tooltip){
      tooltip.style.right = "45px"

      if (window.innerWidth <= 768) { // Condicional para mobile
        tooltip.style.top = "12px"; // Ajuste para mobile
      } 
     }

    return true
  }

  // Función para mostrar un error sin afectar el diseño
  function showError(field, message) {
    // Remover error existente
    removeError(field)
    // Remover clase is-valid si existe
    field.classList.remove("is-valid")
    // Agregar clase de error
    field.classList.add("is-invalid")

    // Buscar el contenedor del campo
    const fieldContainer = field.closest(".form-group")

    if (fieldContainer) {
      // Agregar clase is-invalid al contenedor para ajustes de estilo
      fieldContainer.classList.add("is-invalid")

      // Crear contenedor para el mensaje de error si no existe
      let errorContainer = fieldContainer.querySelector(".error-message")

      const iconContainer = fieldContainer.querySelector(".form-icon")
      if (!errorContainer) {
        errorContainer = document.createElement("div")
        errorContainer.className = "error-message"
        iconContainer.style.top = "26px"
        // Insertar después del campo pero dentro del form-group
        fieldContainer.appendChild(errorContainer)
      }

      // Establecer el mensaje de error
      errorContainer.textContent = message

      // Manejo especial para el campo de fecha
      if (field.type === "date") {
        // Ajustar posición del tooltip para que no interfiera con el mensaje de error
        const tooltip = fieldContainer.querySelector(".date-tooltip")
        if (tooltip) {
          if (window.innerWidth <= 768) { // Condicional para mobile
            tooltip.style.top = "12px"; // Ajuste para mobile
          } else { // Condicional para desktop
            tooltip.style.top = "26px"; // Mover más a la izquierda para evitar superposición
            tooltip.style.right = "45px"; // Mover más a la izquierda para evitar superposición
          }
          tooltip.style.zIndex = "10"; // Asegurar que esté por encima de otros elementos
        }
      } else {
        // Asegurarse de que el tooltip no se superponga con el mensaje de error
        const tooltip = fieldContainer.querySelector(".form-tooltip, .checkbox-tooltip")
        if (tooltip) {
          if (window.innerWidth <= 768) { // Condicional para mobile
            tooltip.style.top = "12px"; // Ajuste para mobile
          } 
          else{
            tooltip.style.top = "26px"; // Mover más a la izquierda para evitar superposición
          }
            tooltip.style.right = "45px"; // Mover más a la izquierda para evitar superposición
          
          tooltip.style.zIndex = "10"; // Asegurar que esté por encima de otros elementos
        }
      }
    } else {
      // Si no hay un contenedor form-group, añadir el mensaje después del campo
      let errorContainer = field.nextElementSibling

      if (!errorContainer || !errorContainer.classList.contains("error-message")) {
        errorContainer = document.createElement("div")
        errorContainer.className = "error-message"

        // Insertar después del campo
        if (field.nextElementSibling) {
          field.parentNode.insertBefore(errorContainer, field.nextElementSibling)
        } else {
          field.parentNode.appendChild(errorContainer)
        }
      }

      // Establecer el mensaje de error
      errorContainer.textContent = message
    }
  }

  // Función para remover un error
  function removeError(field) {
    field.classList.remove("is-invalid")

    // Buscar el contenedor del campo
    const fieldContainer = field.closest(".form-group")

    if (fieldContainer) {
      // Remover clase is-invalid del contenedor
      fieldContainer.classList.remove("is-invalid")

      // Remover mensaje de error si existe
      const errorContainer = fieldContainer.querySelector(".error-message")
      if (errorContainer) {
        errorContainer.remove()
      }

      // Restaurar la posición del tooltip
      if (field.type === "date") {
        // Posición especial para el tooltip de fecha
        const tooltip = fieldContainer.querySelector(".date-tooltip")
        if (tooltip) {
          tooltip.style.top = "50%"
          tooltip.style.right = "40px" // Restaurar posición original
          tooltip.style.zIndex = "5" // Asegurar que esté por encima de otros elementos
        }
      } else {
        const tooltip = fieldContainer.querySelector(".form-tooltip, .checkbox-tooltip")
        if (tooltip) {
          if (tooltip.classList.contains("checkbox-tooltip")) {
            // Posición especial para tooltips de checkbox
            tooltip.style.top = "50%"
            tooltip.style.right = "0"
          } else {
            // Restaurar posición normal
            tooltip.style.top = "50%"
            tooltip.style.right = "10px"
          }
        }
      }
    } else {
      // Si no hay un contenedor form-group, buscar el mensaje después del campo
      const nextElement = field.nextElementSibling
      if (nextElement && nextElement.classList.contains("error-message")) {
        nextElement.remove()
      }
    }
  }

  // Validar todos los formularios
  const forms = document.querySelectorAll("form")
  forms.forEach((form) => {
    // Validar campos al perder el foco
    const fields = form.querySelectorAll("input, textarea, select")
    fields.forEach((field) => {
      field.addEventListener("blur", function () {
        validateField(this)
      })

      // Validar en tiempo real para campos de texto
      if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
        field.addEventListener("input", function () {
          validateField(this)
        })
      }

      // Para selects, validar al cambiar
      if (field.tagName === "SELECT") {
        field.addEventListener("change", function () {
          validateField(this)
        })
      }
    })

    // Modificar la función para enviar el email en el formulario de contacto
    // Reemplazar la sección del formulario de contacto en el evento submit
    form.addEventListener("submit", (e) => {
      let isValid = true

      // Validar todos los campos
      fields.forEach((field) => {
        if (!validateField(field)) {
          isValid = false
        }
      })

      // Prevenir envío si hay errores
      if (!isValid) {
        e.preventDefault()

        // Mostrar alerta general
        let alertContainer = form.querySelector(".form-alert")

        // Si no existe, crear uno nuevo
        if (!alertContainer) {
          alertContainer = document.createElement("div")
          alertContainer.className = "form-alert alert alert-danger mt-3"
          form.prepend(alertContainer)
        }

        // Establecer el mensaje de error
        alertContainer.textContent = "Por favor corrige los errores en el formulario"

        // Hacer scroll al primer campo con error
        const firstError = form.querySelector(".is-invalid")
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" })
          firstError.focus()
        }
      } else {
        // Si el formulario es válido
        if (form.id === "homeContactForm") {
          // Usar la ruta existente en app.js para enviar el formulario
          // No prevenir el envío normal del formulario para que se procese en el servidor
          // donde se sanitiza la información
          console.log("Enviando formulario de contacto a través de la ruta en app.js")

          // No prevenimos el envío por defecto para que se procese en el servidor
          // e.preventDefault();
        }
      }
    })
  })

  // Validación específica para el formulario de reseñas
  const reviewForm = document.getElementById("reviewForm")
  if (reviewForm) {
    const ratingInputs = reviewForm.querySelectorAll('input[name="calificacion"]')

    reviewForm.addEventListener("submit", (e) => {
      // Verificar si se ha seleccionado una calificación
      let ratingSelected = false
      ratingInputs.forEach((input) => {
        if (input.checked) {
          ratingSelected = true
        }
      })

      if (!ratingSelected) {
        e.preventDefault()

        // Mostrar mensaje de error para las estrellas
        const ratingContainer = reviewForm.querySelector(".rating-container")
        if (ratingContainer) {
          let errorContainer = ratingContainer.querySelector(".error-message")

          if (!errorContainer) {
            errorContainer = document.createElement("div")
            errorContainer.className = "error-message"
            ratingContainer.appendChild(errorContainer)
          }

          errorContainer.textContent = "Por favor selecciona una calificación"
        }
      } else {
        // Si el formulario es válido, enviar a la ruta específica
        // Clonar los datos del formulario
        const formData = new FormData(reviewForm)

        // Enviar a la ruta específica mediante fetch
        fetch("/submit-review", {
          method: "POST",
          body: formData,
        })
          .then((response) => {
            console.log("Reseña enviada correctamente")
          })
          .catch((error) => {
            console.error("Error al enviar reseña:", error)
          })
      }
    })
  }
})

// Añadir esta función al final del documento
document.addEventListener("DOMContentLoaded", () => {
  // Funcionalidad específica para el formulario de reseñas
  const reviewForm = document.getElementById("reviewForm")
  if (reviewForm) {
    const ratingInputs = reviewForm.querySelectorAll('input[name="calificacion"]')

    // Agregar eventos para confirmar visualmente la selección
    ratingInputs.forEach((input) => {
      input.addEventListener("change", function () {
        // Resetear mensajes de error si existen
        const ratingContainer = reviewForm.querySelector(".rating-container")
        if (ratingContainer) {
          const errorMessage = ratingContainer.querySelector(".error-message")
          if (errorMessage) {
            errorMessage.remove()
          }
        }

        // Añadir clase para mostrar visualmente la selección
        ratingInputs.forEach((r) => {
          const label = r.nextElementSibling
          if (label) {
            if (Number.parseInt(r.value) <= Number.parseInt(this.value)) {
              label.classList.add("selected")
            } else {
              label.classList.remove("selected")
            }
          }
        })
      })
    })
  }
})

