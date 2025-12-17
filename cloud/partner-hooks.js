// Hooks для автоматического обновления балансов

const config = require('./config');

/**
 * После успешной оплаты - обновить баланс партнёра
 */
async function updatePartnerBalance(order, partner, commission) {
  if (!partner) return;

  // Обновить availableBalance
  partner.increment('availableBalance', commission);
  await partner.save(null, { useMasterKey: true });

  console.log(`Partner ${partner.get('name')} balance updated: +${commission}`);
}

/**
 * Уведомление админу о продаже
 */
async function notifyAdminSale(order, product, partner, partnerCommission) {
  const telegram = require('./telegram');

  const orderTotal = order.get('total');
  const currency = order.get('currency');
  const orderId = order.get('orderId');
  const productName = product.get('name');

  const adminMessage = `
✅ <b>Новая продажа!</b>

📦 Товар: ${productName}
💰 Сумма: ${orderTotal} ${currency}
📝 Заказ: ${orderId}
${partner ? `👥 Партнёр: ${partner.get('name')} (${partner.get('partnerCode')})` : ''}
${partnerCommission ? `💸 Комиссия партнёру: ${partnerCommission.commission} ${currency}` : ''}

🕐 ${new Date().toLocaleString('ru-RU')}
  `.trim();

  for (const adminId of config.telegram.adminIds) {
    await telegram.sendMessage(adminId, adminMessage);
  }
}

/**
 * Уведомление админу об ошибке
 */
async function notifyAdminError(errorType, errorMessage, context = {}) {
  const telegram = require('./telegram');

  const message = `
❌ <b>Ошибка в системе</b>

⚠️ Тип: ${errorType}
📝 Сообщение: ${errorMessage}

${Object.keys(context).length > 0 ? `Контекст:\n${JSON.stringify(context, null, 2)}` : ''}

🕐 ${new Date().toLocaleString('ru-RU')}
  `.trim();

  for (const adminId of config.telegram.adminIds) {
    await telegram.sendMessage(adminId, message);
  }
}

module.exports = {
  updatePartnerBalance,
  notifyAdminSale,
  notifyAdminError,
};
