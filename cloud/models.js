// Модели данных и инициализация

const config = require('./config');

/**
 * Инициализация стартовых продуктов
 */
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

/**
 * Генерация уникального номера заказа
 */
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
}

/**
 * Генерация уникального партнёрского кода
 */
function generatePartnerCode(telegramUsername) {
  const base = telegramUsername ? telegramUsername.replace('@', '').toUpperCase() : '';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return base ? `${base}_${random}` : `PARTNER_${random}`;
}

/**
 * Получить продукт по productId
 */
async function getProductByProductId(productId) {
  const query = new Parse.Query('Product');
  query.equalTo('productId', productId);
  query.equalTo('isActive', true);
  return await query.first({ useMasterKey: true });
}

/**
 * Получить партнёра по коду
 */
async function getPartnerByCode(partnerCode) {
  if (!partnerCode) return null;

  const query = new Parse.Query('Partner');
  query.equalTo('partnerCode', partnerCode);
  query.equalTo('isActive', true);
  return await query.first({ useMasterKey: true });
}

/**
 * Получить партнёра по Telegram ID
 */
async function getPartnerByTelegramId(telegramUserId) {
  if (!telegramUserId) return null;

  const query = new Parse.Query('Partner');
  query.equalTo('telegramUserId', telegramUserId);
  return await query.first({ useMasterKey: true });
}

/**
 * Создать или обновить партнёра
 */
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

/**
 * Начислить комиссию партнёру
 */
async function creditPartnerCommission(order, partner) {
  const commission = order.get('total') * config.partner.commissionRate;

  // Обновить статистику партнёра
  partner.increment('totalSales', 1);
  partner.increment('totalRevenue', order.get('total'));
  partner.increment('totalEarned', commission);
  await partner.save(null, { useMasterKey: true });

  // Создать запись в PartnerLedger
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

module.exports = {
  initializeProducts,
  generateOrderId,
  generatePartnerCode,
  getProductByProductId,
  getPartnerByCode,
  getPartnerByTelegramId,
  createOrUpdatePartner,
  creditPartnerCommission,
};
