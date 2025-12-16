// Конфигурация Cloud Code

const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminIds: (process.env.ADMIN_TG_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean),
  },
  site: {
    baseUrl: process.env.BASE_SITE_URL || 'https://yoursite.com',
  },
  partner: {
    commissionRate: 0.5, // 50%
  },
  currency: 'RUB',
};

module.exports = config;
