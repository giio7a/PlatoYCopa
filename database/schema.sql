-- Esquema de la base de datos para Plato y Copa
-- Versión 1.0

-- Tabla de tipos de eventos
CREATE TABLE IF NOT EXISTS tipos_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icono TEXT DEFAULT 'bi-calendar-event',
  orden INTEGER DEFAULT 0
);

-- Tabla de servicios
CREATE TABLE IF NOT EXISTS servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion_corta TEXT NOT NULL,
  descripcion_completa TEXT,
  precio TEXT,
  precio_desde TEXT,
  imagen_url TEXT,
  icono TEXT DEFAULT 'bi-star',
  caracteristicas TEXT, -- JSON array
  destacado INTEGER DEFAULT 0,
  orden INTEGER DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de imágenes de galería
CREATE TABLE IF NOT EXISTS imagenes_galeria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  url_imagen TEXT NOT NULL,
  url_imagen_completa TEXT,
  tipo_evento_id INTEGER,
  destacada INTEGER DEFAULT 0,
  orden INTEGER DEFAULT 0,
  FOREIGN KEY (tipo_evento_id) REFERENCES tipos_eventos(id)
);

-- Tabla de estadísticas
CREATE TABLE IF NOT EXISTS estadisticas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL,
  label TEXT NOT NULL,
  icono TEXT DEFAULT 'bi-star',
  orden INTEGER DEFAULT 0
);

-- Tabla de equipo  
CREATE TABLE IF NOT EXISTS equipo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  posicion TEXT NOT NULL,
  bio TEXT,
  imagen TEXT,
  orden INTEGER DEFAULT 0
);

-- Tabla de contenido de página
CREATE TABLE IF NOT EXISTS contenido_pagina (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seccion TEXT NOT NULL,
  titulo TEXT,
  subtitulo TEXT,
  contenido TEXT,
  imagen TEXT,
  orden INTEGER DEFAULT 0
);

-- Tabla de mensajes de contacto
CREATE TABLE IF NOT EXISTS contacto_mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  tipo_evento TEXT,
  mensaje TEXT NOT NULL,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leido INTEGER DEFAULT 0
);

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_cliente TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  fecha_evento TEXT NOT NULL,
  num_meseros INTEGER NOT NULL,
  duracion_servicio INTEGER NOT NULL,
  ubicacion TEXT NOT NULL,
  tipo_evento_id INTEGER NOT NULL,
  lavalozas INTEGER DEFAULT 0,
  cuida_coches INTEGER DEFAULT 0,
  montaje_desmontaje INTEGER DEFAULT 0,
  costo_base REAL NOT NULL,
  costo_adicionales REAL NOT NULL,
  cargo_ubicacion REAL NOT NULL,
  costo_total REAL NOT NULL,
  estado TEXT NOT NULL,
  fecha_creacion TEXT NOT NULL,
  FOREIGN KEY (tipo_evento_id) REFERENCES tipos_eventos(id)
);

-- Tabla de contratos
CREATE TABLE IF NOT EXISTS contratos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_contrato TEXT NOT NULL UNIQUE,
  nombre_cliente TEXT NOT NULL,
  fecha_evento TEXT NOT NULL,
  tipo_evento_id INTEGER NOT NULL,
  estado TEXT DEFAULT 'completado',
  fecha_creacion TEXT NOT NULL,
  FOREIGN KEY (tipo_evento_id) REFERENCES tipos_eventos(id)
);

-- Tabla de reseñas
CREATE TABLE IF NOT EXISTS resenas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_contrato TEXT NOT NULL,
  nombre_cliente TEXT NOT NULL,
  fecha TEXT NOT NULL,
  tipo_evento_id INTEGER NOT NULL,
  calificacion INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario TEXT NOT NULL,
  imagenes TEXT DEFAULT '[]',
  verificado INTEGER DEFAULT 1,
  FOREIGN KEY (tipo_evento_id) REFERENCES tipos_eventos(id),
  FOREIGN KEY (numero_contrato) REFERENCES contratos(numero_contrato)
);

-- Insertar datos iniciales

-- Añadir al final del archivo schema.sql

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nombre TEXT,
  rol TEXT DEFAULT 'admin',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP
);

-- Insertar usuario administrador

-- Tipos de eventos
INSERT OR IGNORE INTO tipos_eventos (id, nombre, descripcion, icono, orden) VALUES
(1, 'Boda', 'Celebraciones matrimoniales', 'bi-heart', 1),
(2, 'Corporativo', 'Eventos empresariales', 'bi-briefcase', 2),
(3, 'Cumpleaños', 'Fiestas de cumpleaños', 'bi-gift', 3),
(4, 'Graduación', 'Ceremonias de graduación', 'bi-mortarboard', 4);

-- Servicios
INSERT OR IGNORE INTO servicios (id, titulo, descripcion_corta, descripcion_completa, precio, precio_desde, imagen_url, icono, caracteristicas, destacado, orden) VALUES
(1, 'Servicio de Meseros', 'Meseros profesionales para todo tipo de eventos', 'Nuestros meseros están altamente capacitados para brindar un servicio excepcional en cualquier tipo de evento. Contamos con personal uniformado, con experiencia y excelente presentación.', NULL, '$350 por mesero', '/img/services/meseros.jpg', 'bi-person', '["Personal uniformado","Experiencia comprobada","Excelente presentación"]', 1, 1),
(2, 'Servicio de Bartender', 'Bartenders profesionales para tu evento', 'Nuestros bartenders prepararán deliciosas bebidas para tus invitados. Contamos con personal especializado en coctelería clásica y moderna.', '$500 por bartender', NULL, '/img/services/bartender.jpg', 'bi-cup-straw', '["Coctelería clásica y moderna","Preparación de bebidas sin alcohol","Montaje de barra"]', 1, 2),
(3, 'Servicio de Capitán', 'Coordinación profesional para tu evento', 'El capitán se encargará de coordinar a todo el personal de servicio, asegurando que todo funcione perfectamente durante tu evento.', '$600', NULL, '/img/services/capitan.jpg', 'bi-person-badge', '["Coordinación del personal","Supervisión del servicio","Atención personalizada"]', 1, 3),
(4, 'Servicio de Valet Parking', 'Servicio de estacionamiento para tus invitados', 'Nuestro servicio de valet parking hará que tus invitados se sientan atendidos desde su llegada.', NULL, '$400', '/img/services/valet.jpg', 'bi-car-front', '["Personal uniformado","Servicio ágil","Seguridad garantizada"]', 1, 4);

-- Estadísticas
INSERT OR IGNORE INTO estadisticas (id, numero, label, icono, orden) VALUES
(1, 500, 'Eventos Realizados', 'bi-calendar-check', 1),
(2, 120, 'Meseros Profesionales', 'bi-person', 2),
(3, 50, 'Clientes Corporativos', 'bi-building', 3),
(4, 98, 'Clientes Satisfechos', 'bi-emoji-smile', 4);

-- Contratos de ejemplo
INSERT OR IGNORE INTO contratos (numero_contrato, nombre_cliente, fecha_evento, tipo_evento_id, estado, fecha_creacion) VALUES 
('CONT-2023-001', 'Juan Pérez', '2023-05-15', 1, 'completado', '2023-04-01'),
('CONT-2023-002', 'María González', '2023-06-20', 2, 'completado', '2023-05-10'),
('CONT-2023-003', 'Carlos Rodríguez', '2023-07-08', 3, 'completado', '2023-06-01'),
('CONT-2023-004', 'Ana López', '2023-08-12', 4, 'completado', '2023-07-05'),
('CONT-2023-005', 'Roberto Sánchez', '2023-09-25', 1, 'completado', '2023-08-15');

-- Reseñas de ejemplo
INSERT OR IGNORE INTO resenas (numero_contrato, nombre_cliente, fecha, tipo_evento_id, calificacion, comentario, verificado) VALUES
('CONT-2023-001', 'Juan Pérez', '15 de mayo de 2023', 1, 5, 'Excelente servicio, los meseros fueron muy profesionales y atentos. Todos nuestros invitados quedaron encantados.', 1),
('CONT-2023-002', 'María González', '20 de junio de 2023', 2, 4, 'Muy buen servicio para nuestro evento corporativo. El personal llegó puntual y fue muy eficiente.', 1),
('CONT-2023-003', 'Carlos Rodríguez', '8 de julio de 2023', 3, 5, 'Contratamos el servicio para el cumpleaños de mi hijo y fue perfecto. Los meseros fueron muy amables con todos los niños.', 1);

-- Imágenes de galería
INSERT OR IGNORE INTO imagenes_galeria (titulo, descripcion, url_imagen, url_imagen_completa, tipo_evento_id, destacada, orden) VALUES
('Boda Elegante', 'Servicio de meseros para una boda elegante en Puebla', '/img/Evento-1.jpg', 'platoycopa/public/img/Evento-1.jpg', 1, 1, 1),
('Evento Corporativo', 'Servicio completo para evento empresarial', '/img/Evento-2.jpg', '/img/gallery/corporativo1_full.jpg', 2, 1, 2),
('Fiesta de Cumpleaños', 'Celebración de cumpleaños con servicio premium', '/img/gallery/cumpleanos1.jpg', '/img/gallery/cumpleanos1_full.jpg', 3, 1, 3),
('Graduación Universitaria', 'Servicio para ceremonia de graduación', '/img/gallery/graduacion1.jpg', '/img/gallery/graduacion1_full.jpg', 4, 0, 4);

ALTER TABLE resenas ADD COLUMN likes INTEGER DEFAULT 0;

ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 0;