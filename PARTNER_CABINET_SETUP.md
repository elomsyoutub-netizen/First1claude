# НАСТРОЙКА ПАРТНЁРСКОГО КАБИНЕТА

## Что создано:

### 📁 Структура файлов:

```
partner-cabinet/
├── index.html          # Страница входа/регистрации
├── dashboard.html      # Дашборд партнёра
├── config.js          # Конфигурация API
├── api.js             # API модуль
└── style.css          # Стили

cloud/
├── partner-cabinet.js  # Cloud Functions для кабинета
├── partner-hooks.js    # Hooks и уведомления
└── (существующие файлы)
```

---

## 🚀 ШАГ 1: Обновить Cloud Code

### 1.1 Добавить новые функции

В Back4App → Cloud Code Functions → Откройте редактор:

**Добавьте в конец файла `cloud-combined.js`:**

1. Скопируйте содержимое `cloud/partner-cabinet.js`
2. Скопируйте содержимое `cloud/partner-hooks.js`

### 1.2 Обновить функцию confirmTestPayment

Найдите функцию `confirmTestPayment` и добавьте после начисления комиссии:

```javascript
// После creditPartnerCommission
if (partner && partnerCommission) {
  const hooks = require('./partner-hooks');
  await hooks.updatePartnerBalance(order, partner, partnerCommission.commission);
}

// Обновить уведомления
const hooks = require('./partner-hooks');
await hooks.notifyAdminSale(order, product, partner, partnerCommission);
```

### 1.3 Deploy

Нажмите **Save** и **Deploy** на Back4App.

---

## 🚀 ШАГ 2: Создать таблицы в базе данных

### В Back4App Dashboard → Database → Browser:

Создайте 2 новые таблицы:

#### 1. PaymentDetails

| Колонка | Тип | Описание |
|---------|-----|----------|
| partner | Pointer → Partner | Связь |
| paymentMethod | String | card/bank/paypal/crypto |
| cardNumber | String | Маскированный номер |
| cardHolder | String | Имя |
| bankName | String | Банк |
| accountNumber | String | Счёт |
| bik | String | БИК |
| paypalEmail | String | PayPal |
| cryptoAddress | String | Крипто |
| isVerified | Boolean | Проверено |

#### 2. WithdrawalRequest

| Колонка | Тип | Описание |
|---------|-----|----------|
| requestId | String | Номер заявки |
| partner | Pointer → Partner | Связь |
| amount | Number | Сумма |
| currency | String | Валюта |
| status | String | pending/approved/rejected/paid |
| paymentDetails | Pointer → PaymentDetails | Реквизиты |
| paymentMethod | String | Метод |
| notes | String | Примечания |
| processedAt | Date | Дата обработки |
| paidAt | Date | Дата выплаты |

### Обновить таблицу Partner

Добавить колонки:

| Колонка | Тип | Значение по умолчанию |
|---------|-----|----------------------|
| user | Pointer → User | - |
| email | String | - |
| phone | String | - |
| availableBalance | Number | 0 |
| pendingBalance | Number | 0 |
| totalWithdrawn | Number | 0 |

---

## 🚀 ШАГ 3: Развернуть веб-кабинет

### Вариант 1: На GitHub Pages (бесплатно)

1. Создайте репозиторий на GitHub
2. Загрузите папку `partner-cabinet/`
3. Settings → Pages → Source: main branch
4. Готово! Кабинет доступен по адресу: `username.github.io/repo`

### Вариант 2: На Vercel (бесплатно)

1. Зайдите на https://vercel.com
2. New Project → Import Git Repository
3. Выберите папку `partner-cabinet/`
4. Deploy
5. Готово!

### Вариант 3: На Netlify (бесплатно)

1. Зайдите на https://netlify.com
2. Drag & drop папку `partner-cabinet/`
3. Готово!

### Вариант 4: Локально (для теста)

```bash
cd partner-cabinet
python3 -m http.server 8000
# Открыть http://localhost:8000
```

---

## 🧪 ШАГ 4: Тестирование

### 1. Регистрация

1. Откройте кабинет
2. Нажмите "Регистрация"
3. Заполните форму
4. Войдите в систему

### 2. Проверка дашборда

- Должна отобразиться статистика (0 продаж)
- Реферальная ссылка
- Пустая таблица заказов

### 3. Тест покупки по реферальной ссылке

1. Скопируйте реферальную ссылку из кабинета
2. Откройте `shop-simple.html` с параметром `?ref=ВАШ_КОД`
3. Купите товар
4. Обновите дашборд партнёра

**Ожидаемый результат:**
- Продаж: 1
- Оборот: 1000 RUB
- Заработано: 500 RUB
- Доступно: 500 RUB

### 4. Тест реквизитов

1. Нажмите "Реквизиты для выплат"
2. Выберите способ (например, карта)
3. Заполните данные
4. Сохраните

### 5. Тест заявки на вывод

1. Нажмите "Заявка на вывод"
2. Укажите сумму (не больше доступного)
3. Создайте заявку

**Ожидаемый результат:**
- Заявка создана
- Доступно: уменьшилось
- В обработке: увеличилось
- Админ получил уведомление в Telegram (если настроен)

---

## 📊 ШАГ 5: Настройка Telegram для админа

### Проблема webhook решена!

Используем **только уведомления админу** (без публичного бота).

Уведомления отправляются напрямую через `sendMessage` к админу:
- ✅ Новая продажа
- ✅ Новая заявка на вывод
- ✅ Ошибки системы

**Это работает БЕЗ webhook!**

Webhook был нужен только для публичных команд бота (которые нам не нужны).

---

## ✅ ГОТОВО!

Теперь у вас:
- ✅ Полнофункциональный партнёрский кабинет
- ✅ Регистрация и вход
- ✅ Статистика в реальном времени
- ✅ Реквизиты для выплат
- ✅ Заявки на вывод
- ✅ Telegram уведомления админу

---

## 🔥 СЛЕДУЮЩИЕ ШАГИ

1. **Развернуть кабинет** (GitHub Pages / Vercel / Netlify)
2. **Обновить Cloud Code** с новыми функциями
3. **Протестировать** весь цикл
4. **Интегрировать реальную оплату** (ЮKassa / Stripe)
5. **Добавить админ-панель** для одобрения выплат (опционально)

---

## 💡 Дополнительно

### Админ-панель для одобрения выплат

Можно создать отдельную страницу для админа, где он будет:
- Видеть все заявки на вывод
- Одобрять/отклонять
- Помечать как выплачено

**Нужно ли вам это сейчас?** Или пока хватит?
