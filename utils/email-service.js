import nodemailer from "nodemailer"
import db from "../database/postgress-db.js" // Se importa la BD para obtener el nombre del tipo de evento
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  service: "gmail", // Puedes cambiarlo por tu proveedor de correo
  auth: {
    user: "platoycopa.oficial@gmail.com", // Reemplaza con el correo real
    pass: "hjxs qukq pooq ytxr", // Reemplaza con la contraseña real o token de aplicación
  },
})

// Update the brandColors object to match the CSS variables
const brandColors = {
  gold: "#e5c76b",
  goldDark: "#c9a33b",
  goldDarker: "#9f8a4b",
  goldLight: "rgba(229, 199, 107, 0.15)",
  goldLighter: "rgba(229, 199, 107, 0.075)",
  goldBorder: "rgba(229, 199, 107, 0.15)",
  black: "#000",
  blackLight: "#111",
  white: "#fff",
  whiteDim: "rgba(255, 255, 255, 0.8)",
  whiteDimmer: "rgba(255, 255, 255, 0.5)",
}

// Función para obtener la imagen del logo como base64
async function getLogoBase64() {
  try {
    // Actualizar la ruta del logo según la estructura del sitio
    const logoPath = path.join(__dirname, "../public/img/logo.png")
    // Verificar si el archivo existe
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath)
      return `data:image/png;base64,${logoData.toString("base64")}`
    } else {
      console.warn("Logo no encontrado en:", logoPath)
      // Intentar rutas alternativas si la primera falla
      const alternativePaths = [
        path.join(__dirname, "../img/logo.png"),
        path.join(__dirname, "../../public/img/logo.png"),
        path.join(__dirname, "../../img/logo.png"),
      ]

      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          console.log("Logo encontrado en ruta alternativa:", altPath)
          const logoData = fs.readFileSync(altPath)
          return `data:image/png;base64,${logoData.toString("base64")}`
        }
      }

      console.error("Logo no encontrado en ninguna ruta")
      return null
    }
  } catch (error) {
    console.error("Error al cargar el logo:", error)
    return null
  }
}

// Actualizar el estilo para incluir la fuente web
const emailStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap');
  
  body { 
    font-family: 'Cormorant Garamond', serif;
    margin: 0; 
    padding: 0; 
    color: ${brandColors.white}; 
    background-color: ${brandColors.black};
    line-height: 1.6;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: ${brandColors.blackLight};
    border: 1px solid ${brandColors.goldBorder};
    border-radius: 8px;
  }
  .header {
    text-align: center;
    padding: 20px 0;
    border-bottom: 2px solid ${brandColors.gold};
    position: relative;
  }
  .header::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23e5c76b; stop-opacity:0.15'/%3E%3Cstop offset='100%25' style='stop-color:%23ffffff; stop-opacity:0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M 0 80 Q 75 160, 150 80 T 300 80' stroke='%23e5c76b' stroke-width='1.5' fill='none' opacity='0.2'/%3E%3Cpath d='M 0 180 Q 75 260, 150 180 T 300 180' stroke='%23e5c76b' stroke-width='1' fill='none' opacity='0.15'/%3E%3C/svg%3E");
    background-size: 160px 160px;
    opacity: 0.8;
    z-index: 0;
  }
  .logo {
    max-width: 150px;
    height: auto;
    position: relative;
    z-index: 1;
  }
  h1, h2, h3 {
    color: ${brandColors.gold};
    font-weight: 300;
  }
  h2 {
    font-size: 1.8rem;
    border-bottom: 2px solid ${brandColors.goldBorder};
    padding-bottom: 10px;
    margin-top: 30px;
    text-align: center;
  }
  h3 {
    font-size: 1.4rem;
    margin-top: 25px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    border: 1px solid ${brandColors.goldBorder};
    border-radius: 8px;
    overflow: hidden;
  }
  th {
    background-color: rgba(229, 199, 107, 0.1);
    color: ${brandColors.gold};
    font-weight: 500;
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid ${brandColors.goldBorder};
  }
  td {
    padding: 12px;
    border-bottom: 1px solid rgba(229, 199, 107, 0.1);
    color: ${brandColors.whiteDim};
  }
  tr:last-child td {
    border-bottom: none;
  }
  .highlight {
    background-color: rgba(229, 199, 107, 0.05);
  }
  .total-row {
    background-color: rgba(229, 199, 107, 0.2);
    color: ${brandColors.gold};
    font-weight: 500;
  }
  .total-row td {
    color: ${brandColors.gold};
  }
  .message-box {
    background-color: rgba(229, 199, 107, 0.05);
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid ${brandColors.gold};
    color: ${brandColors.whiteDim};
    margin: 20px 0;
    line-height: 1.8;
  }
  .footer {
    text-align: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid ${brandColors.goldBorder};
    color: ${brandColors.whiteDimmer};
    font-size: 12px;
    position: relative;
  }
  .footer::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(229, 199, 107, 0.03) 0%, transparent 100%);
    z-index: 0;
  }
  .social-links {
    margin-top: 15px;
    position: relative;
    z-index: 1;
  }
  .social-links a {
    display: inline-block;
    margin: 0 10px;
    color: ${brandColors.gold};
    text-decoration: none;
    transition: all 0.3s ease;
  }
  .social-links a:hover {
    color: ${brandColors.white};
  }
  .gradient-text {
    background: linear-gradient(${brandColors.gold} 0%, ${brandColors.goldDarker} 50%, ${brandColors.gold} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(229, 199, 107, 0.2));
  }
`

// Update the sendContactEmail function to use the new styling
export async function sendContactEmail(contactData) {
  try {
    const { nombre, email, telefono, tipo_evento, mensaje } = contactData
    const logoBase64 = await getLogoBase64()

    // Obtener el nombre del tipo de evento desde la BD si el valor es un ID numérico
    let tipoEventoTexto = tipo_evento
    if (!isNaN(tipo_evento)) {
      try {
        const eventTypeData = await db.tiposEventosRepo.getById(tipo_evento)
        if (eventTypeData && eventTypeData.nombre) {
          tipoEventoTexto = eventTypeData.nombre
        } else {
          tipoEventoTexto = "Tipo de evento desconocido"
        }
      } catch (error) {
        console.error("Error al obtener tipo de evento:", error)
        tipoEventoTexto = "Tipo de evento desconocido"
      }
    }

    // Configurar el correo con una estructura HTML clara y bien formateada
    const mailOptions = {
      from: "Plato y Copa Website <platoycopa.oficial@gmail.com>",
      to: "platoycopa.oficial@gmail.com", // Correo de destino
      subject: `Nuevo mensaje de contacto de ${nombre}`,
      html: `
        <html>
          <head>
            <style>
              ${emailStyles}
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Plato y Copa" class="logo">` : "<h1 class='gradient-text'>Plato y Copa</h1>"}
                <h2 class="gradient-text">Nuevo Mensaje de Contacto</h2>
              </div>
              
              <h3>Información del Cliente</h3>
              <table>
                <tr class="highlight">
                  <td><strong>Nombre:</strong></td>
                  <td>${nombre}</td>
                </tr>
                <tr>
                  <td><strong>Email:</strong></td>
                  <td>${email}</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Teléfono:</strong></td>
                  <td>${telefono}</td>
                </tr>
                <tr>
                  <td><strong>Tipo de evento:</strong></td>
                  <td>${tipoEventoTexto}</td>
                </tr>
              </table>
              
              <h3>Mensaje del Cliente</h3>
              <div class="message-box">
                ${mensaje}
              </div>
              
              <div class="footer">
                <p>Este mensaje fue enviado desde el formulario de contacto de tu sitio web.</p>
                <div class="social-links">
                  <a href="https://www.facebook.com/share/15qpCyANjq/">Facebook</a> |
                  <a href="https://www.instagram.com/platoycopa.oficial?igsh=aHpyNWxhZGxyOWJ0">Instagram</a> |
                  <a href="https://wa.me/5212223780903">WhatsApp</a>
                </div>
                <p>© ${new Date().getFullYear()} Plato y Copa. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions)
    console.log("Correo enviado:", info.messageId)

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error al enviar correo:", error)
    return { success: false, error: error.message }
  }
}

// Update the sendQuotationEmail function to use the new styling
export async function sendQuotationEmail(quotationData) {
  try {
    const {
      fullName,
      email,
      phone,
      eventDate,
      numWaiters,
      serviceDuration,
      serviceLocation,
      eventType,
      lavalozas,
      cuidaCoches,
      montajeDesmontaje,
      baseServiceCost,
      additionalServicesCost,
      locationCharge,
      totalCost,
    } = quotationData

    const logoBase64 = await getLogoBase64()

    // Obtener el nombre del tipo de evento desde la BD si el valor es un ID numérico
    let tipoEventoTexto = eventType
    if (!isNaN(eventType)) {
      try {
        const eventTypeData = await db.tiposEventosRepo.getById(eventType)
        if (eventTypeData && eventTypeData.nombre) {
          tipoEventoTexto = eventTypeData.nombre
        } else {
          tipoEventoTexto = "Tipo de evento desconocido"
        }
      } catch (error) {
        console.error("Error al obtener tipo de evento:", error)
        tipoEventoTexto = "Tipo de evento desconocido"
      }
    }

    // Configurar el correo
    const mailOptions = {
      from: "Plato y Copa Website <platoycopa.oficial@gmail.com>",
      to: "platoycopa.oficial@gmail.com", // Correo de destino
      subject: `Nueva cotización de ${fullName}`,
      html: `
        <html>
          <head>
            <style>
              ${emailStyles}
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Plato y Copa" class="logo">` : "<h1 class='gradient-text'>Plato y Copa</h1>"}
                <h2 class="gradient-text">Nueva Cotización de Servicio</h2>
              </div>
              
              <h3>Información del Cliente</h3>
              <table>
                <tr class="highlight">
                  <td><strong>Nombre:</strong></td>
                  <td>${fullName}</td>
                </tr>
                <tr>
                  <td><strong>Email:</strong></td>
                  <td>${email}</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Teléfono:</strong></td>
                  <td>${phone}</td>
                </tr>
                <tr>
                  <td><strong>Fecha del evento:</strong></td>
                  <td>${eventDate}</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Tipo de evento:</strong></td>
                  <td>${tipoEventoTexto}</td>
                </tr>
              </table>
              
              <h3>Detalles del Servicio</h3>
              <table>
                <tr>
                  <td><strong>Número de meseros:</strong></td>
                  <td>${numWaiters}</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Duración:</strong></td>
                  <td>${serviceDuration} horas</td>
                </tr>
                <tr>
                  <td><strong>Ubicación:</strong></td>
                  <td>${serviceLocation === "local" ? "Local" : "Foráneo"}</td>
                </tr>
              </table>
              
              <h3>Servicios Adicionales</h3>
              <table>
                <tr>
                  <th>Servicio</th>
                  <th>Incluido</th>
                </tr>
                <tr class="highlight">
                  <td>Lavalozas</td>
                  <td>${lavalozas ? "Sí" : "No"}</td>
                </tr>
                <tr>
                  <td>Cuidacoches</td>
                  <td>${cuidaCoches ? "Sí" : "No"}</td>
                </tr>
                <tr class="highlight">
                  <td>Montaje y desmontaje</td>
                  <td>${montajeDesmontaje ? "Sí" : "No"}</td>
                </tr>
              </table>
              
              <h3>Resumen de Cotización</h3>
              <table>
                <tr>
                  <td><strong>Servicio base:</strong></td>
                  <td>$${baseServiceCost.toFixed(2)}</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Servicios adicionales:</strong></td>
                  <td>$${additionalServicesCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td><strong>Cargo por ubicación:</strong></td>
                  <td>$${locationCharge.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>TOTAL ESTIMADO:</strong></td>
                  <td><strong>$${totalCost.toFixed(2)}</strong></td>
                </tr>
              </table>
              
              <div class="footer">
                <p>Esta cotización fue generada desde el formulario de tu sitio web.</p>
                <div class="social-links">
                  <a href="https://www.facebook.com/share/15qpCyANjq/">Facebook</a> |
                  <a href="https://www.instagram.com/platoycopa.oficial?igsh=aHpyNWxhZGxyOWJ0">Instagram</a> |
                  <a href="https://wa.me/5212223780903">WhatsApp</a>
                </div>
                <p>© ${new Date().getFullYear()} Plato y Copa. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions)
    console.log("Correo de cotización enviado:", info.messageId)

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error al enviar correo de cotización:", error)
    return { success: false, error: error.message }
  }
}

export default {
  sendContactEmail,
  sendQuotationEmail,
}

