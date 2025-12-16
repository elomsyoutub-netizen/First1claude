// ============================================
// ОБЪЕДИНЁННЫЙ CLOUD CODE ДЛЯ BACK4APP
// Скопируйте всё содержимое этого файла в Back4App Cloud Code Editor
// ============================================

// ============================================
// CONFIG
// ============================================
const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminIds: (process.env.ADMIN_TG_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean),
  },
  site: {
    baseUrl: process.env.BASE_SITE_URL || 'https://yoursite.com',
  },
  partner: {
    commissionRate: 0.5,
  },
  currency: 'RUB',
};

// ============================================
// MODELS
// ============================================
async function initializeProducts() {
  const query = new Parse.Query('Product');
  const count = await query.count({ useMasterKey: true });

  if (count > 0) {
    console.log('Products already initialized');
    return;
  }

  const products = [
    {
      productId: 'digital_product',
      name: 'Цифровой продукт',
      price: 1000,
      currency: 'RUB',
      type: 'digital',
      payload: 'https://example.com/download/secret-key-12345',
      isActive: true,
    },
    {
      productId: 'apple',
      name: 'Яблоко',
      price: 1000,
      currency: 'RUB',
      type: 'other',
      payload: '🍎 Ваше яблоко готово к выдаче!',
      isActive: true,
    },
  ];

  for (const data of products) {
    const Product = Parse.Object.extend('Product');
    const product = new Product();
    await product.save(data, { useMasterKey: true });
    console.log(`Product created: ${data.productId}`);
  }
}

function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
}

function generatePartnerCode(telegramUsername) {
  const base = telegramUsername ? telegramUsername.replace('@', '').toUpperCase() : '';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return base ? `${base}_${random}` : `PARTNER_${random}`;
}

async function getProductByProductId(productId) {
  const query = new Parse.Query('Product');
  query.equalTo('productId', productId);
  query.equalTo('isActive', true);
  return await query.first({ useMasterKey: true });
}

async function getPartnerByCode(partnerCode) {
  if (!partnerCode) return null;

  const query = new Parse.Query('Partner');
  query.equalTo('partnerCode', partnerCode);
  query.equalTo('isActive', true);
  return await query.first({ useMasterKey: true });
}

async function getPartnerByTelegramId(telegramUserId) {
  if (!telegramUserId) return null;

  const query = new Parse.Query('Partner');
  query.equalTo('telegramUserId', telegramUserId);
  return await query.first({ useMasterKey: true });
}

async function createOrUpdatePartner(telegramUserId, telegramUsername, name) {
  let partner = await getPartnerByTelegramId(telegramUserId);

  if (!partner) {
    const Partner = Parse.Object.extend('Partner');
    partner = new Partner();
    partner.set('telegramUserId', telegramUserId);
    partner.set('partnerCode', generatePartnerCode(telegramUsername));
    partner.set('totalSales', 0);
    partner.set('totalRevenue', 0);
    partner.set('totalEarned', 0);
    partner.set('isActive', true);
  }

  partner.set('telegramUsername', telegramUsername || '');
  partner.set('name', name || telegramUsername || 'Partner');

  await partner.save(null, { useMasterKey: true });
  return partner;
}

async function creditPartnerCommission(order, partner) {
  const commission = order.get('total') * config.partner.commissionRate;

  partner.increment('totalSales', 1);
  partner.increment('totalRevenue', order.get('total'));
  partner.increment('totalEarned', commission);
  await partner.save(null, { useMasterKey: true });

  const PartnerLedger = Parse.Object.extend('PartnerLedger');
  const ledger = new PartnerLedger();
  ledger.set('partner', partner);
  ledger.set('order', order);
  ledger.set('orderTotal', order.get('total'));
  ledger.set('commission', commission);
  ledger.set('commissionRate', config.partner.commissionRate);
  ledger.set('type', 'sale');
  await ledger.save(null, { useMasterKey: true });

  return { commission, ledger };
}

// ============================================
// TELEGRAM
// ============================================
async function telegramRequest(method, params = {}) {
  if (!config.telegram.botToken) {
    console.log('TELEGRAM_BOT_TOKEN not set, skipping telegram request');
    return null;
  }

  const url = `https://api.telegram.org/bot${config.telegram.botToken}/${method}`;

  try {
    const response = await Parse.Cloud.httpRequest({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: params,
    });

    return response.data;
  } catch (error) {
    console.error('Telegram API error:', error);
    return null;
  }
}

async function sendMessage(chatId, text, options = {}) {
  return await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || 'HTML',
    ...options,
  });
}

async function sendSaleNotifications(order, product, partner, partnerCommission) {
  const orderTotal = order.get('total');
  const currency = order.get('currency');
  const orderId = order.get('orderId');
  const productName = product.get('name');

  const adminMessage = `
🎉 <b>Новая продажа!</b>

📦 Товар: ${productName}
💰 Сумма: ${orderTotal} ${currency}
📝 Заказ: ${orderId}
${partner ? `👥 Партнёр: ${partner.get('name')} (${partner.get('partnerCode')})` : ''}
${partnerCommission ? `💸 Комиссия партнёру: ${partnerCommission.commission} ${currency}` : ''}

🕐 ${new Date().toLocaleString('ru-RU')}
  `.trim();

  for (const adminId of config.telegram.adminIds) {
    await sendMessage(adminId, adminMessage);
  }

  if (partner && partnerCommission) {
    const partnerTgId = partner.get('telegramUserId');

    const partnerMessage = `
💰 <b>Продажа по вашей ссылке!</b>

📦 Товар: ${productName}
💵 Сумма: ${orderTotal} ${currency}
✅ Ваша комиссия: ${partnerCommission.commission} ${currency}

📊 <b>Статистика:</b>
• Продаж: ${partner.get('totalSales')}
• Оборот: ${partner.get('totalRevenue')} ${currency}
• Заработано: ${partner.get('totalEarned')} ${currency}

🕐 ${new Date().toLocaleString('ru-RU')}
    `.trim();

    await sendMessage(partnerTgId, partnerMessage);
  }
}

async function handleStart(chatId, userId, username, firstName) {
  const isAdmin = config.telegram.adminIds.includes(userId);

  const partner = await createOrUpdatePartner(userId, username, firstName);

  const referralUrl = `${config.site.baseUrl}?ref=${partner.get('partnerCode')}`;

  let message = `
👋 Привет, ${firstName}!

${isAdmin ? '👑 <b>Вы администратор</b>\n\n' : ''}🔗 <b>Ваша реферальная ссылка:</b>
<code>${referralUrl}</code>

📊 Используйте кнопки ниже для просмотра статистики.
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [{ text: '📊 Моя статистика', callback_data: 'my_stats' }],
    ],
  };

  if (isAdmin) {
    keyboard.inline_keyboard.push([
      { text: '👑 Админ статистика', callback_data: 'admin_stats' },
    ]);
  }

  await sendMessage(chatId, message, {
    reply_markup: keyboard,
  });
}

async function handleMyStats(chatId, userId) {
  const partner = await getPartnerByTelegramId(userId);

  if (!partner) {
    await sendMessage(chatId, '❌ Партнёр не найден. Используйте /start');
    return;
  }

  const referralUrl = `${config.site.baseUrl}?ref=${partner.get('partnerCode')}`;

  const message = `
📊 <b>Ваша статистика</b>

🔗 <b>Реферальная ссылка:</b>
<code>${referralUrl}</code>

📈 <b>Показатели:</b>
• Продаж: ${partner.get('totalSales')}
• Оборот: ${partner.get('totalRevenue')} ${config.currency}
• Заработано (50%): ${partner.get('totalEarned')} ${config.currency}

💡 Делитесь ссылкой и зарабатывайте 50% с каждой продажи!
  `.trim();

  await sendMessage(chatId, message);
}

async function handleAdminStats(chatId, userId) {
  const isAdmin = config.telegram.adminIds.includes(userId);

  if (!isAdmin) {
    await sendMessage(chatId, '❌ Доступ запрещён');
    return;
  }

  try {
    const stats = await Parse.Cloud.run('getAdminStats', { telegramUserId: userId }, { useMasterKey: true });

    let message = `
👑 <b>Админ статистика</b>

💰 <b>Общие показатели:</b>
• Заказов: ${stats.stats.totalOrders}
• Выручка: ${stats.stats.totalRevenue} ${stats.stats.currency}

👥 <b>Топ партнёры:</b>
${stats.partners.map((p, i) => `${i + 1}. ${p.name} - ${p.totalSales} продаж, ${p.totalEarned} ${config.currency}`).join('\n')}

📦 <b>Последние продажи:</b>
${stats.recentOrders.slice(0, 5).map(o => `• ${o.productName} - ${o.total} ${o.currency}${o.partnerName ? ` (${o.partnerName})` : ''}`).join('\n')}
    `.trim();

    await sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in handleAdminStats:', error);
    await sendMessage(chatId, '❌ Ошибка получения статистики');
  }
}

async function handleWebhook(update) {
  try {
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const username = update.message.from.username;
      const firstName = update.message.from.first_name;
      const text = update.message.text;

      if (text === '/start') {
        await handleStart(chatId, userId, username, firstName);
        return;
      }
    }

    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const userId = update.callback_query.from.id;
      const data = update.callback_query.data;

      await telegramRequest('answerCallbackQuery', {
        callback_query_id: update.callback_query.id,
      });

      if (data === 'my_stats') {
        await handleMyStats(chatId, userId);
        return;
      }

      if (data === 'admin_stats') {
        await handleAdminStats(chatId, userId);
        return;
      }
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
  }
}

// ============================================
// CLOUD FUNCTIONS
// ============================================

Parse.Cloud.define('getProducts', async (request) => {
  const query = new Parse.Query('Product');
  query.equalTo('isActive', true);
  query.select(['productId', 'name', 'price', 'currency', 'type']);

  const products = await query.find({ useMasterKey: true });

  return {
    success: true,
    products: products.map(p => ({
      id: p.id,
      productId: p.get('productId'),
      name: p.get('name'),
      price: p.get('price'),
      currency: p.get('currency'),
      type: p.get('type'),
    })),
  };
});

Parse.Cloud.define('createOrder', async (request) => {
  const { productId, partnerCode, customerEmail, customerTelegramId } = request.params;

  if (!productId) {
    throw new Error('productId is required');
  }

  const product = await getProductByProductId(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  let partner = null;
  if (partnerCode) {
    partner = await getPartnerByCode(partnerCode);
  }

  const Order = Parse.Object.extend('Order');
  const order = new Order();

  const orderId = generateOrderId();

  order.set('orderId', orderId);
  order.set('product', product);
  order.set('productSnapshot', {
    productId: product.get('productId'),
    name: product.get('name'),
    price: product.get('price'),
    type: product.get('type'),
  });
  order.set('total', product.get('price'));
  order.set('currency', product.get('currency'));
  order.set('status', 'created');
  order.set('paymentIdempotencyKey', null);

  if (partner) {
    order.set('partnerCode', partnerCode);
    order.set('partner', partner);
  }

  if (customerEmail) {
    order.set('customerEmail', customerEmail);
  }

  if (customerTelegramId) {
    order.set('customerTelegramId', customerTelegramId);
  }

  await order.save(null, { useMasterKey: true });

  return {
    success: true,
    order: {
      id: order.id,
      orderId: order.get('orderId'),
      productId: product.get('productId'),
      productName: product.get('name'),
      total: order.get('total'),
      currency: order.get('currency'),
      status: order.get('status'),
    },
  };
});

Parse.Cloud.define('confirmTestPayment', async (request) => {
  const { orderId, paymentIdempotencyKey } = request.params;

  if (!orderId || !paymentIdempotencyKey) {
    throw new Error('orderId and paymentIdempotencyKey are required');
  }

  let query = new Parse.Query('Order');
  query.equalTo('paymentIdempotencyKey', paymentIdempotencyKey);
  const existingPayment = await query.first({ useMasterKey: true });

  if (existingPayment) {
    const product = existingPayment.get('product');
    await product.fetch({ useMasterKey: true });

    return {
      success: true,
      alreadyPaid: true,
      order: {
        id: existingPayment.id,
        orderId: existingPayment.get('orderId'),
        status: existingPayment.get('status'),
        total: existingPayment.get('total'),
        currency: existingPayment.get('currency'),
      },
      payload: product.get('payload'),
    };
  }

  query = new Parse.Query('Order');
  query.equalTo('orderId', orderId);
  const order = await query.first({ useMasterKey: true });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.get('status') !== 'created') {
    throw new Error('Order already processed');
  }

  const product = order.get('product');
  await product.fetch({ useMasterKey: true });

  order.set('status', 'paid');
  order.set('paymentIdempotencyKey', paymentIdempotencyKey);
  order.set('deliveredAt', new Date());
  await order.save(null, { useMasterKey: true });

  let partnerCommission = null;
  const partner = order.get('partner');
  if (partner) {
    await partner.fetch({ useMasterKey: true });
    partnerCommission = await creditPartnerCommission(order, partner);
  }

  await sendSaleNotifications(order, product, partner, partnerCommission);

  return {
    success: true,
    alreadyPaid: false,
    order: {
      id: order.id,
      orderId: order.get('orderId'),
      status: order.get('status'),
      total: order.get('total'),
      currency: order.get('currency'),
      deliveredAt: order.get('deliveredAt'),
    },
    payload: product.get('payload'),
  };
});

Parse.Cloud.define('getPartnerStats', async (request) => {
  const { telegramUserId } = request.params;

  if (!telegramUserId) {
    throw new Error('telegramUserId is required');
  }

  const partner = await getPartnerByTelegramId(telegramUserId);

  if (!partner) {
    throw new Error('Partner not found');
  }

  const referralUrl = `${config.site.baseUrl}?ref=${partner.get('partnerCode')}`;

  return {
    success: true,
    partner: {
      id: partner.id,
      partnerCode: partner.get('partnerCode'),
      name: partner.get('name'),
      totalSales: partner.get('totalSales'),
      totalRevenue: partner.get('totalRevenue'),
      totalEarned: partner.get('totalEarned'),
      isActive: partner.get('isActive'),
    },
    referralUrl,
  };
});

Parse.Cloud.define('getAdminStats', async (request) => {
  const { telegramUserId } = request.params;

  if (!telegramUserId) {
    throw new Error('telegramUserId is required');
  }

  if (!config.telegram.adminIds.includes(telegramUserId)) {
    throw new Error('Access denied');
  }

  const ordersQuery = new Parse.Query('Order');
  ordersQuery.equalTo('status', 'paid');
  const paidOrders = await ordersQuery.find({ useMasterKey: true });

  const totalOrders = paidOrders.length;
  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.get('total'), 0);

  const partnersQuery = new Parse.Query('Partner');
  partnersQuery.greaterThan('totalSales', 0);
  partnersQuery.descending('totalRevenue');
  partnersQuery.limit(10);
  const topPartners = await partnersQuery.find({ useMasterKey: true });

  const recentOrdersQuery = new Parse.Query('Order');
  recentOrdersQuery.equalTo('status', 'paid');
  recentOrdersQuery.descending('createdAt');
  recentOrdersQuery.limit(10);
  recentOrdersQuery.include('product');
  recentOrdersQuery.include('partner');
  const recentOrders = await recentOrdersQuery.find({ useMasterKey: true });

  return {
    success: true,
    stats: {
      totalOrders,
      totalRevenue,
      currency: config.currency,
    },
    partners: topPartners.map(p => ({
      id: p.id,
      name: p.get('name'),
      partnerCode: p.get('partnerCode'),
      totalSales: p.get('totalSales'),
      totalRevenue: p.get('totalRevenue'),
      totalEarned: p.get('totalEarned'),
    })),
    recentOrders: recentOrders.map(o => {
      const product = o.get('product');
      const partner = o.get('partner');

      return {
        id: o.id,
        orderId: o.get('orderId'),
        productName: product ? product.get('name') : 'N/A',
        total: o.get('total'),
        currency: o.get('currency'),
        partnerName: partner ? partner.get('name') : null,
        createdAt: o.get('createdAt'),
      };
    }),
  };
});

Parse.Cloud.define('telegramWebhook', async (request) => {
  const update = request.params;

  if (!update) {
    throw new Error('No update provided');
  }

  await handleWebhook(update);

  return { success: true };
});

// ============================================
// HOOKS & JOBS
// ============================================

Parse.Cloud.afterSave(Parse.User, async (request) => {
  if (request.object.isNew()) {
    try {
      await initializeProducts();
    } catch (error) {
      console.error('Error initializing products:', error);
    }
  }
});

Parse.Cloud.job('initializeProducts', async (request) => {
  try {
    await initializeProducts();
    request.message('Products initialized successfully');
  } catch (error) {
    request.message(`Error: ${error.message}`);
  }
});

console.log('Cloud Code loaded successfully');
