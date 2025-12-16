# СХЕМА ДАННЫХ

## Product

Цифровые товары для продажи.

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID (авто) |
| productId | String | Уникальный код (digital_product, apple) |
| name | String | Название товара |
| price | Number | Цена в рублях |
| currency | String | Валюта (RUB) |
| type | String | Тип: digital / other |
| payload | String | Данные для выдачи (ссылка, ключ) |
| isActive | Boolean | Активен ли товар |
| createdAt | Date | Дата создания (авто) |
| updatedAt | Date | Дата обновления (авто) |

**Индексы**: productId (unique)

---

## Order

Заказы покупателей.

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID (авто) |
| orderId | String | Уникальный номер заказа |
| product | Pointer | → Product |
| productSnapshot | Object | Снимок товара на момент покупки |
| total | Number | Сумма заказа |
| currency | String | Валюта (RUB) |
| status | String | created / paid / delivered / failed |
| paymentIdempotencyKey | String | Ключ идемпотентности оплаты |
| partnerCode | String | Код партнёра (опционально) |
| partner | Pointer | → Partner (опционально) |
| customerEmail | String | Email покупателя (опционально) |
| customerTelegramId | Number | Telegram ID покупателя (опционально) |
| deliveredAt | Date | Дата выдачи товара |
| createdAt | Date | Дата создания (авто) |
| updatedAt | Date | Дата обновления (авто) |

**Индексы**:
- orderId (unique)
- paymentIdempotencyKey (unique)
- status
- partner

---

## Partner

Партнёры (реферальная программа).

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID (авто) |
| partnerCode | String | Уникальный реферальный код |
| name | String | Имя партнёра |
| telegramUserId | Number | Telegram User ID |
| telegramUsername | String | Telegram username (@partner) |
| totalSales | Number | Количество продаж |
| totalRevenue | Number | Общий оборот (100%) |
| totalEarned | Number | Заработано партнёром (50%) |
| isActive | Boolean | Активен ли партнёр |
| createdAt | Date | Дата регистрации (авто) |
| updatedAt | Date | Дата обновления (авто) |

**Индексы**:
- partnerCode (unique)
- telegramUserId (unique)

---

## PartnerLedger

Журнал начислений партнёрам.

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID (авто) |
| partner | Pointer | → Partner |
| order | Pointer | → Order |
| orderTotal | Number | Сумма заказа (100%) |
| commission | Number | Начислено партнёру (50%) |
| commissionRate | Number | Ставка комиссии (0.5) |
| type | String | Тип операции: sale |
| createdAt | Date | Дата начисления (авто) |
| updatedAt | Date | Дата обновления (авто) |

**Индексы**:
- partner
- order

---

## Связи

```
Order.product → Product
Order.partner → Partner
PartnerLedger.partner → Partner
PartnerLedger.order → Order
```

## Стартовые данные

### Products

```json
[
  {
    "productId": "digital_product",
    "name": "Цифровой продукт",
    "price": 1000,
    "currency": "RUB",
    "type": "digital",
    "payload": "https://example.com/download/secret-key-12345",
    "isActive": true
  },
  {
    "productId": "apple",
    "name": "Яблоко",
    "price": 1000,
    "currency": "RUB",
    "type": "other",
    "payload": "🍎 Ваше яблоко готово к выдаче!",
    "isActive": true
  }
]
```
