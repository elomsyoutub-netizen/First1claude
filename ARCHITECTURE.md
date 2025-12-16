# АРХИТЕКТУРА СИСТЕМЫ

## Serverless Backend для продажи цифровых товаров

### Стек технологий
- Parse Server Cloud Code (Serverless)
- Parse Database (MongoDB)
- Telegram Bot API
- Node.js

### Компоненты

```
┌─────────────┐
│   Frontend  │ (Static Site)
│   (HTML/JS) │
└──────┬──────┘
       │ REST API
       ▼
┌─────────────────────────────────┐
│     Parse Cloud Code            │
│  ┌──────────────────────────┐   │
│  │  Cloud Functions:        │   │
│  │  - createOrder           │   │
│  │  - confirmTestPayment    │   │
│  │  - getProducts           │   │
│  │  - getPartnerStats       │   │
│  │  - getAdminStats         │   │
│  │  - telegramWebhook       │   │
│  └──────────────────────────┘   │
└─────────────┬───────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌─────────┐      ┌──────────────┐
│ MongoDB │      │ Telegram Bot │
│ (Parse) │      │     API      │
└─────────┘      └──────────────┘
```

## Поток данных

### 1. Создание заказа
```
Frontend → createOrder() → Order (status: created)
```

### 2. Оплата
```
Frontend → confirmTestPayment() →
  → Order (status: paid)
  → Доставка товара
  → Начисление партнёру
  → Уведомление в Telegram
```

### 3. Реферальная система
```
URL: /?ref=PARTNER_CODE
→ Cookie/LocalStorage сохраняет ref
→ При заказе передаётся partnerCode
→ После оплаты: Partner.totalEarned += order.total * 0.5
```

### 4. Telegram Bot
```
/start → Регистрация партнёра или показ меню
Админ → Статистика продаж
Партнёр → Реферальная ссылка + статистика
```

## Безопасность

- **Идемпотентность**: повторные вызовы confirmTestPayment не создают дубли
- **ACL**: только владелец видит свои заказы
- **Master Key**: только для внутренних операций
- **Telegram auth**: проверка telegram_user_id

## ENV Конфигурация

```
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TG_IDS=123456,789012
BASE_SITE_URL=https://yoursite.com
```
