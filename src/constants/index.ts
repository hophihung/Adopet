// App-wide constants
export const APP_CONFIG = {
  APP_NAME: 'AdoPet',
  VERSION: '1.0.0',
} as const;

export const API_ENDPOINTS = {
  AUTH: '/auth',
  PETS: '/pets',
  ADOPTION: '/adoption',
  USER: '/user',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@adopet:auth_token',
  USER_DATA: '@adopet:user_data',
  THEME: '@adopet:theme',
} as const;

