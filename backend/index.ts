// ...existing code...

const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
import type { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = process.env.PORT || 4000;
console.log('PGHOST en runtime:', process.env.PGHOST);
const pool = new Pool();

app.use(cors());
app.use(express.json());

// Middleware para verificar JWT

// --- Neighborhood API ---
// Obtener configuración del vecindario (solo admin)
app.get('/neighborhood', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede ver la configuración.' });
    const result = await pool.query('SELECT * FROM neighborhood ORDER BY id DESC LIMIT 1');
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Guardar/actualizar configuración del vecindario (solo admin)
app.post('/neighborhood', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede modificar la configuración.' });
    const { name, periodicity, amount } = req.body;
    if (!name || !periodicity || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }
    // Solo se permite un registro, así que actualiza si existe, si no, inserta
    const existing = await pool.query('SELECT id FROM neighborhood ORDER BY id DESC LIMIT 1');
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE neighborhood SET name = $1, periodicity = $2, amount = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [name, periodicity, amount, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO neighborhood (name, periodicity, amount) VALUES ($1, $2, $3) RETURNING *',
        [name, periodicity, amount]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
app.use(cors());
app.use(express.json());

// Middleware para verificar JWT
type JwtPayload = { id: number; username: string; role: string };
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    (req as any).user = user;
    next();
  });
}

// Ruta pública
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API funcionando correctamente 🚀' });
});

// Registro de usuario
app.post('/register', async (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role && role === 'admin' ? 'admin' : 'user';
    const result = await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role', [username, hashedPassword, userRole]);
    res.status(201).json({ user: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'El usuario ya existe' });
    } else {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
});

// Login de usuario
app.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  // Compara el hash calculado del password recibido con el hash de la base
  console.log('Login request:', { username, password });
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    console.log('DB user:', user);
    if (!user) {
      console.log('No user found for username:', username);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    // Compara la contraseña recibida con el hash usando bcrypt.compare
  console.log('Password recibido:', password, '| Length:', password.length);
  console.log('Hash en base:', user.password, '| Length:', user.password.length);
  const valid = await bcrypt.compare(password, user.password);
  console.log('Password valid?', valid);
    if (!valid) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta protegida
app.get('/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: `Hola ${(req as any).user.username}, accediste a una ruta protegida!` });
});

// CRUD de usuarios
// Listar todos los usuarios (protegido)
app.get('/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener usuario por id (protegido)
app.get('/users/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear usuario (registro público, ya existe como /register)
app.post('/users', async (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role && role === 'admin' ? 'admin' : 'user';
    const result = await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role', [username, hashedPassword, userRole]);
    res.status(201).json({ user: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'El usuario ya existe' });
    } else {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
});

// Actualizar usuario (protegido)
app.put('/users/:id', authenticateToken, async (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  if (!username && !password && !role) return res.status(400).json({ error: 'Nada para actualizar' });
  try {
    let query = 'UPDATE users SET ';
    const params: any[] = [];
    if (username) {
      params.push(username);
      query += `username = $${params.length}`;
    }
    if (password) {
      if (params.length > 0) query += ', ';
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
      query += `password = $${params.length}`;
    }
    if (role) {
      if (params.length > 0) query += ', ';
      params.push(role);
      query += `role = $${params.length}`;
    }
    params.push(req.params.id);
    query += ` WHERE id = $${params.length} RETURNING id, username, role`;
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar usuario (protegido)
app.delete('/users/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username, role', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});



// --- Houses API ---
// Listar casas (solo admin)
app.get('/houses', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede ver las casas.' });
  try {
    const result = await pool.query('SELECT * FROM houses ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear casa (solo admin)
app.post('/houses', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede agregar casas.' });
  const { id, owner } = req.body;
  if (!id) return res.status(400).json({ error: 'ID de casa requerido.' });
  try {
    // Validar que no exista la casa
    const exists = await pool.query('SELECT id FROM houses WHERE id = $1', [id]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Ya existe una casa con ese ID.' });
    const result = await pool.query('INSERT INTO houses (id, owner) VALUES ($1, $2) RETURNING *', [id, owner || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar casa (solo admin)
app.put('/houses/:id', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede modificar casas.' });
  const { owner } = req.body;
  try {
    const result = await pool.query('UPDATE houses SET owner = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [owner || null, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Casa no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar casa (solo admin)
app.delete('/houses/:id', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede eliminar casas.' });
  try {
    const result = await pool.query('DELETE FROM houses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Casa no encontrada.' });
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
