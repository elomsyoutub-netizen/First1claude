# РАСШИРЕННАЯ СХЕМА ДАННЫХ

## PaymentDetails (Реквизиты партнёра)

Реквизиты для выплат партнёру.

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID (авто) |
| partner | Pointer | → Partner |
| paymentMethod | String | card / bank / paypal / crypto |
| cardNumber | String | Номер карты (маскированный) |
| cardHolder | String | Имя держателя |
| bankName | String | Название банка |
| accountNumber | String | Номер счёта |
| bik | String | БИК банка |
| paypalEmail | String | PayPal email |
| cryptoAddress | String | Крипто-адрес |
| isVerified | Boolean | Проверены ли реквизиты |
| createdAt | Date | Дата создания (авто) |
| updatedAt | Date | Дата обновления (авто) |

---

## WithdrawalRequest (Заявка на вывод)

Заявки партнёров на вывод средств.

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID (авто) |
| requestId | String | Уникальный номер заявки |
| partner | Pointer | → Partner |
| amount | Number | Сумма к выводу |
| currency | String | Валюта (RUB) |
| status | String | pending / approved / rejected / paid |
| paymentDetails | Pointer | → PaymentDetails |
| paymentMethod | String | Метод вывода |
| notes | String | Примечания админа |
| processedBy | String | Кто обработал |
| processedAt | Date | Дата обработки |
| paidAt | Date | Дата выплаты |
| createdAt | Date | Дата создания (авто) |
| updatedAt | Date | Дата обновления (авто) |

---

## User (расширение Parse.User)

Для аутентификации партнёров.

| Поле | Тип | Описание |
|------|-----|----------|
| objectId | String | ID (авто) |
| username | String | Email партнёра |
| email | String | Email |
| password | String | Хеш пароля |
| partner | Pointer | → Partner |
| emailVerified | Boolean | Email подтверждён |
| role | String | partner / admin |
| createdAt | Date | Дата регистрации (авто) |
| updatedAt | Date | Дата обновления (авто) |

---

## Обновление Partner

Добавляем поля:

| Поле | Тип | Описание |
|------|-----|----------|
| user | Pointer | → User (связь с аккаунтом) |
| availableBalance | Number | Доступно для вывода |
| pendingBalance | Number | В обработке (заявки) |
| totalWithdrawn | Number | Всего выведено |
| email | String | Email для входа |
| phone | String | Телефон (опционально) |
