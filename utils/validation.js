/**
 * Utilidades para sanitización y validación de datos
 */

// Función para sanitizar entradas de texto (previene XSS)
export function sanitizeInput(input) {
  if (input === undefined || input === null) return ""
  if (typeof input !== "string") return String(input)

  // Escapar caracteres especiales HTML
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\\/g, "&#92;")
    .replace(/\//g, "&#47;")
}

// Función para sanitizar un objeto completo
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return {}

  const sanitized = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitized[key] = sanitizeObject(obj[key])
      } else {
        sanitized[key] = sanitizeInput(obj[key])
      }
    }
  }
  return sanitized
}

// Validar email con regex más robusta
export function isValidEmail(email) {
  if (!email) return false
  // RFC 5322 compliant email regex
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return emailRegex.test(String(email).toLowerCase())
}

// Validar teléfono (formato mexicano)
export function isValidPhone(phone) {
  if (!phone) return false
  // Acepta formatos: +52 (555) 123-4567, 5551234567, etc.
  const phoneRegex = /^(\+?52|0)?[ -]?(\d{3}|$$\d{3}$$)[ -]?\d{3}[ -]?\d{4}$/
  return phoneRegex.test(String(phone))
}

// Validar nombre (letras, espacios y acentos)
export function isValidName(name) {
  if (!name) return false
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,50}$/
  return nameRegex.test(String(name))
}

// Validar mensaje (longitud mínima y máxima)
export function isValidMessage(message, minLength = 10, maxLength = 500) {
  if (!message) return false
  const text = String(message).trim()
  return text.length >= minLength && text.length <= maxLength
}

// Validar número de contrato
export function isValidContractNumber(contractNumber) {
  if (!contractNumber) return false
  const contractRegex = /^[A-Z0-9-]{5,20}$/
  return contractRegex.test(String(contractNumber))
}

// Validar que sea un número
export function isValidNumber(value) {
  if (value === undefined || value === null || value === "") return false
  return !isNaN(Number(value))
}

// Validar que sea un entero positivo
export function isPositiveInteger(value) {
  const num = Number(value)
  return !isNaN(num) && Number.isInteger(num) && num > 0
}

// Validar que un campo no esté vacío
export function isNotEmpty(value) {
  if (value === undefined || value === null) return false
  return String(value).trim() !== ""
}

// Validar longitud mínima
export function hasMinLength(value, minLength) {
  if (value === undefined || value === null) return false
  return String(value).length >= minLength
}

// Validar longitud máxima
export function hasMaxLength(value, maxLength) {
  if (value === undefined || value === null) return true
  return String(value).length <= maxLength
}

// Validar fecha (formato YYYY-MM-DD)
export function isValidDate(date) {
  if (!date) return false
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) return false

  const d = new Date(date)
  return d instanceof Date && !isNaN(d) && d.toISOString().slice(0, 10) === date
}

// Validar fecha futura
export function isFutureDate(date) {
  if (!isValidDate(date)) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(date) >= today
}

// Prevenir SQL Injection
export function preventSQLInjection(input) {
  if (input === undefined || input === null) return ""
  if (typeof input !== "string") return String(input)

  // Eliminar caracteres que podrían ser usados para SQL Injection
  return input
    .replace(/'/g, "''")
    .replace(/--/g, "")
    .replace(/;/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/xp_/gi, "")
    .replace(/exec/gi, "")
    .replace(/union/gi, "")
    .replace(/select/gi, "")
    .replace(/drop/gi, "")
    .replace(/insert/gi, "")
    .replace(/delete/gi, "")
    .replace(/update/gi, "")
    .replace(/create/gi, "")
    .replace(/alter/gi, "")
    .replace(/into/gi, "")
    .replace(/where/gi, "")
}

// Sanitizar completamente una entrada (XSS + SQL Injection)
export function sanitizeCompletely(input) {
  return preventSQLInjection(sanitizeInput(input))
}

