// src/contexts/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, AuthResponse, LoginData, PasswordUpdateData, RegisterData, UserProfileResponse, UserUpdateData } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  allergies?: string;
  preferences?: string;
  bento_box_size?: string;
  bento_capacity?: string;
  bento_width?: string;
  bento_length?: string;
  bento_height?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (loginData: LoginData) => Promise<void>;
  register: (registerData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: UserUpdateData) => Promise<void>;
  updatePassword: (passwordData: PasswordUpdateData) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // アプリ起動時にトークンを確認
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('userData');
      
      if (storedToken && storedUser) {
        // トークンを設定
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // トークンの有効性を確認
        try {
          await apiClient.getUserProfile(storedToken);
          // トークンが有効な場合、そのまま続行
        } catch (error: any) {
          // トークンが無効な場合、ストレージをクリアして初期状態に戻す
          if (error.status === 401 || error.status === 403) {
            console.log('保存されたトークンが無効です。ログアウトします。');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch (error) {
      console.error('認証状態の確認エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginData: LoginData): Promise<void> => {
    try {
      const response: AuthResponse = await apiClient.login(loginData);
      
      // トークンとユーザー情報を保存
      await AsyncStorage.setItem('userToken', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
    } catch (error: any) {
      // AuthErrorの場合はそのまま投げ直し、その他の場合は汎用エラーに変換
      throw error;
    }
  };

  const register = async (registerData: RegisterData): Promise<void> => {
    try {
      const response: AuthResponse = await apiClient.register(registerData);
      
      // トークンとユーザー情報を保存
      await AsyncStorage.setItem('userToken', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
    } catch (error: any) {
      // AuthErrorの場合はそのまま投げ直し、その他の場合は汎用エラーに変換
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // ストレージからトークンとユーザー情報を削除
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const updateProfile = async (userData: UserUpdateData): Promise<void> => {
    if (!token) {
      throw new Error('認証トークンがありません');
    }

    try {
      const response: UserProfileResponse = await apiClient.updateUserProfile(token, userData);
      
      // ユーザー情報を更新
      const updatedUser = response.user;
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error: any) {
      // 401 (Unauthorized) または 403 (Forbidden) の場合、トークンが無効なのでログアウト
      if (error.status === 401 || error.status === 403) {
        console.log('無効なトークンが検出されました。ログアウトします。');
        await logout();
      }
      throw error;
    }
  };

  const updatePassword = async (passwordData: PasswordUpdateData): Promise<void> => {
    if (!token) {
      throw new Error('認証トークンがありません');
    }

    try {
      await apiClient.updatePassword(token, passwordData);
    } catch (error: any) {
      // 401 (Unauthorized) または 403 (Forbidden) の場合、トークンが無効なのでログアウト
      if (error.status === 401 || error.status === 403) {
        console.log('無効なトークンが検出されました。ログアウトします。');
        await logout();
      }
      throw error;
    }
  };

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!token) {
      return;
    }

    try {
      const response: UserProfileResponse = await apiClient.getUserProfile(token);
      const updatedUser = response.user;
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error: any) {
      console.error('プロフィール更新エラー:', error);
      // 401 (Unauthorized) または 403 (Forbidden) の場合、トークンが無効なのでログアウト
      if (error.status === 401 || error.status === 403) {
        console.log('無効なトークンが検出されました。ログアウトします。');
        await logout();
      }
      // エラーを再投げして呼び出し元でハンドリングできるようにする
      throw error;
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    refreshProfile,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};