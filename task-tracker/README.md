# Трекер задач

Приложение для управления задачами с канбан-доской (вариант C).

## Функционал
- Регистрация и вход (JWT, пароли хешируются bcrypt)
- Проекты
- Задачи: создание, удаление, смена статуса
- Drag-and-drop между колонками To Do / В работе / Готово
- Пользователь видит только свои проекты и задачи

## Стек
- Backend: Node.js, Express, PostgreSQL, JWT
- Frontend: React, Vite, Axios
- Тесты: Jest, Supertest

## Запуск

### 1. База данных
```bash
createdb tasktracker
psql -d tasktracker -f backend/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # впишите свой пароль БД и JWT_SECRET
npm install
npm start
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Откройте http://localhost:5173

## Тесты
```bash
cd backend
npm test
```

## API
| Метод | URL | Описание |
|---|---|---|
| POST | /api/register | Регистрация |
| POST | /api/login | Вход, возвращает токен |
| GET/POST | /api/projects | Проекты |
| GET | /api/projects/:id/tasks | Задачи проекта |
| POST | /api/tasks | Создать задачу |
| PUT | /api/tasks/:id | Изменить задачу / статус |
| DELETE | /api/tasks/:id | Удалить задачу |
