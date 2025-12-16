# Serverless Backend для продажи цифровых товаров

Полнофункциональный serverless backend на Parse Cloud Code с реферальной программой и Telegram-ботом.

## 🚀 Быстрый старт

- **[QUICKSTART.md](QUICKSTART.md)** - Быстрый старт за 15 минут
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Подробная инструкция по развёртыванию

## Возможности

- Управление цифровыми товарами
- Создание и обработка заказов
- Реферальная программа (50% партнёру)
- Telegram бот для уведомлений и статистики
- Идемпотентные платежи
- Автоматическая выдача товаров

## Структура проекта

```
.
├── cloud/
│   ├── main.js                # Точка входа Cloud Code
│   ├── config.js              # Конфигурация (ENV)
│   ├── models.js              # Модели данных и бизнес-логика
│   ├── api.js                 # Cloud Functions (API)
│   └── telegram.js            # Telegram Bot логика
├── scripts/
│   ├── setup-telegram-webhook.sh  # Настройка Telegram webhook
│   └── test-api.sh            # Тестирование API
├── QUICKSTART.md              # Быстрый старт (15 минут)
├── DEPLOYMENT_GUIDE.md        # Подробная инструкция
├── ARCHITECTURE.md            # Архитектура системы
├── DATA_SCHEMA.md             # Схема данных
├── example-frontend.html      # Пример фронтенда
├── package.json
└── .env.example
```

## Установка

### 1. Клонировать репозиторий

```bash
git clone <repo>
cd <repo>
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить ENV переменные

```bash
cp .env.example .env
# Отредактировать .env
```

### 4. Deploy на Parse Server

Если используете Back4App:
- Загрузите папку `cloud/` в Cloud Code раздел
- Настройте ENV в Settings → Server Settings → Cloud Code Environment Variables

Если используете собственный Parse Server:
- Укажите путь к `cloud/main.js` в конфигурации Parse Server
- Настройте ENV переменные

### 5. Инициализировать продукты

После deploy выполните Cloud Job:

```bash
# Или через Parse Dashboard → Cloud Code → Jobs → Run "initializeProducts"
```

## Конфигурация

### ENV переменные

```env
TELEGRAM_BOT_TOKEN=123456789:ABC...        # Токен Telegram бота
ADMIN_TG_IDS=123456,789012                 # Telegram ID админов (через запятую)
BASE_SITE_URL=https://yoursite.com         # URL сайта для реферальных ссылок
```

### Получить Telegram Bot Token

1. Написать [@BotFather](https://t.me/botfather)
2. `/newbot` → указать имя
3. Скопировать токен

### Получить Telegram User ID

1. Написать [@userinfobot](https://t.me/userinfobot)
2. Скопировать ID

### Настроить Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-parse-server.com/parse/functions/telegramWebhook"
  }'
```

## API

Все Cloud Functions доступны по адресу:

```
POST https://your-parse-server.com/parse/functions/<functionName>
```

Headers:
```
X-Parse-Application-Id: YOUR_APP_ID
Content-Type: application/json
```

---

### 1. getProducts

Получить список активных товаров.

**Запрос:**
```bash
curl -X POST https://your-parse-server.com/parse/functions/getProducts \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Ответ:**
```json
{
  "result": {
    "success": true,
    "products": [
      {
        "id": "abc123",
        "productId": "digital_product",
        "name": "Цифровой продукт",
        "price": 1000,
        "currency": "RUB",
        "type": "digital"
      },
      {
        "id": "def456",
        "productId": "apple",
        "name": "Яблоко",
        "price": 1000,
        "currency": "RUB",
        "type": "other"
      }
    ]
  }
}
```

---

### 2. createOrder

Создать новый заказ.

**Запрос:**
```bash
curl -X POST https://your-parse-server.com/parse/functions/createOrder \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "apple",
    "partnerCode": "PARTNER_ABC123",
    "customerEmail": "customer@example.com"
  }'
```

**Параметры:**
- `productId` (string, required) - ID товара
- `partnerCode` (string, optional) - Реферальный код партнёра
- `customerEmail` (string, optional) - Email покупателя
- `customerTelegramId` (number, optional) - Telegram ID покупателя

**Ответ:**
```json
{
  "result": {
    "success": true,
    "order": {
      "id": "xyz789",
      "orderId": "ORD-1234567890-5678",
      "productId": "apple",
      "productName": "Яблоко",
      "total": 1000,
      "currency": "RUB",
      "status": "created"
    }
  }
}
```

---

### 3. confirmTestPayment

Подтвердить тестовую оплату заказа.

**Запрос:**
```bash
curl -X POST https://your-parse-server.com/parse/functions/confirmTestPayment \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-1234567890-5678",
    "paymentIdempotencyKey": "payment_unique_key_123"
  }'
```

**Параметры:**
- `orderId` (string, required) - Номер заказа
- `paymentIdempotencyKey` (string, required) - Уникальный ключ для идемпотентности

**Ответ:**
```json
{
  "result": {
    "success": true,
    "alreadyPaid": false,
    "order": {
      "id": "xyz789",
      "orderId": "ORD-1234567890-5678",
      "status": "paid",
      "total": 1000,
      "currency": "RUB",
      "deliveredAt": "2025-12-16T12:00:00.000Z"
    },
    "payload": "🍎 Ваше яблоко готово к выдаче!"
  }
}
```

**Идемпотентность:**

Повторный вызов с тем же `paymentIdempotencyKey` вернёт тот же результат без дублирования продажи:

```json
{
  "result": {
    "success": true,
    "alreadyPaid": true,
    "order": { ... },
    "payload": "..."
  }
}
```

---

### 4. getPartnerStats

Получить статистику партнёра.

**Запрос:**
```bash
curl -X POST https://your-parse-server.com/parse/functions/getPartnerStats \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "telegramUserId": 123456789
  }'
```

**Ответ:**
```json
{
  "result": {
    "success": true,
    "partner": {
      "id": "partner123",
      "partnerCode": "PARTNER_ABC123",
      "name": "John Doe",
      "totalSales": 5,
      "totalRevenue": 5000,
      "totalEarned": 2500,
      "isActive": true
    },
    "referralUrl": "https://yoursite.com?ref=PARTNER_ABC123"
  }
}
```

---

### 5. getAdminStats

Получить статистику для админа.

**Запрос:**
```bash
curl -X POST https://your-parse-server.com/parse/functions/getAdminStats \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "telegramUserId": 123456789
  }'
```

**Ответ:**
```json
{
  "result": {
    "success": true,
    "stats": {
      "totalOrders": 10,
      "totalRevenue": 10000,
      "currency": "RUB"
    },
    "partners": [
      {
        "id": "p1",
        "name": "Partner 1",
        "partnerCode": "P1_ABC",
        "totalSales": 5,
        "totalRevenue": 5000,
        "totalEarned": 2500
      }
    ],
    "recentOrders": [
      {
        "id": "o1",
        "orderId": "ORD-123",
        "productName": "Яблоко",
        "total": 1000,
        "currency": "RUB",
        "partnerName": "Partner 1",
        "createdAt": "2025-12-16T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 6. telegramWebhook

Webhook для Telegram бота (настраивается автоматически).

---

## Telegram Bot

### Команды

- `/start` - Регистрация как партнёр, получение реферальной ссылки

### Кнопки

- **📊 Моя статистика** - Показать статистику партнёра
- **👑 Админ статистика** - Показать админ статистику (только для админов)

### Уведомления

#### Админу при продаже:
```
🎉 Новая продажа!

📦 Товар: Яблоко
💰 Сумма: 1000 RUB
📝 Заказ: ORD-1234567890-5678
👥 Партнёр: John Doe (PARTNER_ABC123)
💸 Комиссия партнёру: 500 RUB

🕐 16.12.2025, 12:00:00
```

#### Партнёру при продаже:
```
💰 Продажа по вашей ссылке!

📦 Товар: Яблоко
💵 Сумма: 1000 RUB
✅ Ваша комиссия: 500 RUB

📊 Статистика:
• Продаж: 5
• Оборот: 5000 RUB
• Заработано: 2500 RUB

🕐 16.12.2025, 12:00:00
```

---

## Поток покупки (Frontend пример)

```javascript
// 1. Получить товары
const products = await fetch('https://your-parse-server.com/parse/functions/getProducts', {
  method: 'POST',
  headers: {
    'X-Parse-Application-Id': 'YOUR_APP_ID',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
}).then(r => r.json());

// 2. Создать заказ
const partnerCode = localStorage.getItem('ref'); // Из ?ref=CODE

const order = await fetch('https://your-parse-server.com/parse/functions/createOrder', {
  method: 'POST',
  headers: {
    'X-Parse-Application-Id': 'YOUR_APP_ID',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 'apple',
    partnerCode: partnerCode,
    customerEmail: 'user@example.com'
  })
}).then(r => r.json());

// 3. Тестовая оплата
const payment = await fetch('https://your-parse-server.com/parse/functions/confirmTestPayment', {
  method: 'POST',
  headers: {
    'X-Parse-Application-Id': 'YOUR_APP_ID',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: order.result.order.orderId,
    paymentIdempotencyKey: 'payment_' + Date.now() + '_' + Math.random()
  })
}).then(r => r.json());

// 4. Показать товар
alert(payment.result.payload); // "🍎 Ваше яблоко готово к выдаче!"
```

---

## Замена тестовой оплаты на реальную

Для интеграции с реальными платёжными системами (ЮKassa, Stripe, PayPal и т.д.):

### 1. Создать Cloud Function для создания платежа

```javascript
Parse.Cloud.define('createPayment', async (request) => {
  const { orderId } = request.params;

  // Получить заказ
  const query = new Parse.Query('Order');
  query.equalTo('orderId', orderId);
  const order = await query.first({ useMasterKey: true });

  // Создать платёж в платёжной системе
  const payment = await createPaymentInPaymentGateway({
    amount: order.get('total'),
    currency: order.get('currency'),
    orderId: orderId,
    // callback URL для webhook
    returnUrl: `${config.site.baseUrl}/payment/callback`
  });

  return {
    success: true,
    paymentUrl: payment.confirmationUrl,
    paymentId: payment.id
  };
});
```

### 2. Создать webhook для подтверждения оплаты

```javascript
Parse.Cloud.define('paymentWebhook', async (request) => {
  const { paymentId, status, orderId } = request.params;

  // Проверить подпись webhook от платёжной системы
  if (!verifyWebhookSignature(request)) {
    throw new Error('Invalid signature');
  }

  if (status === 'succeeded') {
    // Вызвать confirmTestPayment с paymentId как ключом идемпотентности
    await Parse.Cloud.run('confirmTestPayment', {
      orderId: orderId,
      paymentIdempotencyKey: paymentId
    }, { useMasterKey: true });
  }

  return { success: true };
});
```

### 3. Обновить Frontend

```javascript
// Вместо confirmTestPayment вызвать createPayment
const payment = await fetch('.../createPayment', {
  body: JSON.stringify({ orderId: order.result.order.orderId })
}).then(r => r.json());

// Перенаправить на страницу оплаты
window.location.href = payment.result.paymentUrl;

// После успешной оплаты webhook автоматически выдаст товар
```

---

## Безопасность

- ✅ Идемпотентность платежей через `paymentIdempotencyKey`
- ✅ Проверка прав доступа для админ функций
- ✅ Использование Master Key для внутренних операций
- ✅ Валидация входных параметров
- ✅ Проверка статуса заказа перед оплатой

---

## Поддержка

Для вопросов и багов создавайте Issues в репозитории.

## Лицензия

MIT
