// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configuración básica de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Función para crear un uploader para diferentes carpetas
export function createUploader(folder) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `plato-y-copa/${folder}`, // Organiza por carpetas
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 1200, crop: 'limit' }] // Opcional: limita tamaño máximo
    }
  });
  
  return multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
    fileFilter: (req, file, cb) => {
      // Validar tipos de archivo
      if (file.mimetype.startsWith("image/")) {
        cb(null, true)
      } else {
        cb(new Error("Solo se permiten imágenes"))
      }
    }
  });
}

// Exportar cloudinary para uso directo si es necesario
export { cloudinary };