export type Currency = 'VND' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  exchangeRate: number; // Rate to VND
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  VND: {
    code: 'VND',
    symbol: '₫',
    name: 'Việt Nam Đồng',
    exchangeRate: 1,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRate: 25000, // 1 USD = 25000 VND
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    exchangeRate: 27000, // 1 EUR = 27000 VND
  },
};

export class CurrencyConverter {
  static convert(amount: number, from: Currency, to: Currency): number {
    if (from === to) return amount;
    
    const fromRate = CURRENCIES[from].exchangeRate;
    const toRate = CURRENCIES[to].exchangeRate;
    
    // Convert to VND first, then to target currency
    const vndAmount = amount * fromRate;
    return vndAmount / toRate;
  }

  static format(amount: number, currency: Currency = 'VND'): string {
    const config = CURRENCIES[currency];
    
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

