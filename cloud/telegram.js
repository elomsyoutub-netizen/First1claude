// Telegram Bot Logic

const config = require('./config');
const models = require('./models');

/**
 * Отправить HTTP запрос к Telegram Bot API
 */
async function telegramRequest(method, params = {}) {
  const Parse = require('parse/node');

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

/**
 * Отправить сообщение в Telegram
 */
async function sendMessage(chatId, text, options = {}) {
  return await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || 'HTML',
    ...options,
  });
}

/**
 * Отправить уведомления о продаже
 */
async function sendSaleNotifications(order, product, partner, partnerCommission) {
  const orderTotal = order.get('total');
  const currency = order.get('currency');
  const orderId = order.get('orderId');
  const productName = product.get('name');

  // Уведомление админам
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

  // Уведомление партнёру
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

/**
 * Обработать команду /start
 */
async function handleStart(chatId, userId, username, firstName) {
  const isAdmin = config.telegram.adminIds.includes(userId);

  // Регистрация как партнёр
  const partner = await models.createOrUpdatePartner(userId, username, firstName);

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

/**
 * Обработать callback query - статистика партнёра
 */
async function handleMyStats(chatId, userId) {
  const partner = await models.getPartnerByTelegramId(userId);

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

/**
 * Обработать callback query - статистика админа
 */
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

/**
 * Обработать входящий webhook от Telegram
 */
async function handleWebhook(update) {
  try {
    // Обработка команд
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

    // Обработка callback queries (кнопки)
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const userId = update.callback_query.from.id;
      const data = update.callback_query.data;

      // Подтвердить callback
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

/**
 * Cloud Function для Telegram Webhook
 */
Parse.Cloud.define('telegramWebhook', async (request) => {
  const update = request.params;

  if (!update) {
    throw new Error('No update provided');
  }

  await handleWebhook(update);

  return { success: true };
});

module.exports = {
  sendMessage,
  sendSaleNotifications,
  handleWebhook,
};
