# Архитектура фронта (приём граждан, Верховный суд КР)

Цифровая платформа **личного приёма граждан руководством**. Это не электронный суд и не подача дел: на приёме нельзя обсуждать конкретные судебные акты.

Фронт готов к подключению Java-бэкенда. Контракт, от которого нужно генерировать API:

| Файл | Назначение |
|------|------------|
| `docs/backend/openapi.yaml` | OpenAPI 3, источник правды для эндпоинтов |
| `docs/backend/ENDPOINTS.md` | Таблица: экран → метод, что реализовать |
| `docs/backend/README.md` | Правила домена, роли, коды ошибок |
| `src/api/client.ts` | Клиент, который фронт уже вызывает |
| `src/api/paths.ts` | Пути `/api/v1/...` |
| `src/api/dto.ts` | Типы запросов/ответов (camelCase) |
| `content/` | Сид текстов, дерева допуска, календаря, опросника |

Пока `NEXT_PUBLIC_API_URL` пуст, фронт работает на локальном контуре (Zustand). Когда URL задан, все публичные и служебные действия идут в `backend.*`.

---

## Стек

| Слой | Технология |
|------|------------|
| Framework | **Next.js 16.3** App Router + Turbopack |
| UI | **React 19** + TypeScript |
| Стили | Tailwind 3 + токены `court.*` |
| Состояние | Zustand 5. С API — сессия в persist, данные с сервера |
| Даты | date-fns, слоты 20 мин + 5 мин пауза |
| Node | 20 / 22 / 24 LTS |

Язык интерфейса по умолчанию — **кыргызский**, переключатель RU/KY (`vs-kr-lang`). Тон — официальный государственный.

---

## Режимы данных

```
NEXT_PUBLIC_API_URL пуст
  → локальный контур: content/ + Zustand
  → учебные записи кабинета, если NEXT_PUBLIC_DEMO не false (только dev)

NEXT_PUBLIC_API_URL=https://host/api/v1
  → GET /public/bootstrap при старте
  → JWT в sessionStorage, GET /auth/me + списки кабинета
  → слоты: GET /public/dates и GET /public/slots (фронт не считает занятость)
  → мутации: src/lib/storeRemote.ts → src/api/client.ts
```

PIN выдаётся **только** в `POST /public/appointments`. GET его не возвращает. JWT: `Authorization: Bearer`. Часовой пояс: `Asia/Bishkek`.

---

## Публичные маршруты

Эти URL указывать в письмах и на талоне:

| Путь | Назначение |
|------|------------|
| `/` | Главная: статус по коду, восстановление кода по телефону |
| `/electronic-appointment` | Электронная запись (мастер) |
| `/appointment-status` | Статус, перенос, отмена (код + PIN) |
| `/service-evaluation` | Оценка сервиса |
| `/service-evaluation/{code}` | Оценка по коду |
| `/appointment-rules` | Правила записи |
| `/survey` | Заглушка: заполнение — opros.sot.kg |

Старые пути редиректятся в `next.config.mjs`: `/book`, `/my-appointment`, `/feedback`, `/rules`, `/process`.

Админка **не** в публичном меню: только `/admin/login`.

---

## Служебный кабинет

Вход и домашний экран зависят от **роли**, не от учебного логина.

| role | После входа | Разделы |
|------|-------------|---------|
| `admin` | `/admin` | всё, включая CMS |
| `reception` | `/admin/inbox` при необработанных заявках | заявки, карточки, подготовка |
| `leadership` | `/admin/reception` | приём, аналитика |
| `responsible` | `/admin/control` | поручения |

| Путь | API |
|------|-----|
| `/admin/login` | `POST /auth/login`, `GET /auth/me` |
| `/admin` | списки заявок и карточек |
| `/admin/inbox` | confirm / reject |
| `/admin/appeals`, `/admin/appeals/{id}` | карточка, prep, stage, статус записи |
| `/admin/reception` | протокол приёма |
| `/admin/control` | журнал, статус поручения, ответ |
| `/admin/calendar` | записи по дням, неявка / отмена / возврат |
| `/admin/analytics` | на фронте из списков; опционально `GET /staff/analytics` |
| `/admin/settings` | `PUT /staff/calendar` |
| `/admin/content` | `PUT /staff/content` |
| `/admin/eligibility` | `PUT /staff/eligibility` `{ nodes }` |
| `/admin/survey` | `PUT /staff/survey` (весь опросник) |
| `/admin/help` | только фронт |

---

## Цикл обращения

```
заявка pending_review
  → confirmed | rejected
  → карточка registered
  → under_review → ready_for_reception
  → приём (протокол + поручение)
  → in_control → closed (ответ гражданину = submitFinalAnswer)
  → оценка /service-evaluation/{code} (необязательная обратная связь,
    не меняет этап — closed уже стоит)
```

Связь: `appointment.id` ↔ `appeal.appointmentId`, общий `code` вида `VS-2026-XXXX`.

Статусы записи: `pending_review` | `confirmed` | `rescheduled` | `cancelled` | `rejected` | `completed` | `no_show`.

Этапы карточки: `registered` → `under_review` → `ready_for_reception` → `reception_done` → `in_control` → `closed` (+ `cancelled`).

---

## Слоты

Считает **бэкенд**. Параметры: `content/calendar-rules.json` и `PUT /staff/calendar`.

- 20 мин приём + 5 мин пауза: 08:00–08:20, 08:25–08:45, …
- горизонт `bookingHorizonDays`
- у руководства своё окно (`leadership[].weekdays`, минуты от полуночи)
- при переносе: `GET /public/slots?excludeAppointmentId=`

---

## Структура `src/`

```
src/
  app/(public)/     электронная запись, статус, оценка, правила
  app/admin/        кабинет
  api/              client, paths, dto, http, session
  components/       booking/SlotPicker, layout, staff, ui
  content           (корень репо) сид для bootstrap
  lib/store.ts      Zustand + bootstrap
  lib/storeRemote.ts вызовы API при заданном URL
  lib/routes.ts     канонические публичные пути
```

---

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev        # :3000
npm run build
```

Служебный кабинет: http://localhost:3000/admin

Учётные записи сотрудников выдаёт сервер. Локальный контур без API — только для разработки фронта (`NEXT_PUBLIC_DEMO`).
