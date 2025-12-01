export type Language = 'vi' | 'en';

export interface Translations {
  [key: string]: string | Translations;
}

const vi: Translations = {
  common: {
    ok: 'OK',
    cancel: 'Hủy',
    save: 'Lưu',
    delete: 'Xóa',
    edit: 'Sửa',
    loading: 'Đang tải...',
  },
  auth: {
    login: 'Đăng nhập',
    register: 'Đăng ký',
    logout: 'Đăng xuất',
  },
  profile: {
    title: 'Cá nhân',
    edit: 'Chỉnh sửa',
  },
};

const en: Translations = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
  },
  auth: {
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
  },
  profile: {
    title: 'Profile',
    edit: 'Edit',
  },
};

const translations: Record<Language, Translations> = {
  vi,
  en,
};

export class I18n {
  private static currentLanguage: Language = 'vi';

  static setLanguage(language: Language): void {
    this.currentLanguage = language;
  }

  static getLanguage(): Language {
    return this.currentLanguage;
  }

  static t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];

    for (const k of keys) {
      value = value?.[k];
      if (!value) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(`{{${paramKey}}}`, paramValue),
        value
      );
    }

    return value;
  }
}

