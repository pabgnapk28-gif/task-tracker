require('dotenv').config();
const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.error('Не задан JWT_SECRET. Скопируйте .env.example в .env');
  process.exit(1);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
