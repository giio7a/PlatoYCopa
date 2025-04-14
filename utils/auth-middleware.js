import jwt from 'jsonwebtoken';

// Clave secreta para firmar los tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'plato_y_copa_secret_key';

// Función para generar un token JWT
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      rol: user.rol 
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
}

// Middleware para verificar si el usuario está autenticado
export function isAuthenticated(req, res, next) {
  // Obtener el token de la cookie
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.redirect('/auth?error=Sesión%20expirada.%20Por%20favor,%20inicia%20sesión%20nuevamente.');
  }
  
  try {
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Añadir la información del usuario al objeto request
    req.user = decoded;
    
    // Continuar con la siguiente función
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.clearCookie('auth_token');
    return res.redirect('/auth?error=Sesión%20inválida.%20Por%20favor,%20inicia%20sesión%20nuevamente.');
  }
}

// Middleware para verificar si el usuario es administrador
export function isAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).send('Acceso denegado. No tienes permisos de administrador.');
  }
  
  next();
}

// Middleware para generar un código de recuperación
export function generateRecoveryCode() {
  // Generar un código de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Almacenamiento temporal para códigos de recuperación
// En producción, esto debería estar en una base de datos
export const recoveryCodes = new Map();

// Función para almacenar un código de recuperación
export function storeRecoveryCode(email, code) {
  // El código expira después de 15 minutos
  const expiresAt = Date.now() + 15 * 60 * 1000;
  recoveryCodes.set(email, { code, expiresAt });
  
  // Programar la eliminación del código después de 15 minutos
  setTimeout(() => {
    if (recoveryCodes.has(email) && recoveryCodes.get(email).code === code) {
      recoveryCodes.delete(email);
    }
  }, 15 * 60 * 1000);
}

// Función para verificar un código de recuperación
export function verifyRecoveryCode(email, code) {
  const storedData = recoveryCodes.get(email);
  
  if (!storedData) {
    return false;
  }
  
  if (Date.now() > storedData.expiresAt) {
    recoveryCodes.delete(email);
    return false;
  }
  
  return storedData.code === code;
}

// Función para generar un token de restablecimiento de contraseña
export function generateResetToken(email) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
}

// Función para verificar un token de restablecimiento de contraseña
export function verifyResetToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}