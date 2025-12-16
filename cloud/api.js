// Cloud Functions API

const config = require('./config');
const models = require('./models');
const telegram = require('./telegram');

/**
 * getProducts - Получить список активных товаров
 *
 * Вход: {}
 * Выход: { products: [...] }
 */
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

/**
 * createOrder - Создать новый заказ
 *
 * Вход: {
 *   productId: string,
 *   partnerCode?: string,
 *   customerEmail?: string,
 *   customerTelegramId?: number
 * }
 *
 * Выход: {
 *   success: true,
 *   order: { orderId, total, ... }
 * }
 */
Parse.Cloud.define('createOrder', async (request) => {
  const { productId, partnerCode, customerEmail, customerTelegramId } = request.params;

  if (!productId) {
    throw new Error('productId is required');
  }

  // Получить товар
  const product = await models.getProductByProductId(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Получить партнёра (если указан)
  let partner = null;
  if (partnerCode) {
    partner = await models.getPartnerByCode(partnerCode);
  }

  // Создать заказ
  const Order = Parse.Object.extend('Order');
  const order = new Order();

  const orderId = models.generateOrderId();

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

/**
 * confirmTestPayment - Подтвердить тестовую оплату
 *
 * Вход: {
 *   orderId: string,
 *   paymentIdempotencyKey: string
 * }
 *
 * Выход: {
 *   success: true,
 *   order: { ... },
 *   payload: string
 * }
 */
Parse.Cloud.define('confirmTestPayment', async (request) => {
  const { orderId, paymentIdempotencyKey } = request.params;

  if (!orderId || !paymentIdempotencyKey) {
    throw new Error('orderId and paymentIdempotencyKey are required');
  }

  // Проверить идемпотентность
  let query = new Parse.Query('Order');
  query.equalTo('paymentIdempotencyKey', paymentIdempotencyKey);
  const existingPayment = await query.first({ useMasterKey: true });

  if (existingPayment) {
    // Повторный вызов - вернуть тот же результат
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

  // Получить заказ
  query = new Parse.Query('Order');
  query.equalTo('orderId', orderId);
  const order = await query.first({ useMasterKey: true });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.get('status') !== 'created') {
    throw new Error('Order already processed');
  }

  // Получить товар
  const product = order.get('product');
  await product.fetch({ useMasterKey: true });

  // Обновить заказ
  order.set('status', 'paid');
  order.set('paymentIdempotencyKey', paymentIdempotencyKey);
  order.set('deliveredAt', new Date());
  await order.save(null, { useMasterKey: true });

  // Начислить партнёрскую комиссию
  let partnerCommission = null;
  const partner = order.get('partner');
  if (partner) {
    await partner.fetch({ useMasterKey: true });
    partnerCommission = await models.creditPartnerCommission(order, partner);
  }

  // Отправить уведомления в Telegram
  await telegram.sendSaleNotifications(order, product, partner, partnerCommission);

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

/**
 * getPartnerStats - Получить статистику партнёра
 *
 * Вход: {
 *   telegramUserId: number
 * }
 *
 * Выход: {
 *   success: true,
 *   partner: { ... },
 *   referralUrl: string
 * }
 */
Parse.Cloud.define('getPartnerStats', async (request) => {
  const { telegramUserId } = request.params;

  if (!telegramUserId) {
    throw new Error('telegramUserId is required');
  }

  const partner = await models.getPartnerByTelegramId(telegramUserId);

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

/**
 * getAdminStats - Получить статистику для админа
 *
 * Вход: {
 *   telegramUserId: number
 * }
 *
 * Выход: {
 *   success: true,
 *   stats: { totalOrders, totalRevenue, ... },
 *   partners: [...],
 *   recentOrders: [...]
 * }
 */
Parse.Cloud.define('getAdminStats', async (request) => {
  const { telegramUserId } = request.params;

  if (!telegramUserId) {
    throw new Error('telegramUserId is required');
  }

  // Проверить права админа
  if (!config.telegram.adminIds.includes(telegramUserId)) {
    throw new Error('Access denied');
  }

  // Общая статистика заказов
  const ordersQuery = new Parse.Query('Order');
  ordersQuery.equalTo('status', 'paid');
  const paidOrders = await ordersQuery.find({ useMasterKey: true });

  const totalOrders = paidOrders.length;
  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.get('total'), 0);

  // Статистика партнёров
  const partnersQuery = new Parse.Query('Partner');
  partnersQuery.greaterThan('totalSales', 0);
  partnersQuery.descending('totalRevenue');
  partnersQuery.limit(10);
  const topPartners = await partnersQuery.find({ useMasterKey: true });

  // Последние заказы
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

module.exports = {
  // Экспорт для использования в других модулях
};
