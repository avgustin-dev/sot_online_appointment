# Контракт для Java-бэкенда

**Начните здесь.** Реализуйте `openapi.yaml`. Какие экраны какие методы дергают — `ENDPOINTS.md`. Клиент, который уже зовёт API — `src/api/client.ts`.

Цифровая платформа приёма граждан руководством Верховного суда КР.

Фронт: Next.js. Этот каталог — то, что нужно реализовать на Spring (или аналоге). Спека: `openapi.yaml`. Снимок текстов: папка `content/` в корне репозитория.

Пока `NEXT_PUBLIC_API_URL` пуст, фронт работает локально. Когда URL задан, клиент — `src/api/client.ts`.

## База

| | |
| --- | --- |
| Prefix | `/api/v1` |
| JSON | camelCase, UTF-8 |
| Даты | `YYYY-MM-DD` |
| Дата-время | ISO-8601 (`2026-04-16T09:00:00+06:00`) |
| Время слота | `HH:mm` |
| Часовой пояс | `Asia/Bishkek` |
| Auth | `Authorization: Bearer <jwt>` |
| Ошибка | `{ "status": 409, "code": "SLOT_UNAVAILABLE", "message": "…" }` |

PIN записи — 4 цифры, **только в ответе на POST /public/appointments**. Дальше хранить hash. В GET PIN не возвращать.

Восстановление кодов: `POST /public/recover-codes` (не `/appointments/{code}`), чтобы Spring не принял `recover` за код записи.

## Это не электронный суд

На приёме **нельзя** обсуждать конкретные дела и законность актов. Предмет: организация судопроизводства, деятельность суда, предложения по законодательству. Дерево допуска (`eligibility-tree.json`) отсекает запрещённые темы на записи.

## Поток

```
заявка (pending_review)
  → приёмная подтверждает (confirmed) или отклоняет (rejected)
  → карточка обращения
  → подготовка (under_review → ready_for_reception)
  → личный приём (протокол + поручение)
  → контроль исполнения
  → ответ гражданину
  → оценка приёма
```

Запись и карточка связаны: `appointment.id` ↔ `appeal.appointmentId`, общий `code` вида `VS-2026-XXXX`.

### Статус записи `AppointmentStatus`

`pending_review` | `confirmed` | `rescheduled` | `cancelled` | `rejected` | `completed` | `no_show`

### Этап карточки `AppealStage`

`registered` → `under_review` → `ready_for_reception` → `reception_done` → `in_control` → `closed`  
(+ `cancelled`)

`closed` ставится сразу при отправке финального ответа гражданину (`POST /staff/appeals/{id}/answer`) — это и есть завершение обращения. Оценка гражданина (`POST /public/appeals/{code}/feedback`) не меняет этап, это отдельная необязательная обратная связь.

При отклонении/отмене записи этап карточки = `cancelled`. При `completed` → `reception_done`. При `no_show` → `cancelled`.

## Слоты

Параметры календаря (дефолт в `content/calendar-rules.json` + настройки):

- длительность 20 мин, пауза 5 мин
- схема: 08:00–08:20, 08:25–08:45, …
- горизонт записи — `bookingHorizonDays` (45)
- слот занят, если есть запись на ту же дату, `targetId` и `slotStart`, статус не `cancelled`/`rejected`
- у руководства своё окно: `leadership[].weekdays`, `startMinutes`, `endMinutes` (минуты от полуночи; четверг = 4, воскресенье = 0)

Свободные слоты считает **бэкенд**. Фронт только рисует ответ `GET /public/slots`.
При переносе записи передаётся `excludeAppointmentId`, чтобы текущий слот оставался доступен.

## Роли (`StaffUser.role`)

| role | Кабинет |
| --- | --- |
| `reception` | заявки, карточки, подготовка |
| `leadership` | приём, аналитика |
| `responsible` | контроль поручений |
| `admin` | всё + CMS (сайт, дерево, опросник, календарь) |

Гражданин без учётки: код + PIN.

## Публичные страницы фронта

Эти URL указывать в письмах и на талоне:

| Путь | Назначение |
| --- | --- |
| `/electronic-appointment` | Электронная запись |
| `/appointment-status` | Статус, перенос, отмена (код + PIN) |
| `/service-evaluation` | Оценка сервиса |
| `/service-evaluation/{code}` | Оценка по коду записи |
| `/appointment-rules` | Правила записи |
| `/` | Проверка статуса по коду, восстановление кода |

Старые пути (`/book`, `/my-appointment`, `/feedback`, `/rules`) редиректятся.

## Тексты

Сид из `content/`:

| JSON | Куда |
| --- | --- |
| `site.json` | `GET /public/bootstrap` → `site`, `PUT /staff/content` |
| `eligibility-tree.json` | `eligibilityTree` / `PUT /staff/eligibility` `{ "nodes": [...] }` |
| `survey.json` | опросник |
| `ui.ru.json`, `ui.ky.json` | можно отдать с bootstrap позже; сейчас во фронте |
| `dictionaries.json` | справочники статусов/категорий |
| `booking-rules.json` | дублируется в `site.rules` |

Jackson: игнорировать неизвестные поля (`FAIL_ON_UNKNOWN_PROPERTIES = false`).

## Кабинет → API

Страница `/admin/help` — только фронт, эндпоинта нет. «Сегодня» (`/admin`) собирается из списков заявок и карточек.

| Экран | Методы |
| --- | --- |
| Вход `/admin/login` | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Заявки `/admin/inbox` | `GET /staff/appointments?status=pending_review`, `POST …/confirm`, `POST …/reject` |
| Приём `/admin/reception` | `GET /staff/appeals?stage=ready_for_reception`, `POST …/reception` |
| Календарь `/admin/calendar` | `GET /staff/appointments`, `GET\|PUT /staff/calendar`, `POST …/status`, `…/cancel`, `…/restore` |
| Карточки `/admin/appeals` | `GET /staff/appeals`, `GET /staff/appeals/{id}` |
| Карточка `/admin/appeals/{id}` | `POST …/prep` (анализ), `POST …/stage` (в т.ч. начало анализа `under_review`), `POST …/ready`, `PATCH /staff/appointments/{id}`, `POST …/reschedule`, `POST …/status` |
| Поручения `/admin/control` | `POST …/control`, `POST …/assignment-status`, `POST …/answer` |
| Мониторинг `/admin/analytics` | `GET /staff/analytics` |
| Сайт `/admin/content` | `GET\|PUT /staff/content` |
| Допуск `/admin/eligibility` | `GET\|PUT /staff/eligibility` |
| График `/admin/settings` | `GET\|PUT /staff/calendar` |
| Опросник `/admin/survey` | `GET\|PUT /staff/survey` |
| Результаты `/admin/survey/results` | `GET /staff/survey/responses` |
| Выбор ответственного | `GET /staff/users` |

`startPrep` на фронте = `POST /staff/appeals/{id}/stage` с `{ "stage": "under_review" }`. Вопросы опросника сохраняются целиком через `PUT /staff/survey`, не по одному.

Не в v1 контракта (бэкенд может добавить позже): CRUD сотрудников, смена пароля, удаление ответов анкеты, вложения файлов.

## Почта и талон

SMS не используется. QR талона кодирует `{SITE}/appointment-status?code={CODE}` (без PIN). Уведомление пишется в карточку (`notifications[]`, канал `email` если гражданин указал почту, иначе `system`) и показывается на талоне и при проверке статуса по коду. Реальную отправку письма делает бэкенд.

## Коды ошибок (ориентир)

| HTTP | code | Когда |
| --- | --- | --- |
| 400 | `VALIDATION` | ФИО неполное, >2 сопровождающих |
| 401 | `UNAUTHORIZED` | нет/протух JWT |
| 403 | `FORBIDDEN` | роль не позволяет |
| 404 | `NOT_FOUND` | нет записи/карточки |
| 409 | `SLOT_UNAVAILABLE` | слот занят или день закрыт |
| 409 | `INVALID_PIN` | неверный PIN |
| 409 | `NOT_CANCELLABLE` | приём уже проведён |
| 422 | `INELIGIBLE` | тема вне допуска (если проверяете на бэке) |

## Генерация Spring

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/backend/openapi.yaml \
  -g spring \
  -o ../sot-reception-api \
  --additional-properties=useSpringBoot3=true,interfaceOnly=true,dateLibrary=java8,openApiNullable=false
```

Сущности удобнее писать руками по схемам, чем генерировать весь сервис.

## Примеры

Файлы в `docs/backend/examples/`.
