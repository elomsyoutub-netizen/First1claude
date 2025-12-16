#!/bin/bash

# Скрипт для тестирования API

echo "=== Тестирование API ==="
echo ""

# Запросить данные
read -p "Введите Parse Server URL (например: https://parseapi.back4app.com): " PARSE_URL
read -p "Введите Application ID: " APP_ID

API_URL="${PARSE_URL}/parse/functions"

echo ""
echo "Тестируем API на: $API_URL"
echo ""

# Функция для выполнения запроса
call_function() {
  local function_name=$1
  local params=$2

  echo "─────────────────────────────────────────"
  echo "📡 Вызов: $function_name"
  echo "Параметры: $params"
  echo ""

  RESPONSE=$(curl -s -X POST "${API_URL}/${function_name}" \
    -H "X-Parse-Application-Id: ${APP_ID}" \
    -H "Content-Type: application/json" \
    -d "$params")

  echo "Ответ:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo ""
}

# 1. Получить список товаров
echo "🧪 Тест 1: Получение списка товаров"
call_function "getProducts" '{}'

# 2. Создать заказ
echo "🧪 Тест 2: Создание заказа"
ORDER_RESPONSE=$(curl -s -X POST "${API_URL}/createOrder" \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "Content-Type: application/json" \
  -d '{"productId": "apple", "customerEmail": "test@example.com"}')

echo "Ответ:"
echo "$ORDER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ORDER_RESPONSE"
echo ""

# Извлечь orderId
ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"orderId":"[^"]*' | cut -d'"' -f4)

if [ -z "$ORDER_ID" ]; then
  echo "❌ Ошибка: не удалось создать заказ"
  exit 1
fi

echo "✅ Заказ создан: $ORDER_ID"
echo ""

# 3. Оплатить заказ
echo "🧪 Тест 3: Оплата заказа"
PAYMENT_KEY="test_payment_$(date +%s)"
call_function "confirmTestPayment" "{\"orderId\": \"${ORDER_ID}\", \"paymentIdempotencyKey\": \"${PAYMENT_KEY}\"}"

# 4. Проверить идемпотентность
echo "🧪 Тест 4: Проверка идемпотентности (повторная оплата)"
call_function "confirmTestPayment" "{\"orderId\": \"${ORDER_ID}\", \"paymentIdempotencyKey\": \"${PAYMENT_KEY}\"}"

echo "─────────────────────────────────────────"
echo "✅ Все тесты завершены!"
echo ""
echo "Проверьте Telegram - вы должны были получить уведомление о продаже."
