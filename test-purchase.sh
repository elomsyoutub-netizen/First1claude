#!/bin/bash

echo "🛒 ТЕСТ ПОКУПКИ"
echo "==============="
echo ""

APP_ID="dMzX2vukXJp8aCS9xLzoGw6GkuTZYbhzQMhVrdCf"
CLIENT_KEY="C07cRRRiFOrApuLkkA39XFa0Xq6B5OhKzerMIOMT"
API_URL="https://parseapi.back4app.com/parse/functions"

# Шаг 1: Показать товары
echo "📦 Шаг 1: Получаем список товаров..."
PRODUCTS=$(curl -s -X POST "${API_URL}/getProducts" \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "X-Parse-Client-Key: ${CLIENT_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$PRODUCTS" | python3 -m json.tool
echo ""

# Шаг 2: Создать заказ
echo "🛍️  Шаг 2: Создаём заказ на Яблоко..."
ORDER=$(curl -s -X POST "${API_URL}/createOrder" \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "X-Parse-Client-Key: ${CLIENT_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "apple",
    "customerEmail": "test@example.com"
  }')

echo "$ORDER" | python3 -m json.tool
ORDER_ID=$(echo "$ORDER" | grep -o '"orderId":"[^"]*' | cut -d'"' -f4)
echo ""
echo "✅ Заказ создан: $ORDER_ID"
echo ""

# Шаг 3: Оплатить
echo "💳 Шаг 3: Оплачиваем заказ..."
PAYMENT_KEY="test_purchase_$(date +%s)"
PAYMENT=$(curl -s -X POST "${API_URL}/confirmTestPayment" \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "X-Parse-Client-Key: ${CLIENT_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"${ORDER_ID}\",
    \"paymentIdempotencyKey\": \"${PAYMENT_KEY}\"
  }")

echo "$PAYMENT" | python3 -m json.tool
echo ""

# Показать товар
PAYLOAD=$(echo "$PAYMENT" | grep -o '"payload":"[^"]*' | cut -d'"' -f4)
echo "════════════════════════════════════"
echo "🎉 ПОКУПКА УСПЕШНА!"
echo "════════════════════════════════════"
echo ""
echo "🎁 Ваш товар:"
echo "$PAYLOAD"
echo ""
echo "════════════════════════════════════"
