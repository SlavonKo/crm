# MotoWorkshop CRM

Внутрішня CRM-система для мотосервісу. Управління замовленнями, клієнтами, складом запчастин та розкладом.

## Стек

| Шар | Технологія |
|-----|-----------|
| Фреймворк | Angular 22 (standalone components) |
| State | Angular Signals (`signal`, `computed`) |
| UI | Angular Material + Tailwind CSS |
| AI | Groq API (`llama-3.3-70b-versatile`) |
| Валідація | Zod |
| i18n | Transloco (uk / en) |
| Mock-сервер | json-server (`localhost:3000`) |
| Бекенд (план) | Node.js + Express + Firestore |
| Авторизація (план) | Firebase Phone Auth |

---

## Швидкий старт

```bash
# 1. Встановити залежності
npm install

# 2. Скопіювати змінні оточення
cp .env.local.example .env.local
# Заповнити .env.local реальними ключами (Firebase, Groq)

# 3. Запустити фронт + mock-сервер разом
npm run dev
# Angular → http://localhost:4200
# json-server → http://localhost:3000
```

### Окремий запуск

```bash
# Тільки Angular dev-сервер
npm run start

# Тільки mock-сервер
npm run mock-server

# Production build
npm run build
```

---

## Змінні оточення

Скопіюй `.env.local.example` в `.env.local` та заповни:

```env
# Firebase
NG_APP_FIREBASE_API_KEY=
NG_APP_FIREBASE_AUTH_DOMAIN=
NG_APP_FIREBASE_PROJECT_ID=
NG_APP_FIREBASE_STORAGE_BUCKET=
NG_APP_FIREBASE_MESSAGING_SENDER_ID=
NG_APP_FIREBASE_APP_ID=

# Groq AI
NG_APP_GROQ_API_KEY=
NG_APP_GROQ_MODEL=llama-3.3-70b-versatile

# App
NG_APP_ENV=development
```

> `.env.local` у `.gitignore` — ніколи не комітити.

---

## Структура проекту

```
src/app/
├── core/
│   ├── auth/            # AuthService, authGuard, adminGuard
│   └── config.service   # Читання env-змінних
├── data/
│   ├── enums/           # OrderStatus, UserRole, MotorcycleType
│   ├── mock/            # In-memory mock (клієнти, замовлення, склад, календар)
│   ├── models/          # TypeScript-інтерфейси всіх доменних моделей
│   └── schemas/         # Zod-схеми для валідації AI-відповідей та API
├── features/
│   ├── ai-assistant/    # AiService (Groq), DynamicFormService
│   ├── auth/            # Login, Unauthorized сторінки
│   ├── calendar/        # CalendarStore, перегляд тижня/дня/місяця
│   ├── clients/         # ClientsStore, список/деталь клієнта, мотоцикли
│   ├── inventory/       # InventoryStore, склад запчастин
│   └── orders/          # OrdersStore, список/деталь/редагування замовлення
└── shared/
    ├── components/      # Toolbar, ThemeSwitch, LangSwitch
    └── pipes/           # UahPipe
```

---

## Модулі / функціонал

### Замовлення (`/orders`)
- Список замовлень з фільтром за статусом
- Деталь замовлення: запчастини, трудовитрати, підсумок вартості
- Редагування з AI-допомогою (генерація чернетки по опису)
- Генерація HTML-квитанції через AI
- Статуси: `draft → pending → in_progress → waiting_parts → completed → invoiced → cancelled`
- Іконка будильника в тулбарі — замовлення з датами на найближчі 7 днів

### Клієнти (`/clients`)
- Список клієнтів з пошуком
- Деталь клієнта: особисті дані, мотоцикли, історія замовлень
- Додавання/редагування клієнтів та мотоциклів
- Архівація мотоциклів (видалення клієнтів заборонено)

### Склад (`/inventory`)
- Список запчастин з пошуком по назві/SKU/бренду
- Індикатор низького залишку (`quantity ≤ minThreshold`)
- CRUD запчастин, коригування кількості

### Календар (`/calendar`)
- Перегляд подій по дню/тижню/місяцю
- Події можуть бути прив'язані до замовлення (`orderId`)
- Навігація по тижнях/днях

### AI-асистент (`/ai`)
- Генерація чернетки замовлення з натуральної мови
- Генерація HTML-квитанції по завершеному замовленню
- Діагностичне резюме по симптомах

---

## Авторизація (прототип)

Зараз: whitelist з номерів телефонів у `auth.service.ts`. Сесія зберігається в `sessionStorage`.

Планується: Firebase Phone Auth (OTP). Публічний API (`login`, `signOut`, `currentUser`, `isAuthenticated`) вже відповідає фінальній версії — перемикання буде прозорим.

---

## AI-інтеграція (Groq)

Пряме звернення з фронту до `api.groq.com`. Три сценарії:

| Метод | Вхід | Вихід |
|-------|------|-------|
| `generateWorkOrderDraft` | Текстовий опис роботи | `AiWorkOrderDraft` (JSON, Zod-validated) |
| `generateReceiptHtml` | `WorkOrder` + `Client` | HTML-фрагмент квитанції |
| `generateDiagnosticSummary` | Текст симптомів | Текст до 200 слів |

> Планується перенести AI-запити на Node.js бекенд (проксі), щоб приховати API-ключ.

---

## Telegram-бот

Іконка в тулбарі зарезервована. Реалізація — наступний етап (підключення через Node.js бекенд).

---

## Тести

```bash
npm run test
```

Karma + Jasmine. Поточне покриття мінімальне (smoke-тести компонентів).
