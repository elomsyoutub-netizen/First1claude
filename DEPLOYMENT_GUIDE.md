# ИНСТРУКЦИЯ ПО РАЗВЁРТЫВАНИЮ И ТЕСТИРОВАНИЮ

## Шаг 1: Развернуть Parse Server на Back4App (5 минут)

### 1.1 Регистрация

1. Перейдите на https://www.back4app.com/
2. Зарегистрируйтесь (бесплатно)
3. Нажмите **"Build new app"**
4. Выберите **"Backend as a Service"**
5. Назовите приложение, например: `DigitalGoodsStore`
6. Нажмите **"Create"**

### 1.2 Получить ключи доступа

1. В меню слева: **App Settings** → **Security & Keys**
2. Скопируйте:
   - **Application ID**
   - **Client Key** (JavaScript Key)
   - **Master Key**

### 1.3 Загрузить Cloud Code

1. В меню слева: **Cloud Code Functions**
2. Нажмите **"Edit on GitHub"** (или используйте встроенный редактор)

**Вариант А: Через GitHub (рекомендуется)**
- Подключите ваш репозиторий
- В настройках укажите путь к Cloud Code: `cloud/main.js`
- Back4App автоматически подтянет код

**Вариант Б: Через встроенный редактор**
- Скопируйте содержимое каждого файла из папки `cloud/`:
  - `main.js` → вставьте в `main.js`
  - `config.js` → создайте новый файл `config.js`
  - `models.js` → создайте новый файл `models.js`
  - `api.js` → создайте новый файл `api.js`
  - `telegram.js` → создайте новый файл `telegram.js`

---

## Шаг 2: Создать Telegram бота (3 минуты)

### 2.1 Создать бота

1. Откройте Telegram
2. Найдите [@BotFather](https://t.me/botfather)
3. Отправьте `/newbot`
4. Введите имя бота, например: `Digital Goods Store`
5. Введите username, например: `DigitalGoodsStoreBot`
6. Скопируйте **токен бота** (выглядит как `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2.2 Получить ваш Telegram User ID

1. Найдите [@userinfobot](https://t.me/userinfobot)
2. Отправьте `/start`
3. Скопируйте ваш **User ID** (например: `123456789`)

---

## Шаг 3: Настроить ENV переменные (2 минуты)

1. В Back4App: **App Settings** → **Server Settings**
2. Найдите раздел **"Environment Variables"**
3. Добавьте переменные:

```
TELEGRAM_BOT_TOKEN = ваш_токен_от_BotFather
ADMIN_TG_IDS = ваш_telegram_user_id
BASE_SITE_URL = https://yoursite.com
```

Пример:
```
TELEGRAM_BOT_TOKEN = 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
ADMIN_TG_IDS = 123456789
BASE_SITE_URL = https://example.com
```

4. Нажмите **"Save"**
5. **Перезапустите сервер**: **Server Settings** → **Restart Server**

---

## Шаг 4: Инициализировать продукты (1 минута)

### Вариант А: Через Parse Dashboard

1. В Back4App: **Database** → **Browser**
2. Создайте класс **"Product"** (если не создан)
3. Нажмите **"+ Add Row"** дважды для создания 2 товаров:

**Товар 1:**
```
productId: digital_product
name: Цифровой продукт
price: 1000
currency: RUB
type: digital
payload: https://example.com/download/secret-key-12345
isActive: true
```

**Товар 2:**
```
productId: apple
name: Яблоко
price: 1000
currency: RUB
type: other
payload: 🍎 Ваше яблоко готово к выдаче!
isActive: true
```

### Вариант Б: Через Cloud Job

1. В Back4App: **Cloud Code Functions** → **Jobs**
2. Запустите Job: `initializeProducts`

---

## Шаг 5: Настроить Telegram Webhook (2 минуты)

Выполните curl запрос (замените `YOUR_BOT_TOKEN` и `YOUR_PARSE_SERVER_URL`):

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://parseapi.back4app.com/parse/functions/telegramWebhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

**Как найти ваш Parse Server URL:**
- Back4App: `https://parseapi.back4app.com`
- Обычно это: `https://parseapi.back4app.com/parse/functions/telegramWebhook`

**Полный пример:**
```bash
curl -X POST "https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://parseapi.back4app.com/parse/functions/telegramWebhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

**Проверить webhook:**
```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

Должно вернуть:
```json
{
  "ok": true,
  "result": {
    "url": "https://parseapi.back4app.com/parse/functions/telegramWebhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## Шаг 6: Протестировать Telegram бота (1 минута)

1. Откройте Telegram
2. Найдите вашего бота (по username, например `@DigitalGoodsStoreBot`)
3. Отправьте `/start`

**Ожидаемый результат:**
```
👋 Привет, Ваше Имя!

👑 Вы администратор

🔗 Ваша реферальная ссылка:
https://example.com?ref=YOURNAME_ABC123

📊 Используйте кнопки ниже для просмотра статистики.

[Кнопки: 📊 Моя статистика | 👑 Админ статистика]
```

4. Нажмите **"📊 Моя статистика"**

**Ожидаемый результат:**
```
📊 Ваша статистика

🔗 Реферальная ссылка:
https://example.com?ref=YOURNAME_ABC123

📈 Показатели:
• Продаж: 0
• Оборот: 0 RUB
• Заработано (50%): 0 RUB

💡 Делитесь ссылкой и зарабатывайте 50% с каждой продажи!
```

---

## Шаг 7: Протестировать API через curl (5 минут)

Замените переменные:
- `YOUR_APP_ID` - Application ID из Back4App
- `YOUR_PARSE_URL` - обычно `https://parseapi.back4app.com`

### 7.1 Получить список товаров

```bash
curl -X POST https://parseapi.back4app.com/parse/functions/getProducts \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Ожидаемый результат:**
```json
{
  "result": {
    "success": true,
    "products": [
      {
        "id": "...",
        "productId": "digital_product",
        "name": "Цифровой продукт",
        "price": 1000,
        "currency": "RUB",
        "type": "digital"
      },
      {
        "id": "...",
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

### 7.2 Создать заказ

```bash
curl -X POST https://parseapi.back4app.com/parse/functions/createOrder \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "apple",
    "customerEmail": "test@example.com"
  }'
```

**Ожидаемый результат:**
```json
{
  "result": {
    "success": true,
    "order": {
      "id": "...",
      "orderId": "ORD-1734380000000-1234",
      "productId": "apple",
      "productName": "Яблоко",
      "total": 1000,
      "currency": "RUB",
      "status": "created"
    }
  }
}
```

**Сохраните `orderId` для следующего шага!**

### 7.3 Оплатить заказ

```bash
curl -X POST https://parseapi.back4app.com/parse/functions/confirmTestPayment \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-1734380000000-1234",
    "paymentIdempotencyKey": "test_payment_001"
  }'
```

**Замените `orderId` на тот, что получили в предыдущем шаге!**

**Ожидаемый результат:**
```json
{
  "result": {
    "success": true,
    "alreadyPaid": false,
    "order": {
      "id": "...",
      "orderId": "ORD-1734380000000-1234",
      "status": "paid",
      "total": 1000,
      "currency": "RUB",
      "deliveredAt": "2025-12-16T12:00:00.000Z"
    },
    "payload": "🍎 Ваше яблоко готово к выдаче!"
  }
}
```

**Проверьте Telegram:**
Вы должны получить уведомление от бота о новой продаже!

### 7.4 Проверить идемпотентность

Повторите запрос оплаты с тем же `paymentIdempotencyKey`:

```bash
curl -X POST https://parseapi.back4app.com/parse/functions/confirmTestPayment \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-1734380000000-1234",
    "paymentIdempotencyKey": "test_payment_001"
  }'
```

**Ожидаемый результат:**
```json
{
  "result": {
    "success": true,
    "alreadyPaid": true,  // ← Обратите внимание!
    "order": { ... },
    "payload": "🍎 Ваше яблоко готово к выдаче!"
  }
}
```

Уведомление в Telegram **НЕ должно** отправиться повторно!

---

## Шаг 8: Протестировать фронтенд (3 минуты)

### 8.1 Открыть example-frontend.html

1. Откройте файл `example-frontend.html` в браузере
2. В поле **"Application ID"** вставьте ваш **Application ID** из Back4App
3. В поле **"Parse Server URL"** должно быть: `https://parseapi.back4app.com`

### 8.2 Протестировать покупку

1. Страница автоматически загрузит товары
2. Нажмите **"Купить"** на любом товаре
3. Подождите 2-3 секунды

**Ожидаемый результат:**
- Появится alert: `✅ Покупка успешна! 🍎 Ваше яблоко готово к выдаче!`
- В блоке результата будет JSON с данными заказа
- В Telegram придёт уведомление о продаже

### 8.3 Протестировать реферальную ссылку

1. В Telegram боте нажмите **"📊 Моя статистика"**
2. Скопируйте вашу реферальную ссылку
3. Откройте `example-frontend.html` с параметром `?ref=ВАШ_КОД`
   - Например: `file:///path/to/example-frontend.html?ref=YOURNAME_ABC123`
4. Сделайте покупку
5. В Telegram проверьте статистику партнёра

**Ожидаемый результат:**
```
📊 Ваша статистика

🔗 Реферальная ссылка:
https://example.com?ref=YOURNAME_ABC123

📈 Показатели:
• Продаж: 1       ← Увеличилось!
• Оборот: 1000 RUB
• Заработано (50%): 500 RUB  ← 50% комиссия!
```

---

## Шаг 9: Проверить админ статистику (1 минута)

1. В Telegram боте нажмите **"👑 Админ статистика"**

**Ожидаемый результат:**
```
👑 Админ статистика

💰 Общие показатели:
• Заказов: 2
• Выручка: 2000 RUB

👥 Топ партнёры:
1. Ваше Имя - 1 продаж, 500 RUB

📦 Последние продажи:
• Яблоко - 1000 RUB (Ваше Имя)
• Яблоко - 1000 RUB
```

---

## Шаг 10: Проверить данные в Dashboard (опционально)

1. В Back4App: **Database** → **Browser**
2. Проверьте таблицы:

**Order:**
- Должны быть 2 записи со статусом `paid`

**Partner:**
- Должна быть 1 запись с вашим Telegram ID

**PartnerLedger:**
- Должна быть 1 запись с комиссией 500 RUB

---

## Troubleshooting (Решение проблем)

### Проблема: Telegram бот не отвечает

**Решение:**
1. Проверьте webhook:
   ```bash
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
   ```
2. Проверьте ENV переменную `TELEGRAM_BOT_TOKEN`
3. Проверьте логи в Back4App: **Server Settings** → **Logs**

### Проблема: API возвращает ошибку "Product not found"

**Решение:**
1. Проверьте, что товары созданы в таблице **Product**
2. Убедитесь, что поле `isActive = true`
3. Запустите Cloud Job `initializeProducts`

### Проблема: Уведомления в Telegram не приходят

**Решение:**
1. Проверьте ENV переменную `TELEGRAM_BOT_TOKEN`
2. Проверьте, что webhook настроен правильно
3. Проверьте логи в Back4App

### Проблема: Frontend не загружает товары

**Решение:**
1. Проверьте Application ID
2. Откройте консоль браузера (F12) и проверьте ошибки
3. Убедитесь, что CORS включён в Back4App (по умолчанию включён)

---

## Готово!

Теперь у вас работающая система продажи цифровых товаров с:
- ✅ Serverless API
- ✅ Реферальной программой
- ✅ Telegram ботом
- ✅ Идемпотентными платежами
- ✅ Автоматическими уведомлениями

### Следующие шаги:

1. **Замените тестовую оплату на реальную** - см. README.md раздел "Замена тестовой оплаты"
2. **Создайте реальный фронтенд** - используйте `example-frontend.html` как основу
3. **Настройте домен** - обновите `BASE_SITE_URL`
4. **Добавьте больше товаров** - через Parse Dashboard
5. **Настройте аналитику** - интегрируйте Google Analytics или Amplitude

---

## Полезные ссылки

- Back4App Dashboard: https://dashboard.back4app.com/
- Parse Documentation: https://docs.parseplatform.org/
- Telegram Bot API: https://core.telegram.org/bots/api
- Ваш репозиторий: https://github.com/elomsyoutub-netizen/First1claude
