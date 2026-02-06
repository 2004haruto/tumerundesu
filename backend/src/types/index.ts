// src/types/index.ts

import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// データベースエンティティ型
export interface User {
  id: number;
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
  created_at: Date;
  updated_at: Date;
}

export interface Menu {
  id: number;
  title: string;
  description?: string;
  calories?: number;
  image_url?: string;
  created_by_ai: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MenuItem {
  id: number;
  menu_id: number;
  name: string;
  category: 'main' | 'side' | 'staple' | 'other';
  ingredients?: string;
  nutrition_json?: any;
  notes?: string;
  created_at: Date;
}

export interface Favorite {
  id: number;
  user_id: number;
  menu_id: number;
  title?: string;
  image_url?: string;
  calories?: number;
  description?: string;
  ingredients?: string | null;
  steps?: string | null;
  created_at: Date;
}

export interface ShoppingList {
  id: number;
  user_id: number;
  title: string;
  memo?: string;
  due_date?: Date;
  created_at: Date;
}

export interface ShoppingListItem {
  id: number;
  list_id: number;
  name: string;
  unit?: string;
  quantity: number;
  category?: '肉' | '魚' | '野菜' | '果物' | '穀物' | '乳製品' | '調味料' | 'その他';
  checked: boolean;
  created_at: Date;
}

export interface WeatherLog {
  id: number;
  user_id: number;
  date: Date;
  temp_c?: number;
  weather?: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunder' | 'other';
  region?: string;
  created_at: Date;
}

export interface Schedule {
  id: number;
  user_id: number;
  title: string;
  location?: string;
  start_at: Date;
  end_at?: Date;
  memo?: string;
  source: 'manual' | 'google';
  external_event_id?: string;
  created_at: Date;
}

export interface Rating {
  id: number;
  user_id: number;
  menu_id: number;
  score: number; // 1-5
  comment?: string;
}

// 楽天レシピAPI関連の型定義
export interface RakutenRecipe {
  id: number;
  recipe_id: string; // 楽天レシピID
  title: string;
  description?: string;
  image_url?: string;
  source_url: string; // 楽天レシピの元URL
  cooking_time?: string;
  servings?: string;
  difficulty?: string;
  cost?: string;
  ingredients_json: any; // 材料の配列
  instructions_json: any; // 作り方の配列
  category?: string;
  source: 'rakuten';
  cached_at: Date; // キャッシュ日時
  created_at: Date;
  updated_at: Date;
}

export interface RakutenRecipeIngredient {
  name: string;
  amount: string;
}

export interface RakutenRecipeInstruction {
  step_number: number;
  text: string;
  image?: string;
  created_at: Date;
}

export interface SuggestionHistory {
  id: number;
  user_id: number;
  menu_id?: number;
  suggested_at: Date;
  weather_at?: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunder' | 'other';
  temp_at?: number;
  reason?: string;
}

// API リクエスト/レスポンス型
export interface RegisterRequest {
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

export interface LoginRequest {
  email: string;
  password: string;
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

export interface CreateMenuRequest {
  title: string;
  description?: string;
  calories?: number;
  image_url?: string;
  items: {
    name: string;
    category: 'main' | 'side' | 'staple' | 'other';
    ingredients?: string;
    nutrition_json?: any;
    notes?: string;
  }[];
}

export interface UpdateMenuRequest {
  title?: string;
  description?: string;
  calories?: number;
  image_url?: string;
}

export interface MenuWithItems extends Menu {
  items: MenuItem[];
}

export interface CreateShoppingListRequest {
  title: string;
  memo?: string;
  due_date?: string;
  items?: {
    name: string;
    unit?: string;
    quantity: number;
    category?: '肉' | '魚' | '野菜' | '果物' | '穀物' | '乳製品' | '調味料' | 'その他';
  }[];
}

export interface CreateScheduleRequest {
  title: string;
  location?: string;
  start_at: string;
  end_at?: string;
  memo?: string;
}

export interface CreateRatingRequest {
  menu_id: number;
  score: number;
  comment?: string;
}

export interface MenuCreateResponse {
  message: string;
  menu: MenuWithItems;
}

export interface MenuUpdateResponse {
  message: string;
  menu: Menu;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

// JWT関連
export interface JWTPayload extends JwtPayload {
  userId: number;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

// エラー型
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// 楽天レシピAPI関連の型定義
export interface RakutenRecipe {
  id: number;
  recipe_id: string; // 楽天レシピID
  title: string;
  description?: string;
  image_url?: string;
  source_url: string; // 楽天レシピの元URL
  cooking_time?: string;
  servings?: string;
  difficulty?: string;
  cost?: string;
  ingredients_json: any; // 材料の配列
  instructions_json: any; // 作り方の配列
  category?: string;
  source: 'rakuten';
  cached_at: Date; // キャッシュ日時
  created_at: Date;
  updated_at: Date;
}

export interface RakutenRecipeIngredient {
  name: string;
  amount: string;
}

export interface RakutenRecipeInstruction {
  step_number: number;
  text: string;
  image?: string;
}

export interface RakutenRecipeResponse {
  recipe: RakutenRecipe;
  ingredients: RakutenRecipeIngredient[];
  instructions: RakutenRecipeInstruction[];
}