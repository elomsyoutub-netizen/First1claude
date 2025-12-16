# БЫСТРЫЙ СТАРТ

## За 15 минут до работающей системы

### 1️⃣ Back4App (5 мин)

```
1. Зайти на https://www.back4app.com/
2. Создать аккаунт → Build new app → Backend as a Service
3. Название: DigitalGoodsStore
4. App Settings → Security & Keys → Скопировать Application ID
5. Cloud Code Functions → подключить GitHub или скопировать файлы из папки cloud/
```

### 2️⃣ Telegram Bot (3 мин)

```
1. Открыть Telegram → найти @BotFather
2. /newbot → название → username
3. Скопировать токен бота

4. Найти @userinfobot → /start
5. Скопировать ваш User ID
```

### 3️⃣ ENV переменные (2 мин)

```
Back4App → App Settings → Server Settings → Environment Variables

Добавить:
TELEGRAM_BOT_TOKEN = ваш_токен
ADMIN_TG_IDS = ваш_user_id
BASE_SITE_URL = https://yoursite.com

Restart Server
```

### 4️⃣ Создать товары (1 мин)

```
Back4App → Database → Browser → Create Class: Product

Добавить 2 товара (см. DEPLOYMENT_GUIDE.md шаг 4)
```

### 5️⃣ Настроить Telegram Webhook (2 мин)

**Автоматически:**
```bash
cd scripts
./setup-telegram-webhook.sh
```

**Вручную:**
```bash
curl -X POST "https://api.telegram.org/botВАШ_ТОКЕН/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://parseapi.back4app.com/parse/functions/telegramWebhook"}'
```

### 6️⃣ Протестировать (2 мин)

**Telegram:**
```
1. Найти вашего бота
2. /start
3. Нажать "📊 Моя статистика"
```

**API:**
```bash
cd scripts
./test-api.sh
```

**Frontend:**
```
1. Открыть example-frontend.html
2. Вставить Application ID
3. Нажать "Купить"
```

---

## Готово! 🎉

Теперь система работает:
- ✅ API для заказов
- ✅ Telegram бот с уведомлениями
- ✅ Реферальная программа
- ✅ Идемпотентные платежи

### Что дальше?

📖 Полная инструкция: **DEPLOYMENT_GUIDE.md**

🔧 Замена тестовой оплаты на реальную: **README.md** → раздел "Замена тестовой оплаты"

📊 Проверить данные в Dashboard: Back4App → Database → Browser

---

## Troubleshooting

**Бот не отвечает?**
```bash
curl "https://api.telegram.org/botВАШ_ТОКЕН/getWebhookInfo"
```

**API не работает?**
- Проверьте Application ID
- Проверьте, что товары созданы
- Проверьте логи: Back4App → Server Settings → Logs

**Нет уведомлений?**
- Проверьте TELEGRAM_BOT_TOKEN в ENV
- Проверьте webhook (команда выше)
