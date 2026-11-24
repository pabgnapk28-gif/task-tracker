const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const STATUSES = ['todo', 'in_progress', 'done'];
const secret = () => process.env.JWT_SECRET;

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    req.userId = jwt.verify(token, secret()).userId;
    next();
  } catch {
    res.status(401).json({ error: 'Невалидный токен' });
  }
};

// Регистрация
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hash, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Пользователь уже существует' });
    }
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const token = jwt.sign({ userId: user.id }, secret(), { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проекты
app.get('/api/projects', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY id', [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/projects', auth, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Введите название проекта' });
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, user_id) VALUES ($1, $2) RETURNING *',
      [name, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Задачи проекта (только владельцу проекта)
app.get('/api/projects/:id/tasks', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE project_id = $1 AND user_id = $2 ORDER BY position, id',
      [req.params.id, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать задачу (проект должен принадлежать пользователю)
app.post('/api/tasks', auth, async (req, res) => {
  const { title, description, project_id, status, position } = req.body;
  if (!title?.trim() || !project_id) {
    return res.status(400).json({ error: 'Укажите название задачи и проект' });
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }
  try {
    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2', [project_id, req.userId]);
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    const result = await pool.query(
      `INSERT INTO tasks (title, description, project_id, status, position, user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title.trim(), description || null, project_id, status || 'todo', position || 0, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить задачу (частично; в т.ч. смена статуса при drag-and-drop)
app.put('/api/tasks/:id', auth, async (req, res) => {
  const { title, description, status, position } = req.body;
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }
  try {
    const result = await pool.query(
      `UPDATE tasks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         position = COALESCE($4, position),
         updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [title ?? null, description ?? null, status ?? null, position ?? null,
       req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить задачу
app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }
    res.json({ message: 'Удалено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = app;
