process.env.JWT_SECRET = 'test_secret';

jest.mock('../db', () => ({ query: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const app = require('../app');

const token = jwt.sign({ userId: 1 }, 'test_secret');
const bearer = { Authorization: `Bearer ${token}` };

beforeEach(() => pool.query.mockReset());

describe('Авторизация', () => {
  test('регистрация с пустыми полями -> 400', async () => {
    const res = await request(app).post('/api/register').send({});
    expect(res.status).toBe(400);
  });

  test('регистрация с коротким паролем -> 400', async () => {
    const res = await request(app).post('/api/register')
      .send({ email: 'a@b.c', password: '123', name: 'A' });
    expect(res.status).toBe(400);
  });

  test('успешная регистрация -> 201', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'new@test.com', name: 'T' }] });
    const res = await request(app).post('/api/register')
      .send({ email: 'new@test.com', password: '123456', name: 'T' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new@test.com');
  });

  test('повторная регистрация -> 409', async () => {
    pool.query.mockRejectedValueOnce({ code: '23505' });
    const res = await request(app).post('/api/register')
      .send({ email: 'dup@test.com', password: '123456', name: 'T' });
    expect(res.status).toBe(409);
  });

  test('вход с неверными данными -> 401', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/login')
      .send({ email: 'x@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('успешный вход возвращает токен', async () => {
    const hash = await bcrypt.hash('123456', 4);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', name: 'T', password: hash }],
    });
    const res = await request(app).post('/api/login')
      .send({ email: 'test@test.com', password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('Проекты и задачи', () => {
  test('проекты без токена -> 401', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  test('проекты с невалидным токеном -> 401', async () => {
    const res = await request(app).get('/api/projects')
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  test('проекты с токеном -> 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'P' }] });
    const res = await request(app).get('/api/projects').set(bearer);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('создание проекта без названия -> 400', async () => {
    const res = await request(app).post('/api/projects').set(bearer).send({});
    expect(res.status).toBe(400);
  });

  test('задача в чужом проекте -> 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/tasks').set(bearer)
      .send({ title: 'T', project_id: 99 });
    expect(res.status).toBe(404);
  });

  test('создание задачи -> 201', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, title: 'T', status: 'todo' }] });
    const res = await request(app).post('/api/tasks').set(bearer)
      .send({ title: 'T', project_id: 1 });
    expect(res.status).toBe(201);
  });

  test('недопустимый статус -> 400', async () => {
    const res = await request(app).put('/api/tasks/1').set(bearer)
      .send({ status: 'weird' });
    expect(res.status).toBe(400);
  });

  test('обновление чужой задачи -> 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).put('/api/tasks/1').set(bearer)
      .send({ status: 'done' });
    expect(res.status).toBe(404);
  });

  test('удаление задачи -> 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).delete('/api/tasks/1').set(bearer);
    expect(res.status).toBe(200);
  });
});
