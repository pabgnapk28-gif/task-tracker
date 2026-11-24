#!/bin/bash
# Запуск: bash publish.sh https://github.com/ВАШ_ЛОГИН/task-tracker.git
# Создаёт историю коммитов с ветками feature/* и отправляет на GitHub.
set -e
REMOTE="$1"
[ -z "$REMOTE" ] && { echo "Укажите URL репозитория"; exit 1; }

git init -b main
git add .gitignore README.md
git commit -m "docs: README и .gitignore"
git remote add origin "$REMOTE"
git push -u origin main

git checkout -b feature/backend-auth
git add backend/package.json backend/.env.example backend/db.js backend/schema.sql backend/app.js backend/server.js
git commit -m "feat(backend): API, авторизация, проекты и задачи"
git push -u origin feature/backend-auth
git checkout main && git merge --no-ff feature/backend-auth -m "Merge feature/backend-auth" && git push

git checkout -b feature/tests
git add backend/tests
git commit -m "test: тесты API на Jest и Supertest"
git push -u origin feature/tests
git checkout main && git merge --no-ff feature/tests -m "Merge feature/tests" && git push

git checkout -b feature/frontend-kanban
git add frontend
git commit -m "feat(frontend): канбан-доска с drag-and-drop"
git push -u origin feature/frontend-kanban
git checkout main && git merge --no-ff feature/frontend-kanban -m "Merge feature/frontend-kanban" && git push
