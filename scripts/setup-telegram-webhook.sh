#!/bin/bash

# Скрипт для настройки Telegram Webhook

echo "=== Настройка Telegram Webhook ==="
echo ""

# Запросить данные
read -p "Введите Telegram Bot Token: " BOT_TOKEN
read -p "Введите Parse Server URL (например: https://parseapi.back4app.com): " PARSE_URL

# Сформировать webhook URL
WEBHOOK_URL="${PARSE_URL}/parse/functions/telegramWebhook"

echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Установить webhook
echo "Устанавливаю webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\", \"allowed_updates\": [\"message\", \"callback_query\"]}")

echo "Ответ: $RESPONSE"
echo ""

# Проверить webhook
echo "Проверяю webhook..."
INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")

echo "Информация о webhook:"
echo "$INFO" | python3 -m json.tool 2>/dev/null || echo "$INFO"
echo ""

# Проверить успешность
if echo "$INFO" | grep -q "\"url\":\"${WEBHOOK_URL}\""; then
  echo "✅ Webhook успешно настроен!"
else
  echo "❌ Ошибка настройки webhook. Проверьте данные."
fi
