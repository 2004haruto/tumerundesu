// src/services/api.ts

import { Platform } from 'react-native';

// 開発環境でのAPI接続設定
const getApiUrl = () => {
  // 環境変数が設定されている場合はそれを優先使用
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log(`Using environment API URL: ${process.env.EXPO_PUBLIC_API_URL}`);
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (__DEV__) {
    // 環境変数がない場合の警告
    console.warn('⚠️ EXPO_PUBLIC_API_URL is not set in .env file');
    console.warn('⚠️ Using fallback localhost. Please set EXPO_PUBLIC_API_URL in .env');
    
    let host: string;
    
    // プラットフォームに応じてホストを選択（フォールバック）
    if (Platform.OS === 'web') {
      // Webブラウザの場合はlocalhost
      host = 'localhost';
    } else if (Platform.OS === 'android') {
      // Android エミュレータの場合は10.0.2.2
      host = '10.0.2.2';
    } else {
      // iOS/その他の場合はlocalhostをフォールバック
      host = 'localhost';
    }
    
    console.log(`Platform: ${Platform.OS}, Fallback API Host: ${host}`);
    return `http://${host}:3001/api`;
  }
  
  // 本番環境では実際のサーバーURLを指定
  return 'https://your-production-api.com/api';
};

// 環境変数を優先して使用
export const API_BASE_URL = getApiUrl();

// デバッグ用：API URLをコンソールに出力
console.log('API Base URL:', API_BASE_URL);

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  bento_box_size?: string;
  allergies?: string;
  preferences?: string;
  goal_calories?: number;
  weight?: number;
  activity_level?: 'low' | 'mid' | 'high';
  region?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  allergies?: string;
  preferences?: string;
  bento_box_size?: string;
  // お弁当サイズ設定
  bento_capacity?: string; // 容量(ml)
  bento_width?: string;    // 横幅(cm)
  bento_length?: string;   // 縦(cm)
  bento_height?: string;   // 高さ(cm)
}

export interface PasswordUpdateData {
  current_password: string;
  new_password: string;
}

export interface UserProfileResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    weight?: number;
    goal_calories?: number;
    allergies?: string;
    preferences?: string;
    bento_box_size?: string;
    activity_level?: 'low' | 'mid' | 'high';
    // 詳細お弁当サイズ設定
    bento_capacity?: string; // 容量(ml)
    bento_width?: string;    // 横幅(cm)
    bento_length?: string;   // 縦(cm)
    bento_height?: string;   // 高さ(cm)
    use_detailed_size?: boolean; // 詳細サイズ使用フラグ
  };
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ApiError {
  error?: string;
  message?: string;
  details?: string[];
  status?: number;
}

// 認証関連のエラータイプ
export enum AuthErrorType {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AuthError extends Error {
  public type: AuthErrorType;
  public status: number;
  public details?: string[];

  constructor(type: AuthErrorType, message: string, status: number = 0, details?: string[]) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      if (__DEV__) {
        console.log('🌐 API Request URL:', url);
        console.log('📱 Platform:', Platform.OS);
        console.log('🔧 Config:', JSON.stringify(config, null, 2));
        console.log('📦 Final headers being sent:', config.headers);
      }
      
      // タイムアウト処理を追加（30秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        if (__DEV__) {
          console.error('JSON parse error:', jsonError);
        }
        throw {
          status: response.status,
          message: `サーバーからの応答が正しくありません (${response.status})`,
        };
      }

      if (!response.ok) {
        // 認証関連のエラーハンドリング
        if (endpoint.includes('/auth/')) {
          // 認証関連エラーは想定内のため、開発時のみログ出力
          if (__DEV__ && response.status >= 500) {
            console.error('Server Error:', response.status, data);
          }
          this.handleAuthError(response.status, data);
        } else {
          // 認証以外のAPIエラーは常にログ出力
          console.error('API Error:', response.status, data);
        }
        
        throw {
          status: response.status,
          message: data.message || data.error || `API request failed (${response.status})`,
          details: data.details,
        };
      }

      if (__DEV__) {
        console.log('API Success');
      }
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      
      // ネットワークエラーやその他のエラー
      if (__DEV__) {
        console.error('🚫 Network error details:', {
          name: error.name,
          message: error.message,
          url: url,
          platform: Platform.OS
        });
      }
      
      // タイムアウトエラーの特別処理
      if (error.name === 'AbortError') {
        throw new AuthError(
          AuthErrorType.NETWORK_ERROR,
          'リクエストがタイムアウトしました。ネットワーク接続を確認してください。'
        );
      }
      
      if (endpoint.includes('/auth/')) {
        throw new AuthError(
          AuthErrorType.NETWORK_ERROR,
          `ネットワークエラーが発生しました。\nインターネット接続を確認してください。`,
          0
        );
      }
      
      throw {
        status: 0,
        message: `ネットワークエラーが発生しました。\nサーバーURL: ${url}\nバックエンドサーバーが起動していることを確認してください。`,
      };
    }
  }

  // 認証エラーの詳細ハンドリング
  private handleAuthError(status: number, data: any): never {
    const errorCode = data.error;
    const message = data.message;

    switch (errorCode) {
      case 'USER_NOT_FOUND':
        throw new AuthError(AuthErrorType.USER_NOT_FOUND, message, status);
      
      case 'INVALID_PASSWORD':
        throw new AuthError(AuthErrorType.INVALID_PASSWORD, message, status);
      
      case 'EMAIL_ALREADY_EXISTS':
        throw new AuthError(AuthErrorType.EMAIL_ALREADY_EXISTS, message, status);
      
      default:
        if (status === 400) {
          throw new AuthError(AuthErrorType.VALIDATION_ERROR, message || '入力内容に誤りがあります。', status);
        }
        throw new AuthError(AuthErrorType.UNKNOWN_ERROR, message || '認証エラーが発生しました。', status);
    }
  }

  // ユーザー登録
  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // ログイン
  async login(loginData: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });
  }

  // トークン付きリクエスト
  async authenticatedRequest<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // ユーザープロフィール取得
  async getUserProfile(token: string): Promise<UserProfileResponse> {
    return this.authenticatedRequest<UserProfileResponse>('/users/profile', token, {
      method: 'GET',
    });
  }

  // ユーザープロフィール更新
  async updateUserProfile(token: string, userData: UserUpdateData): Promise<UserProfileResponse> {
    return this.authenticatedRequest<UserProfileResponse>('/users/profile', token, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // パスワード変更
  async updatePassword(token: string, passwordData: PasswordUpdateData): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>('/users/password', token, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // お弁当サイズ一覧取得
  async getBentoSizes(token: string): Promise<{ message: string; bentoSizes: any[] }> {
    return this.authenticatedRequest<{ message: string; bentoSizes: any[] }>('/users/bento-sizes', token, {
      method: 'GET',
    });
  }

  // お弁当サイズ保存
  async saveBentoSizes(token: string, bentoSizes: any[]): Promise<{ message: string; bentoSizes: any[] }> {
    return this.authenticatedRequest<{ message: string; bentoSizes: any[] }>('/users/bento-sizes', token, {
      method: 'POST',
      body: JSON.stringify({ bentoSizes }),
    });
  }

  // 買い物リスト取得
  async getShoppingList(token: string): Promise<{ items: any[] }> {
    return this.authenticatedRequest<{ items: any[] }>('/shopping-lists', token, {
      method: 'GET',
    });
  }

  // 買い物リストに材料追加
  async addToShoppingList(token: string, items: Array<{ name: string; quantity: string; category?: string; recipeName?: string }>): Promise<{ message: string; items: any[] }> {
    return this.authenticatedRequest<{ message: string; items: any[] }>('/shopping-lists/items', token, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // 買い物リストアイテム削除
  async removeFromShoppingList(token: string, itemId: number): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>(`/shopping-lists/items/${itemId}`, token, {
      method: 'DELETE',
    });
  }

  // 買い物リストアイテムの完了状態を切り替え
  async toggleShoppingListItem(token: string, itemId: number, checked: boolean): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>(`/shopping-lists/items/${itemId}`, token, {
      method: 'PUT',
      body: JSON.stringify({ checked }),
    });
  }
}

export const apiClient = new ApiClient();