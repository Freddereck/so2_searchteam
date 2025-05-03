# SO2 Teammates — Telegram WebApp для поиска тиммейтов

Современное приложение для поиска тиммейтов в игре Standoff 2 через Telegram WebApp.
Работает на Next.js, TailwindCSS, MongoDB, поддерживает быстрый мессенджер между игроками.

---

## 🚀 Быстрый старт

### 1. Клонируй репозиторий

```bash
git clone https://github.com/Freddereck/so2_searchteam.git
cd so2_searchteam
```

### 2. Установи зависимости

```bash
npm install
```

### 3. Настрой переменные окружения

Создай файл `.env.local` в корне проекта и добавь туда строку подключения к MongoDB:

```
MONGODB_URI=your_mongodb_connection_string
```
- Пример для MongoDB Atlas:  
  `MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/so2?retryWrites=true&w=majority`

### 4. Запусти сервер разработки

```bash
npm run dev
```
- Открой [http://localhost:3000](http://localhost:3000) в браузере.

---

## ⚡️ WebSocket сервер для мгновенного чата

Для работы мгновенного чата нужен отдельный WebSocket сервер.

1. Запусти сервер в отдельном терминале:
   ```bash
   node socket-server.js
   ```
   - По умолчанию он работает на порту 3001.

2. Если сервер на другом хосте — измени адрес в файле `app/components/Chat.tsx`:
   ```js
   const socket = io('http://localhost:3001');
   ```

---

## 🛠️ Структура проекта

- `/app` — основной код Next.js (страницы, компоненты)
- `/models` — схемы MongoDB (Mongoose)
- `/lib` — вспомогательные функции (например, подключение к MongoDB)
- `/public` — статические файлы (картинки, фон)
- `/socket-server.js` — WebSocket сервер для чата

---

## 📝 Основные возможности

- Авторизация через Telegram WebApp
- Поиск и фильтрация тиммейтов по MMR, верификации и статусу
- Создание и редактирование анкеты
- Приватность: можно скрывать Telegram username и Game ID
- Встроенный мессенджер между игроками (быстрые сообщения)
- Уведомления о новых сообщениях
- Админ-панель для управления пользователями, апелляциями и логами сообщений
- Адаптивный дизайн для мобильных

---

## 🧑‍💻 Для разработчиков

- Используется Next.js 15, React 19, TailwindCSS 4, MongoDB (Mongoose), socket.io, SWR
- Для мгновенного чата нужен запущенный WebSocket сервер (`socket-server.js`)
- Все основные настройки — через `.env.local`

---

## ❓ Вопросы

Если что-то не работает или есть вопросы — смотри комментарии в коде или пиши в Issues на GitHub.

---

**Удачи!**  
Проект готов к запуску и дальнейшему развитию 🚀 