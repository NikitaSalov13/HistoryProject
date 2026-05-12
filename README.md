# Тогда / Сейчас

Русскоязычный образовательный веб-сервис с интерактивной картой Санкт-Петербурга для сравнения архивных фото периода блокады Ленинграда (1941-1944) и современного вида мест.

## Что реализовано

- Публичный режим:
- интерактивная карта с маркерами и кластеризацией;
- фильтры по типам и поиск по названию/адресу;
- карточка места с адаптацией под desktop/mobile;
- сравнение фото: слайдер на desktop, вкладки + compare на mobile;
- deep-link карточки через `/?place=<id>`.
- Админский режим:
- вход по логину/паролю;
- страница `/admin` с управлением местами;
- создание, редактирование и удаление мест;
- загрузка фото в `public/uploads` и выбор из списка файлов;
- предпросмотр кадрирования в админке (масштаб и позиция X/Y для каждой фотографии);
- дополнительный предпросмотр «Тогда/Сейчас» со слайдером (рендер как у пользователя);
- поля для описания, координат, источников и статуса верификации;
- защищённые мутации API (только для администратора).

## API

- `GET /api/places` — список мест (`type`, `q`, `bbox`, `north/south/east/west`).
- `POST /api/places` — добавить место (только админ).
- `GET /api/places/:id` — карточка места.
- `PUT /api/places/:id` — обновить место (только админ).
- `DELETE /api/places/:id` — удалить место (только админ).
- `GET /api/types` — типы мест.
- `POST /api/auth/login` — вход администратора.
- `POST /api/auth/logout` — выход администратора.
- `GET /api/admin/media` — список загруженных изображений (только админ).
- `POST /api/admin/media` — загрузить изображение в `public/uploads` (только админ).

## Данные

- Основное хранилище: `data/places.json`.
- Если файл отсутствует, он создаётся автоматически из seed-данных `lib/data/places.ts`.
- Загруженные изображения из админки: `public/uploads/*` (выдаются как `/uploads/<filename>`).

## Конфигурация окружения

Скопируйте `.env.example` в `.env` и задайте значения:

```bash
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin12345
ADMIN_SESSION_SECRET=replace-with-long-random-secret
```

Для production обязательно замените `ADMIN_PASSWORD` и `ADMIN_SESSION_SECRET`.
Для ключа Яндекс Карт обязательно добавьте `localhost/домен` в Restriction by HTTP Referer в кабинете Яндекс.

## Локальный запуск

```bash
npm install
npm run dev
```

Открыть:

- публичный интерфейс: `http://localhost:3000`
- админ-панель: `http://localhost:3000/admin/login`

## Быстрый запуск для Windows (рекомендуется)

В корне проекта запустите:

- `start-dev.bat` (двойной клик), или
- `npm run dev:easy`.

Что делает автоматический запуск:

- проверяет наличие Node.js;
- добавляет путь к Node в текущую сессию;
- при необходимости создает `.env` из `.env.example`;
- при отсутствии `node_modules` делает `npm install`;
- выбирает свободный порт (3000, если свободен; иначе 3001/3002/...);
- выводит точный URL в консоль и открывает браузер.

## Проверки

```bash
npm run lint
npm run test
npm run build
```

## Технологии

- `Next.js (App Router) + TypeScript + React`
- `Tailwind CSS`
- `Yandex Maps JavaScript API v3 (reactify + clusterer)`
- `Vitest` (unit tests)

## Структура

- `app/page.tsx` — публичная карта.
- `app/about/page.tsx` — страница «О проекте».
- `app/admin/login/page.tsx` — вход администратора.
- `app/admin/page.tsx` — админ-панель.
- `components/map/*` — карта и клиентская логика.
- `components/admin/*` — UI админки.
- `app/api/*` — API роуты.
- `lib/server/*` — серверные утилиты (auth, валидация, repository).
- `data/places.json` — текущее хранилище данных.
