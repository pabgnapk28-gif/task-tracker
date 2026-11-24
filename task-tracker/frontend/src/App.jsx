import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const COLUMNS = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'В работе' },
  { status: 'done', title: 'Готово' },
];

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(load('user'));
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [dragId, setDragId] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null); setUser(null); setProjects([]); setSelected(null); setTasks([]);
  }, []);

  const handleError = useCallback((err) => {
    if (err.response?.status === 401 && token) return logout();
    setError(err.response?.data?.error || 'Ошибка соединения с сервером');
  }, [token, logout]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects`, { headers });
      setProjects(res.data);
    } catch (e) { handleError(e); }
  }, [token]);

  const loadTasks = useCallback(async (id) => {
    try {
      const res = await axios.get(`${API}/projects/${id}/tasks`, { headers });
      setTasks(res.data);
    } catch (e) { handleError(e); }
  }, [token]);

  useEffect(() => { if (token) loadProjects(); }, [token, loadProjects]);
  useEffect(() => { if (selected) loadTasks(selected.id); }, [selected, loadTasks]);

  const submitAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await axios.post(`${API}/register`, form);
        setIsRegister(false);
        setError('Регистрация успешна. Теперь войдите.');
      } else {
        const res = await axios.post(`${API}/login`, { email: form.email, password: form.password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (e) { handleError(e); }
  };

  const createProject = async () => {
    const name = prompt('Название проекта:');
    if (!name?.trim()) return;
    try {
      await axios.post(`${API}/projects`, { name }, { headers });
      loadProjects();
    } catch (e) { handleError(e); }
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    try {
      await axios.post(`${API}/tasks`,
        { title: newTitle, project_id: selected.id, status: 'todo' }, { headers });
      setNewTitle('');
      loadTasks(selected.id);
    } catch (e) { handleError(e); }
  };

  const moveTask = async (id, status) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t))); // сразу обновляем UI
    try {
      await axios.put(`${API}/tasks/${id}`, { status }, { headers });
    } catch (e) { handleError(e); loadTasks(selected.id); }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`${API}/tasks/${id}`, { headers });
      loadTasks(selected.id);
    } catch (e) { handleError(e); }
  };

  if (!token) {
    const input = { display: 'block', width: '100%', marginBottom: 10, padding: 8, boxSizing: 'border-box' };
    return (
      <div style={{ maxWidth: 400, margin: '50px auto', fontFamily: 'sans-serif' }}>
        <h2>{isRegister ? 'Регистрация' : 'Вход'}</h2>
        <form onSubmit={submitAuth}>
          {isRegister && (
            <input style={input} placeholder="Имя" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          )}
          <input style={input} type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={input} type="password" placeholder="Пароль (мин. 6 символов)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          <button type="submit" style={{ padding: '10px 20px' }}>
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}
        <button onClick={() => { setIsRegister(!isRegister); setError(''); }} style={{ marginTop: 10 }}>
          {isRegister ? 'Уже есть аккаунт' : 'Нет аккаунта?'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Трекер задач</h1>
        <div>Привет, {user?.name}! <button onClick={logout}>Выйти</button></div>
      </div>
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}

      <h3>Проекты</h3>
      <button onClick={createProject}>+ Новый проект</button>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSelected(p)}
            style={{
              padding: 10, border: 'none', cursor: 'pointer',
              background: selected?.id === p.id ? '#007bff' : '#f0f0f0',
              color: selected?.id === p.id ? 'white' : 'black',
            }}>
            {p.name}
          </button>
        ))}
      </div>

      {selected && (
        <div>
          <h3>Задачи: {selected.name}</h3>
          <input placeholder="Новая задача" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTask()}
            style={{ padding: 8, width: 300 }} />
          <button onClick={createTask} style={{ marginLeft: 10, padding: 8 }}>Добавить</button>
          <p style={{ color: '#666', fontSize: 13 }}>Перетаскивайте карточки между колонками.</p>

          <div style={{ display: 'flex', gap: 20 }}>
            {COLUMNS.map((col) => (
              <div key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) moveTask(dragId, col.status); setDragId(null); }}
                style={{ flex: 1, background: '#f5f5f5', padding: 10, minHeight: 300 }}>
                <h4>{col.title}</h4>
                {tasks.filter((t) => t.status === col.status).map((task) => (
                  <div key={task.id} draggable
                    onDragStart={() => setDragId(task.id)}
                    style={{ background: 'white', padding: 10, marginBottom: 10, borderRadius: 4, cursor: 'grab' }}>
                    <strong>{task.title}</strong>
                    {task.description && <div style={{ fontSize: 12, color: '#666' }}>{task.description}</div>}
                    <button onClick={() => deleteTask(task.id)} style={{ marginTop: 8, color: 'red' }}>✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
