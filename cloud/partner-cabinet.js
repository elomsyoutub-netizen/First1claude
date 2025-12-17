// Cloud Functions для партнёрского кабинета

const config = require('./config');

/**
 * registerPartner - Регистрация нового партнёра
 *
 * Вход: {
 *   email: string,
 *   password: string,
 *   name: string,
 *   phone?: string
 * }
 */
Parse.Cloud.define('registerPartner', async (request) => {
  const { email, password, name, phone } = request.params;

  if (!email || !password || !name) {
    throw new Error('Email, password and name are required');
  }

  // Проверить, существует ли пользователь
  const existingUser = new Parse.Query(Parse.User);
  existingUser.equalTo('email', email);
  const existing = await existingUser.first({ useMasterKey: true });

  if (existing) {
    throw new Error('User with this email already exists');
  }

  // Создать пользователя
  const user = new Parse.User();
  user.set('username', email);
  user.set('email', email);
  user.set('password', password);
  user.set('role', 'partner');

  try {
    await user.signUp(null, { useMasterKey: true });
  } catch (error) {
    throw new Error('Registration failed: ' + error.message);
  }

  // Создать партнёра
  const Partner = Parse.Object.extend('Partner');
  const partner = new Partner();

  const partnerCode = generatePartnerCode(name);

  partner.set('user', user);
  partner.set('email', email);
  partner.set('name', name);
  partner.set('phone', phone || '');
  partner.set('partnerCode', partnerCode);
  partner.set('totalSales', 0);
  partner.set('totalRevenue', 0);
  partner.set('totalEarned', 0);
  partner.set('availableBalance', 0);
  partner.set('pendingBalance', 0);
  partner.set('totalWithdrawn', 0);
  partner.set('isActive', true);

  await partner.save(null, { useMasterKey: true });

  // Связать пользователя с партнёром
  user.set('partner', partner);
  await user.save(null, { useMasterKey: true });

  return {
    success: true,
    sessionToken: user.getSessionToken(),
    partner: {
      id: partner.id,
      name: partner.get('name'),
      email: partner.get('email'),
      partnerCode: partner.get('partnerCode'),
    }
  };
});

/**
 * loginPartner - Вход партнёра
 *
 * Вход: {
 *   email: string,
 *   password: string
 * }
 */
Parse.Cloud.define('loginPartner', async (request) => {
  const { email, password } = request.params;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const user = await Parse.User.logIn(email, password);

    if (user.get('role') !== 'partner') {
      throw new Error('Access denied');
    }

    const partner = user.get('partner');
    await partner.fetch({ useMasterKey: true });

    return {
      success: true,
      sessionToken: user.getSessionToken(),
      partner: {
        id: partner.id,
        name: partner.get('name'),
        email: partner.get('email'),
        partnerCode: partner.get('partnerCode'),
      }
    };
  } catch (error) {
    throw new Error('Login failed: ' + error.message);
  }
});

/**
 * getPartnerDashboard - Получить данные для дашборда партнёра
 *
 * Требует: авторизация (sessionToken)
 */
Parse.Cloud.define('getPartnerDashboard', async (request) => {
  if (!request.user) {
    throw new Error('Authentication required');
  }

  const partner = request.user.get('partner');
  await partner.fetch({ useMasterKey: true });

  const referralUrl = `${config.site.baseUrl}?ref=${partner.get('partnerCode')}`;

  // Получить последние заказы
  const ordersQuery = new Parse.Query('Order');
  ordersQuery.equalTo('partner', partner);
  ordersQuery.equalTo('status', 'paid');
  ordersQuery.descending('createdAt');
  ordersQuery.limit(10);
  ordersQuery.include('product');
  const recentOrders = await ordersQuery.find({ useMasterKey: true });

  // Получить заявки на вывод
  const withdrawalsQuery = new Parse.Query('WithdrawalRequest');
  withdrawalsQuery.equalTo('partner', partner);
  withdrawalsQuery.descending('createdAt');
  withdrawalsQuery.limit(5);
  const withdrawals = await withdrawalsQuery.find({ useMasterKey: true });

  return {
    success: true,
    partner: {
      id: partner.id,
      name: partner.get('name'),
      email: partner.get('email'),
      partnerCode: partner.get('partnerCode'),
      totalSales: partner.get('totalSales'),
      totalRevenue: partner.get('totalRevenue'),
      totalEarned: partner.get('totalEarned'),
      availableBalance: partner.get('availableBalance'),
      pendingBalance: partner.get('pendingBalance'),
      totalWithdrawn: partner.get('totalWithdrawn'),
    },
    referralUrl,
    recentOrders: recentOrders.map(o => ({
      id: o.id,
      orderId: o.get('orderId'),
      productName: o.get('product').get('name'),
      total: o.get('total'),
      currency: o.get('currency'),
      createdAt: o.get('createdAt'),
    })),
    withdrawals: withdrawals.map(w => ({
      id: w.id,
      requestId: w.get('requestId'),
      amount: w.get('amount'),
      status: w.get('status'),
      createdAt: w.get('createdAt'),
    })),
  };
});

/**
 * updatePaymentDetails - Обновить реквизиты партнёра
 *
 * Вход: {
 *   paymentMethod: string,
 *   cardNumber?: string,
 *   cardHolder?: string,
 *   bankName?: string,
 *   accountNumber?: string,
 *   bik?: string,
 *   paypalEmail?: string,
 *   cryptoAddress?: string
 * }
 */
Parse.Cloud.define('updatePaymentDetails', async (request) => {
  if (!request.user) {
    throw new Error('Authentication required');
  }

  const partner = request.user.get('partner');
  await partner.fetch({ useMasterKey: true });

  const { paymentMethod, ...details } = request.params;

  if (!paymentMethod) {
    throw new Error('Payment method is required');
  }

  // Найти или создать реквизиты
  const query = new Parse.Query('PaymentDetails');
  query.equalTo('partner', partner);
  let paymentDetails = await query.first({ useMasterKey: true });

  if (!paymentDetails) {
    const PaymentDetails = Parse.Object.extend('PaymentDetails');
    paymentDetails = new PaymentDetails();
    paymentDetails.set('partner', partner);
  }

  paymentDetails.set('paymentMethod', paymentMethod);

  // Маскировать номер карты (сохранить только последние 4 цифры)
  if (details.cardNumber) {
    const masked = '****' + details.cardNumber.slice(-4);
    paymentDetails.set('cardNumber', masked);
  }

  if (details.cardHolder) paymentDetails.set('cardHolder', details.cardHolder);
  if (details.bankName) paymentDetails.set('bankName', details.bankName);
  if (details.accountNumber) paymentDetails.set('accountNumber', details.accountNumber);
  if (details.bik) paymentDetails.set('bik', details.bik);
  if (details.paypalEmail) paymentDetails.set('paypalEmail', details.paypalEmail);
  if (details.cryptoAddress) paymentDetails.set('cryptoAddress', details.cryptoAddress);

  paymentDetails.set('isVerified', false); // Админ должен проверить

  await paymentDetails.save(null, { useMasterKey: true });

  return {
    success: true,
    paymentDetails: {
      id: paymentDetails.id,
      paymentMethod: paymentDetails.get('paymentMethod'),
      isVerified: paymentDetails.get('isVerified'),
    }
  };
});

/**
 * createWithdrawalRequest - Создать заявку на вывод средств
 *
 * Вход: {
 *   amount: number
 * }
 */
Parse.Cloud.define('createWithdrawalRequest', async (request) => {
  if (!request.user) {
    throw new Error('Authentication required');
  }

  const { amount } = request.params;

  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }

  const partner = request.user.get('partner');
  await partner.fetch({ useMasterKey: true });

  const availableBalance = partner.get('availableBalance') || 0;

  if (amount > availableBalance) {
    throw new Error('Insufficient balance');
  }

  // Проверить наличие реквизитов
  const detailsQuery = new Parse.Query('PaymentDetails');
  detailsQuery.equalTo('partner', partner);
  const paymentDetails = await detailsQuery.first({ useMasterKey: true });

  if (!paymentDetails) {
    throw new Error('Please set up payment details first');
  }

  // Создать заявку
  const WithdrawalRequest = Parse.Object.extend('WithdrawalRequest');
  const withdrawal = new WithdrawalRequest();

  const requestId = `WD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  withdrawal.set('requestId', requestId);
  withdrawal.set('partner', partner);
  withdrawal.set('amount', amount);
  withdrawal.set('currency', config.currency);
  withdrawal.set('status', 'pending');
  withdrawal.set('paymentDetails', paymentDetails);
  withdrawal.set('paymentMethod', paymentDetails.get('paymentMethod'));

  await withdrawal.save(null, { useMasterKey: true });

  // Обновить балансы партнёра
  partner.increment('availableBalance', -amount);
  partner.increment('pendingBalance', amount);
  await partner.save(null, { useMasterKey: true });

  // Отправить уведомление админу в Telegram
  await notifyAdminWithdrawal(withdrawal, partner);

  return {
    success: true,
    withdrawal: {
      id: withdrawal.id,
      requestId: withdrawal.get('requestId'),
      amount: withdrawal.get('amount'),
      status: withdrawal.get('status'),
    }
  };
});

/**
 * Вспомогательная функция - генерация кода партнёра
 */
function generatePartnerCode(name) {
  const base = name.replace(/\s+/g, '').substring(0, 8).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${base}_${random}`;
}

/**
 * Уведомление админу о новой заявке на вывод
 */
async function notifyAdminWithdrawal(withdrawal, partner) {
  const telegram = require('./telegram');

  const message = `
🔔 <b>Новая заявка на вывод</b>

👤 Партнёр: ${partner.get('name')}
💰 Сумма: ${withdrawal.get('amount')} ${withdrawal.get('currency')}
📝 Заявка: ${withdrawal.get('requestId')}
💳 Метод: ${withdrawal.get('paymentMethod')}

🕐 ${new Date().toLocaleString('ru-RU')}
  `.trim();

  for (const adminId of config.telegram.adminIds) {
    await telegram.sendMessage(adminId, message);
  }
}

module.exports = {
  generatePartnerCode,
  notifyAdminWithdrawal,
};
