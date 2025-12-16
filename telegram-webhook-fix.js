// В конец файла cloud-combined.js добавьте эту функцию:

// Публичная функция для Telegram Webhook (без требования аутентификации)
Parse.Cloud.define('telegramWebhookPublic', async (request) => {
  // Эта функция будет вызываться Telegram без аутентификации
  const update = request.params;

  if (!update) {
    return { success: false, error: 'No update provided' };
  }

  try {
    await handleWebhook(update);
    return { success: true };
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return { success: false, error: error.message };
  }
}, {
  requireUser: false // Отключаем требование аутентификации
});
