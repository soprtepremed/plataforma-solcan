-- Ejecuta esto en el Editor SQL de tu panel de Supabase:

CREATE TABLE empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  nombre text NOT NULL,
  pin text NOT NULL,
  role text NOT NULL,
  sucursal text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar los 3 choferes
INSERT INTO empleados (username, nombre, pin, role, sucursal) VALUES 
('chofer1', 'Chofer 1', '1234', 'mensajero', 'Transporte Central'),
('chofer2', 'Chofer 2', '1234', 'mensajero', 'Transporte Central'),
('chofer3', 'Chofer 3', '1234', 'mensajero', 'Transporte Central');

-- Insertar un administrador
INSERT INTO empleados (username, nombre, pin, role, sucursal) VALUES 
('admin', 'Administrador General', '1234', 'admin', 'Oficina Central');

-- Insertar algunas sucursales (Área de Recepción)
INSERT INTO empleados (username, nombre, pin, role, sucursal) VALUES 
('sucursal_paso', 'Recepción El Paso Limon', '1234', 'recepcion', 'El Paso Limon'),
('sucursal_chiapa', 'Recepción Chiapa de Corzo', '1234', 'recepcion', 'Chiapa de Corzo'),
('sucursal_arenal', 'Recepción Arenal', '1234', 'recepcion', 'Arenal Club Campestre');

-- Insertar un área de captura
INSERT INTO empleados (username, nombre, pin, role, sucursal) VALUES 
('captura1', 'Técnico de Captura 1', '1234', 'captura', 'Laboratorio Central');
