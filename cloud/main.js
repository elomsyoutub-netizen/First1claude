// Parse Cloud Code - Main Entry Point

const models = require('./models');

// Загрузить API Cloud Functions
require('./api');

// Загрузить Telegram Bot
require('./telegram');

/**
 * afterSave hook для инициализации стартовых данных
 */
Parse.Cloud.afterSave(Parse.User, async (request) => {
  // Инициализация продуктов при первом пользователе
  if (request.object.isNew()) {
    try {
      await models.initializeProducts();
    } catch (error) {
      console.error('Error initializing products:', error);
    }
  }
});

/**
 * Job для инициализации продуктов вручную
 */
Parse.Cloud.job('initializeProducts', async (request) => {
  try {
    await models.initializeProducts();
    request.message('Products initialized successfully');
  } catch (error) {
    request.message(`Error: ${error.message}`);
  }
});

console.log('Cloud Code loaded successfully');
