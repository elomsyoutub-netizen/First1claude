// API модуль для работы с Parse Server

const API = {
  /**
   * Вызов Cloud Function
   */
  async callFunction(functionName, params = {}, useSession = false) {
    const headers = {
      'X-Parse-Application-Id': CONFIG.appId,
      'X-Parse-Client-Key': CONFIG.clientKey,
      'Content-Type': 'application/json',
    };

    if (useSession) {
      const sessionToken = localStorage.getItem('sessionToken');
      if (sessionToken) {
        headers['X-Parse-Session-Token'] = sessionToken;
      }
    }

    const response = await fetch(`${CONFIG.parseUrl}/parse/functions/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }

    return data.result;
  },

  /**
   * Регистрация партнёра
   */
  async registerPartner(email, password, name, phone) {
    return await this.callFunction('registerPartner', {
      email,
      password,
      name,
      phone,
    });
  },

  /**
   * Вход партнёра
   */
  async loginPartner(email, password) {
    return await this.callFunction('loginPartner', {
      email,
      password,
    });
  },

  /**
   * Получить дашборд
   */
  async getDashboard() {
    return await this.callFunction('getPartnerDashboard', {}, true);
  },

  /**
   * Обновить реквизиты
   */
  async updatePaymentDetails(details) {
    return await this.callFunction('updatePaymentDetails', details, true);
  },

  /**
   * Создать заявку на вывод
   */
  async createWithdrawal(amount) {
    return await this.callFunction('createWithdrawalRequest', { amount }, true);
  },

  /**
   * Выход
   */
  logout() {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('partner');
    window.location.href = 'index.html';
  },

  /**
   * Проверка авторизации
   */
  isAuthenticated() {
    return !!localStorage.getItem('sessionToken');
  },

  /**
   * Получить данные партнёра из локального хранилища
   */
  getPartnerInfo() {
    const partnerData = localStorage.getItem('partner');
    return partnerData ? JSON.parse(partnerData) : null;
  },
};
