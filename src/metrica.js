// Yandex.Metrica goals helper
const METRIKA_ID = 109602539;

/** Доступные цели для Metrika */
export const GOALS = {
  /** Вход в аккаунт */
  LOGIN: 'login',
  /** Регистрация нового пользователя */
  REGISTRATION: 'registration',
  /** Пополнение баланса */
  TOPUP: 'topup',
  /** Копирование API-ключа */
  API_KEY_COPY: 'api_key_copy',
  /** Оплата подписки Base — ежемесячно */
  SUBSCRIPTION_BASE_MONTHLY: 'subscription_paid_base_monthly',
  /** Оплата подписки Base — ежегодно */
  SUBSCRIPTION_BASE_YEARLY: 'subscription_paid_base_yearly',
  /** Оплата подписки Pro — ежемесячно */
  SUBSCRIPTION_PRO_MONTHLY: 'subscription_paid_pro_monthly',
  /** Оплата подписки Pro — ежегодно */
  SUBSCRIPTION_PRO_YEARLY: 'subscription_paid_pro_yearly',
};

export function reachGoal(name, params) {
  try {
    if (typeof window.ym === 'function') {
      window.ym(METRIKA_ID, 'reachGoal', name, params);
    }
  } catch (e) {
    // silently ignore — metrica may not be loaded
  }
}
