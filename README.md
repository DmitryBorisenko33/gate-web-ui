# Gate Web UI

Веб-интерфейс для гейта на Svelte + Tailwind CSS + Chart.js.

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

Откроется dev сервер на http://localhost:5173

## Сборка

```bash
npm run build
```

Это:
1. Соберет Svelte приложение через Vite
2. Запустит `build.js`, который конвертирует HTML/JS/CSS в C строки
3. Сохранит результат в `../nrf-esp32-gate-idf/main/web_ui.c`

## Структура

- `src/` - исходный код Svelte приложения
  - `routes/` - страницы (Dashboard, NodeTable, NodeGraph)
  - `lib/` - утилиты (api.js, utils.js, stores.js)
  - `App.svelte` - главный компонент с роутингом
- `public/` - статические файлы
- `build.js` - скрипт для конвертации в C код

## API Endpoints

Веб-интерфейс использует следующие endpoints на порту 8081:

- `GET /api/nodes` - список нод
- `GET /api/nodes/{mac}/data?limit=200&offset=0` - данные ноды с пагинацией
- `GET /api/nodes/{mac}/latest` - последние данные ноды
- `GET /api/schema?type={sensorTypeId}` - схема сенсора


