import bcrypt from 'bcrypt';

// Función para crear el repositorio de usuarios
export function createUsuariosRepo(db) {
  return {
    async verificarCredenciales(email, password) {
      try {
        const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', email);
        
        if (!usuario) {
          return { success: false, message: 'Usuario no encontrado' };
        }
        
        const passwordMatch = await bcrypt.compare(password, usuario.password);
        
        if (!passwordMatch) {
          return { success: false, message: 'Contraseña incorrecta' };
        }
        
        // Actualizar último acceso
        await db.run(
          'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?',
          usuario.id
        );
        
        return { 
          success: true, 
          usuario: {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol
          } 
        };
      } catch (error) {
        console.error('Error al verificar credenciales:', error);
        return { success: false, message: 'Error al verificar credenciales' };
      }
    },
    
    async getByEmail(email) {
        try {
          return await db.get(
            'SELECT id, email, password, nombre, rol, fecha_creacion, ultimo_acceso FROM usuarios WHERE email = ?',
            email
          )
        } catch (error) {
          console.error(`Error al obtener usuario con email ${email}:`, error)
          return null
        }
      }
      
      ,
    
      async crearUsuario(userData) {
        try {
          const { email, password, nombre } = userData;
          
          // Si el correo es el oficial, el rol es forzosamente "admin"
          const rol = email === 'platoycopa.oficial@gmail.com' ? 'admin' : (userData.rol || 'usuario');
      
          // Verificar si el usuario ya existe
          const existingUser = await this.getByEmail(email);
          if (existingUser) {
            return { success: false, message: 'El correo electrónico ya está registrado' };
          }
          
          // Insertar el nuevo usuario
          const result = await db.run(
            'INSERT INTO usuarios (email, password, nombre, rol) VALUES (?, ?, ?, ?)',
            [email, password, nombre, rol]
          );
          
          return { success: true, id: result.lastID };
        } catch (error) {
          console.error('Error al crear usuario:', error);
          return { success: false, message: `Error al crear usuario: ${error.message}` };
        }
      }
      ,
    
    async cambiarPassword(email, newPassword) {
      try {
        // Encriptar la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Actualizar la contraseña
        const result = await db.run(
          'UPDATE usuarios SET password = ? WHERE email = ?',
          [hashedPassword, email]
        );
        
        if (result.changes === 0) {
          return { success: false, message: 'Usuario no encontrado' };
        }
        
        return { success: true };
      } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        return { success: false, message: `Error al cambiar contraseña: ${error.message}` };
      }
    },
    
    async getAllUsuarios() {
      try {
        return await db.all('SELECT id, email, nombre, rol, fecha_creacion, ultimo_acceso FROM usuarios');
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return [];
      }
    }
  };
}