#!/bin/bash

# Инициализация продуктов в Parse Server

PARSE_URL="https://parseapi.back4app.com"
APP_ID="dMzX2vukXJp8aCS9xLzoGw6GkuTZYbhzQMhVrdCf"
MASTER_KEY="rWzl9eu7m0QbC14SSndGnarmvUbJLcYxobW57kDl"

echo "=== Инициализация продуктов ==="
echo ""

# Проверяем существующие продукты
echo "Проверяю существующие продукты..."
EXISTING=$(curl -s -X GET \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "X-Parse-Master-Key: ${MASTER_KEY}" \
  "${PARSE_URL}/parse/classes/Product")

COUNT=$(echo "$EXISTING" | grep -o '"objectId"' | wc -l)
echo "Найдено продуктов: $COUNT"
echo ""

if [ "$COUNT" -gt 0 ]; then
  echo "⚠️  Продукты уже существуют. Хотите пересоздать? (y/n)"
  read -r ANSWER
  if [ "$ANSWER" != "y" ]; then
    echo "Отменено."
    exit 0
  fi
fi

# Создаём продукт 1: digital_product
echo "Создаю продукт: Цифровой продукт..."
PRODUCT1=$(curl -s -X POST \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "X-Parse-Master-Key: ${MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "digital_product",
    "name": "Цифровой продукт",
    "price": 1000,
    "currency": "RUB",
    "type": "digital",
    "payload": "https://example.com/download/secret-key-12345",
    "isActive": true
  }' \
  "${PARSE_URL}/parse/classes/Product")

echo "$PRODUCT1" | python3 -m json.tool 2>/dev/null || echo "$PRODUCT1"
echo ""

# Создаём продукт 2: apple
echo "Создаю продукт: Яблоко..."
PRODUCT2=$(curl -s -X POST \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "X-Parse-Master-Key: ${MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "apple",
    "name": "Яблоко",
    "price": 1000,
    "currency": "RUB",
    "type": "other",
    "payload": "🍎 Ваше яблоко готово к выдаче!",
    "isActive": true
  }' \
  "${PARSE_URL}/parse/classes/Product")

echo "$PRODUCT2" | python3 -m json.tool 2>/dev/null || echo "$PRODUCT2"
echo ""

echo "✅ Продукты созданы!"
echo ""

# Проверяем через Cloud Function
echo "Проверяю через API getProducts..."
PRODUCTS=$(curl -s -X POST \
  -H "X-Parse-Application-Id: ${APP_ID}" \
  -H "Content-Type: application/json" \
  "${PARSE_URL}/parse/functions/getProducts" \
  -d '{}')

echo "$PRODUCTS" | python3 -m json.tool 2>/dev/null || echo "$PRODUCTS"
