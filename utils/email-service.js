import nodemailer from "nodemailer"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "platoycopa.oficial@gmail.com",
    pass: "hjxs qukq pooq ytxr",
  },
})

// Colores de marca
const brandColors = {
  gold: "#e5c76b",
  goldDark: "#c9a33b",
  goldLight: "rgba(229, 199, 107, 0.15)",
  black: "#000",
  blackLight: "#111",
  white: "#fff",
  whiteDim: "rgba(255, 255, 255, 0.8)",
  whiteDimmer: "rgba(255, 255, 255, 0.5)",
}

// Función para obtener la imagen del logo como base64
async function getLogoBase64() {
  try {
    const logoPath = path.join(__dirname, "../public/img/Plato_y_Copa_logo.jpg")
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath)
      return `data:image/jpeg;base64,${logoData.toString("base64")}`
    } else {
      console.warn("Logo no encontrado en:", logoPath)
      return null
    }
  } catch (error) {
    console.error("Error al cargar el logo:", error)
    return null
  }
}

// Estilos para los correos electrónicos
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
    border: 1px solid ${brandColors.goldLight};
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
    border-bottom: 2px solid ${brandColors.goldLight};
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
    border: 1px solid ${brandColors.goldLight};
    border-radius: 8px;
    overflow: hidden;
  }
  th {
    background-color: rgba(229, 199, 107, 0.1);
    color: ${brandColors.gold};
    font-weight: 500;
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid ${brandColors.goldLight};
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
    border-top: 1px solid ${brandColors.goldLight};
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
    background: linear-gradient(${brandColors.gold} 0%, ${brandColors.goldDark} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(229, 199, 107, 0.2));
  }
  .button {
    display: inline-block;
    background-color: ${brandColors.gold};
    color: ${brandColors.black} !important;
    padding: 12px 25px;
    margin: 20px 0;
    text-decoration: none;
    border-radius: 50px;
    font-weight: 600;
    letter-spacing: 1px;
    transition: all 0.3s ease;
    text-align: center;
  }
  .button:hover {
    background-color: ${brandColors.goldDark};
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(229, 199, 107, 0.2);
  }
  .info-text {
    color: ${brandColors.whiteDim};
    line-height: 1.8;
    margin: 20px 0;
  }
  .signature {
    border-top: 1px solid ${brandColors.goldLight};
    margin-top: 20px;
    padding-top: 15px;
    color: ${brandColors.whiteDim};
  }
  .signature img {
    max-width: 120px;
    margin-bottom: 10px;
  }
`
export async function sendWelcomeEmail({ to, nombre }) {
  try {
    const logoBase64 = await getLogoBase64(); // Ya definida en tu archivo

    const html = `
      <html>
        <head>
          <style>
            ${emailStyles} /* Ya definido en tu archivo también */
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoBase64 
                ? `<img src="${logoBase64}" alt="Plato y Copa" class="logo">`
                : "<h1 class='gradient-text'>Plato y Copa</h1>"
              }
              <h2 class="gradient-text">¡Bienvenido a Plato y Copa!</h2>
            </div>

            <div class="info-text">
              <p>Hola ${nombre},</p>
              <p>¡Gracias por registrarte en nuestra plataforma!</p>
              <p>Nos alegra que formes parte de nuestra comunidad.</p>
              <p>En Plato y Copa, estamos comprometidos en brindarte el mejor servicio para que tu evento sea inolvidable.</p>
            </div>

            <div class="footer">
              <p>Este correo fue enviado automáticamente después de tu registro.</p>
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
    `;

    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to,
      subject: "¡Bienvenido a Plato y Copa!",
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Correo de bienvenida enviado a:", to);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar correo de bienvenida:", error);
    return { success: false, error: error.message };
  }
}

// Función para enviar correo de contacto
export async function sendContactEmail(contactData) {
  try {
    const { nombre, email, telefono, tipo_evento, mensaje } = contactData
    const logoBase64 = await getLogoBase64()

    // Obtener el nombre del tipo de evento si es un ID
    let tipoEventoTexto = tipo_evento
    if (typeof tipo_evento === "number" || !isNaN(tipo_evento)) {
      try {
        // Asumimos que db está disponible globalmente o se pasa como parámetro
        const db = global.db || require("../database/postgress-db.js").default
        const tipoEventoData = await db.tiposEventosRepo.getById(tipo_evento)
        if (tipoEventoData && tipoEventoData.nombre) {
          tipoEventoTexto = tipoEventoData.nombre
        }
      } catch (error) {
        console.error("Error al obtener tipo de evento:", error)
      }
    }

    // Configurar el correo con diseño premium
    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
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
                  <td>${telefono || "No proporcionado"}</td>
                </tr>
                <tr>
                  <td><strong>Tipo de evento:</strong></td>
                  <td>${tipoEventoTexto || "No especificado"}</td>
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

// Función para enviar respuesta a un mensaje de contacto
export async function sendReplyEmail(replyData) {
  try {
    const { destinatario, nombre, mensaje, asunto, includeSignature, remitente } = replyData
    const logoBase64 = await getLogoBase64()

    // Preparar firma
    let signature = ""
    if (includeSignature) {
      signature = `
      <div class="signature">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Plato y Copa">` : ""}
        <p><strong>Plato y Copa - Servicio de meseros</strong><br>
        Email: platoycopa.oficial@gmail.com<br>
        Tel: +52 (222) 378-0903<br>
        <a href="https://www.platoycopa.com" style="color: ${brandColors.gold};">www.platoycopa.com</a></p>
      </div>`
    }

    // Configurar el correo con diseño premium
    const mailOptions = {
      from: {
        name: `${remitente} - Plato y Copa`,
        address: "platoycopa.oficial@gmail.com",
      },
      to: destinatario,
      subject: asunto,
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
                <h2 class="gradient-text">Respuesta a tu Mensaje</h2>
              </div>
              
              <div class="info-text">
                <p>Hola ${nombre},</p>
                <p>${mensaje.replace(/\n/g, "<br>")}</p>
              </div>
              
              ${signature}
              
              <div class="footer">
                <p>Este correo es una respuesta a tu mensaje enviado a través de nuestro sitio web.</p>
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
    console.log("Correo de respuesta enviado:", info.messageId)

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error al enviar correo de respuesta:", error)
    return { success: false, error: error.message }
  }
}

// Función para enviar correo de reenvío
export async function sendForwardEmail(forwardData) {
  try {
    const { destinatario, mensaje, asunto, remitente } = forwardData
    const logoBase64 = await getLogoBase64()

    // Configurar el correo con diseño premium
    const mailOptions = {
      from: {
        name: `${remitente} - Plato y Copa`,
        address: "platoycopa.oficial@gmail.com",
      },
      to: destinatario,
      subject: asunto,
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
                <h2 class="gradient-text">Mensaje Reenviado</h2>
              </div>
              
              <div class="info-text">
                <p>${mensaje.replace(/\n/g, "<br>")}</p>
              </div>
              
              <div class="message-box">
                <p><strong>Reenviado por:</strong> ${remitente}<br>
                <strong>Fecha:</strong> ${new Date().toLocaleString("es-MX")}</p>
              </div>
              
              <div class="footer">
                <p>Este correo ha sido reenviado desde nuestro sistema de mensajería.</p>
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
    console.log("Correo reenviado enviado:", info.messageId)

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error al enviar correo reenviado:", error)
    return { success: false, error: error.message }
  }
}

// Función para enviar correo de cotización
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

    // Obtener el nombre del tipo de evento si es un ID
    let tipoEventoTexto = eventType
    if (typeof eventType === "number" || !isNaN(eventType)) {
      try {
        // Asumimos que db está disponible globalmente o se pasa como parámetro
        const db = global.db || require("../database/postgress-db.js").default
        const tipoEventoData = await db.tiposEventosRepo.getById(eventType)
        if (tipoEventoData && tipoEventoData.nombre) {
          tipoEventoTexto = tipoEventoData.nombre
        }
      } catch (error) {
        console.error("Error al obtener tipo de evento:", error)
      }
    }

    // Configurar el correo con diseño premium
    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to: "platoycopa.oficial@gmail.com", // Correo de destino (también se puede enviar al cliente)
      subject: `Nueva cotización de ${fullName} - ${tipoEventoTexto}`,
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
// Función para enviar correo de modificación de cuenta
export async function sendAccountModificationEmail({ to, nombreUsuario, modifiedBy, modifiedFields }) {
  try {
    // Construir el contenido descriptivo de los cambios
    const changesList = modifiedFields.length > 0
      ? `<ul>${modifiedFields.map(item => `<li>${item}</li>`).join('')}</ul>`
      : "<p>No se detectaron cambios.</p>";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${brandColors.gold};">Modificación de Cuenta</h2>
        </div>
        <p>Hola ${nombreUsuario},</p>
        <p>Tu cuenta ha sido modificada por ${modifiedBy}.</p>
        <p>A continuación, se muestra un resumen de los cambios realizados:</p>
        ${changesList}
        <p>Si no solicitaste estos cambios o tienes alguna duda, por favor ponte en contacto con el equipo de soporte.</p>
        <p>Saludos,<br>Equipo de Plato y Copa</p>
      </div>
    `;

    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to,
      subject: "Modificación en tu cuenta - Plato y Copa",
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email de modificación enviado a:", to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar email de modificación:", error);
    return { success: false, error: error.message };
  }
}
export async function sendAccountActivationEmail({ to, nombreUsuario, modifiedBy }) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${brandColors.gold};">Cuenta Activada</h2>
        </div>
        <p>Hola ${nombreUsuario},</p>
        <p>Tu cuenta ha sido <strong>activada</strong> por ${modifiedBy}.</p>
        <p>A partir de ahora podrás acceder a todas las funcionalidades disponibles.</p>
        <p>Si no reconoces esta acción, por favor contacta a soporte.</p>
        <p>Saludos,<br>Equipo de Plato y Copa</p>
      </div>
    `;
    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to,
      subject: "Tu cuenta ha sido activada",
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email de activación enviado a:", to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar email de activación:", error);
    return { success: false, error: error.message };
  }
}
export async function sendAccountDeactivationEmail({ to, nombreUsuario, modifiedBy }) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${brandColors.gold};">Cuenta Desactivada</h2>
        </div>
        <p>Hola ${nombreUsuario},</p>
        <p>Tu cuenta ha sido <strong>desactivada</strong> por ${modifiedBy}.</p>
        <p>Ya no podrás acceder al sistema hasta que se reactive. Si crees que se ha producido un error, contacta a soporte.</p>
        <p>Saludos,<br>Equipo de Plato y Copa</p>
      </div>
    `;
    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to,
      subject: "Tu cuenta ha sido desactivada",
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email de desactivación enviado a:", to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar email de desactivación:", error);
    return { success: false, error: error.message };
  }
}

export async function sendAccountDeletionEmail({ to, nombreUsuario, modifiedBy }) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${brandColors.gold};">Cuenta Eliminada</h2>
        </div>
        <p>Hola ${nombreUsuario},</p>
        <p>Tu cuenta ha sido <strong>eliminada</strong> por ${modifiedBy}.</p>
        <p>Esta acción es irreversible. Si tienes dudas o necesitas ayuda, contacta al equipo de soporte.</p>
        <p>Saludos,<br>Equipo de Plato y Copa</p>
      </div>
    `;
    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to,
      subject: "Tu cuenta ha sido eliminada",
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email de eliminación enviado a:", to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar email de eliminación:", error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordChangeNotificationEmail({ to, nombreUsuario, modifiedBy, newPassword }) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${brandColors.gold};">Contraseña Actualizada</h2>
        </div>
        <p>Hola ${nombreUsuario},</p>
        <p>Tu contraseña ha sido actualizada por ${modifiedBy}.</p>
        <p>Tu nueva contraseña es:</p>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
          ${newPassword}
        </div>
        <p>Por razones de seguridad, te recomendamos cambiarla una vez que inicies sesión.</p>
        <p>Si no autorizaste este cambio, por favor contacta al equipo de soporte inmediatamente.</p>
        <p>Saludos,<br>Equipo de Plato y Copa</p>
      </div>
    `;
    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to,
      subject: "Tu contraseña ha sido actualizada",
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email de cambio de contraseña enviado a:", to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar email de cambio de contraseña:", error);
    return { success: false, error: error.message };
  }
}



// Función para enviar email de creación de cuenta
export async function sendAccountCreationEmail({ to, nombreUsuario, createdBy }) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: ${brandColors.gold};">Cuenta Creada</h2>
        </div>
        <p>Hola ${nombreUsuario},</p>
        <p>Tu cuenta ha sido creada por ${createdBy}.</p>
        <p>Ahora ya puedes acceder al sistema y disfrutar de nuestros servicios.</p>
        <p>Si tienes alguna duda, por favor contacta a soporte.</p>
        <p>Saludos,<br>Equipo de Plato y Copa</p>
      </div>
    `;
    
    const mailOptions = {
      from: "Plato y Copa <platoycopa.oficial@gmail.com>",
      to,
      subject: "Tu cuenta ha sido creada",
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email de creación enviado a:", to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar email de creación:", error);
    return { success: false, error: error.message };
  }
}



// Exportar todas las funciones
export default {
  sendContactEmail,
  sendReplyEmail,
  sendForwardEmail,
  sendQuotationEmail,
  sendAccountModificationEmail,
  sendAccountActivationEmail,
  sendAccountDeactivationEmail,
  sendAccountDeletionEmail,
  sendPasswordChangeNotificationEmail,
  sendAccountCreationEmail,
  sendWelcomeEmail
}
