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
  const { username, password } = req.body as any;
  console.log('[AUTH] /login request', { username });
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  try {
    // 1) Intentar como admin/user
    const ures = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const u = ures.rows[0];
    if (u) {
      console.log('[AUTH] Found admin/user', { id: u.id, username: u.username, role: u.role });
      const valid = await bcrypt.compare(password, u.password);
      console.log('[AUTH] Admin password valid?', valid);
      if (valid) {
        const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
        return res.json({ token, role: u.role });
      }
      // Si existe en admins pero el password no es válido, no continuar a neighbor por seguridad
      console.warn('[AUTH] Admin password mismatch, denying');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 2) Intentar como neighbor (user_id)
    const nid = String(username).toUpperCase();
    console.log('[AUTH] Try neighbor', { user_id: nid });
    const nres = await pool.query('SELECT user_id, name, password FROM neighbors WHERE user_id = $1', [nid]);
    const n = nres.rows[0];
    if (n) {
      console.log('[AUTH] Found neighbor', { user_id: n.user_id, name: n.name });
      const valid = await bcrypt.compare(password, n.password);
      console.log('[AUTH] Neighbor password valid?', valid);
      if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
      const token = jwt.sign({ id: n.user_id, username: n.name, role: 'neighbor' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
      return res.json({ token, role: 'neighbor' });
    }

    // No encontrado ni en admins ni neighbors
    console.warn('[AUTH] Not found in users nor neighbors', { username, nid });
    return res.status(401).json({ error: 'Credenciales inválidas' });
  } catch (err) {
    console.error('[AUTH] /login error', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Login de vecino (neighbors)
app.post('/neighbor/login', async (req: Request, res: Response) => {
  let { user_id, password } = req.body as any;
  console.log('[AUTH] /neighbor/login request', { user_id });
  if (!user_id || !password) return res.status(400).json({ error: 'user_id y contraseña requeridos' });
  try {
    user_id = String(user_id).toUpperCase();
    const result = await pool.query('SELECT user_id, name, password FROM neighbors WHERE user_id = $1', [user_id]);
    const neighbor = result.rows[0];
    if (!neighbor) {
      console.warn('[AUTH] Neighbor not found', { user_id });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const valid = await bcrypt.compare(password, neighbor.password);
    console.log('[AUTH] Neighbor password valid?', valid);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign({ id: neighbor.user_id, username: neighbor.name, role: 'neighbor' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ token, role: 'neighbor' });
  } catch (err) {
    console.error('[AUTH] /neighbor/login error', err);
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

// --- Neighbors API ---
// Helper para generar ID: 3 letras + 2 números (p.ej. ABC12)
function generateNeighborId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const l = () => letters[Math.floor(Math.random() * letters.length)];
  const d = () => digits[Math.floor(Math.random() * digits.length)];
  return `${l()}${l()}${l()}${d()}${d()}`;
}

// Listar neighbors (solo admin)
app.get('/neighbors', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede ver los vecinos.' });
  try {
    const result = await pool.query('SELECT user_id, name, house_id, email, phone, created_at, updated_at FROM neighbors ORDER BY user_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear neighbor (solo admin) - genera user_id automáticamente si no se envía
app.post('/neighbors', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede agregar vecinos.' });
  let { user_id, password, name, house_id, email, phone } = req.body;
  if (!password || !name || !house_id) return res.status(400).json({ error: 'password, name y house_id son requeridos.' });
  try {
    // Validar formato de user_id si viene, o generar uno
    if (user_id) {
      user_id = String(user_id).toUpperCase();
      if (!/^[A-Z]{3}[0-9]{2}$/.test(user_id)) return res.status(400).json({ error: 'user_id inválido. Formato: AAA00' });
    } else {
      // Generar evitando colisiones (intentos limitados)
      for (let i = 0; i < 5; i++) {
        const candidate = generateNeighborId();
        const exists = await pool.query('SELECT 1 FROM neighbors WHERE user_id = $1', [candidate]);
        if (exists.rowCount === 0) { user_id = candidate; break; }
      }
      if (!user_id) return res.status(500).json({ error: 'No se pudo generar user_id único.' });
    }

    // Verificar existencia de la casa
    const house = await pool.query('SELECT 1 FROM houses WHERE id = $1', [house_id]);
    if (house.rowCount === 0) return res.status(400).json({ error: 'house_id no existe.' });

    // Hash de password
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO neighbors (user_id, password, name, house_id, email, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, name, house_id, email, phone',
      [user_id, hashed, name, house_id, email || null, phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'user_id o email ya existe.' });
    }
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar neighbor (solo admin) - permite cambiar name, house_id, email, phone y password
app.put('/neighbors/:user_id', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede modificar vecinos.' });
  const userId = String(req.params.user_id).toUpperCase();
  const { name, house_id, email, phone, password } = req.body;
  if (!name && !house_id && !email && !phone && !password) return res.status(400).json({ error: 'Nada para actualizar.' });
  try {
    const fields: string[] = [];
    const params: any[] = [];
    if (name) { params.push(name); fields.push(`name = $${params.length}`); }
    if (house_id) {
      // validar casa
      const h = await pool.query('SELECT 1 FROM houses WHERE id = $1', [house_id]);
      if (h.rowCount === 0) return res.status(400).json({ error: 'house_id no existe.' });
      params.push(house_id); fields.push(`house_id = $${params.length}`);
    }
    if (email !== undefined) { params.push(email || null); fields.push(`email = $${params.length}`); }
    if (phone !== undefined) { params.push(phone || null); fields.push(`phone = $${params.length}`); }
    if (password) { const hashed = await bcrypt.hash(password, 10); params.push(hashed); fields.push(`password = $${params.length}`); }
    params.push(userId);
    const result = await pool.query(`UPDATE neighbors SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = $${params.length} RETURNING user_id, name, house_id, email, phone`, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Vecino no encontrado.' });
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email ya existe.' });
    }
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar neighbor (solo admin)
app.delete('/neighbors/:user_id', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede eliminar vecinos.' });
  try {
    const result = await pool.query('DELETE FROM neighbors WHERE user_id = $1 RETURNING user_id', [String(req.params.user_id).toUpperCase()]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Vecino no encontrado.' });
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// --- Endpoints de Neighbor (self-service) ---
// Obtener balance del vecino autenticado
app.get('/me/balance', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'neighbor') return res.status(403).json({ error: 'Solo para vecinos.' });
    const userId = String((req as any).user.id).toUpperCase();
    const result = await pool.query('SELECT user_id, total_charges, total_payments, balance FROM neighbor_balances WHERE user_id = $1', [userId]);
    const row = result.rows[0] || { user_id: userId, total_charges: 0, total_payments: 0, balance: 0 };
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Listar cargos por periodo del vecino autenticado (opcional ?period=YYYY-MM-01)
app.get('/me/period-dues', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'neighbor') return res.status(403).json({ error: 'Solo para vecinos.' });
    const userId = String((req as any).user.id).toUpperCase();
    const { period } = (req as any).query as { period?: string };
    if (period) {
      const r = await pool.query('SELECT user_id, period, due_amount FROM neighbor_period_dues WHERE user_id = $1 AND period = $2', [userId, period]);
      return res.json(r.rows);
    }
    const r = await pool.query('SELECT user_id, period, due_amount FROM neighbor_period_dues WHERE user_id = $1 ORDER BY period DESC', [userId]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Listar pagos del vecino autenticado
app.get('/me/payments', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'neighbor') return res.status(403).json({ error: 'Solo para vecinos.' });
    const userId = String((req as any).user.id).toUpperCase();
    const result = await pool.query('SELECT id, amount, method, reference, paid_at, note FROM payments WHERE user_id = $1 ORDER BY paid_at DESC, id DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Registrar un pago del vecino autenticado
app.post('/me/payments', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'neighbor') return res.status(403).json({ error: 'Solo para vecinos.' });
    const userId = String((req as any).user.id).toUpperCase();
    const { amount, method, reference, note, paid_at } = req.body as any;
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return res.status(400).json({ error: 'amount debe ser > 0' });
    const insert = await pool.query(
      'INSERT INTO payments (user_id, amount, method, reference, note, paid_at) VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW())) RETURNING id, amount, method, reference, paid_at, note',
      [userId, parsedAmount, method || null, reference || null, note || null, paid_at || null]
    );
    // Retornar pago y nuevo balance
    const bal = await pool.query('SELECT user_id, total_charges, total_payments, balance FROM neighbor_balances WHERE user_id = $1', [userId]);
    res.status(201).json({ payment: insert.rows[0], balance: bal.rows[0] || { user_id: userId, total_charges: 0, total_payments: parsedAmount, balance: 0 - parsedAmount } });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
