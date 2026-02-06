-- データベース初期化スクリプト
-- Tumerundesu お弁当アプリ用データベーススキーマ

USE tumerundesu_db;

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ユーザーID',
  name             VARCHAR(80)     NOT NULL COMMENT '氏名',
  email            VARCHAR(255)    NOT NULL COMMENT 'メールアドレス',
  password         VARCHAR(255)    NOT NULL COMMENT 'パスワード',
  bento_box_size   VARCHAR(20)              COMMENT '弁当箱サイズ',           -- ★型未記載のため仮
  allergies        VARCHAR(40)              COMMENT 'アレルギー',
  preferences      TEXT                     COMMENT '嗜好・避けたい食材',
  goal_calories    INT                      COMMENT '目標カロリー',
  weight           DECIMAL(5,2)             COMMENT '体重(kg)',
  activity_level   ENUM('low','mid','high') COMMENT '活動レベル',
  region           VARCHAR(120)             COMMENT '地域',
  bento_capacity   VARCHAR(20)              COMMENT 'お弁当容量(ml)',
  bento_width      VARCHAR(20)              COMMENT 'お弁当横幅(cm)',
  bento_length     VARCHAR(20)              COMMENT 'お弁当縦(cm)',
  bento_height     VARCHAR(20)              COMMENT 'お弁当高さ(cm)',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP 
                                   ON UPDATE CURRENT_TIMESTAMP       COMMENT '更新日時',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ユーザー';

-- ユーザーお弁当サイズテーブル（複数サイズ対応）
CREATE TABLE IF NOT EXISTS user_bento_sizes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'お弁当サイズID',
  user_id     BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  name        VARCHAR(50)     NOT NULL COMMENT 'お弁当名（父、長男、母など）',
  capacity    VARCHAR(20)              COMMENT 'お弁当容量(ml)',
  width       VARCHAR(20)              COMMENT 'お弁当横幅(cm)',
  length      VARCHAR(20)              COMMENT 'お弁当縦(cm)',
  height      VARCHAR(20)              COMMENT 'お弁当高さ(cm)',
  is_primary  BOOLEAN        NOT NULL DEFAULT FALSE COMMENT 'メインお弁当フラグ',
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP 
                             ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_bento_sizes_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ユーザーお弁当サイズ';

-- メニューテーブル
CREATE TABLE IF NOT EXISTS menus (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'メニューID',
  title         VARCHAR(120)    NOT NULL COMMENT 'タイトル',
  description   TEXT                     COMMENT '説明',
  calories      INT                      COMMENT '想定カロリー',
  image_url     VARCHAR(512)             COMMENT '画像URL',
  created_by_ai BOOLEAN        NOT NULL DEFAULT 0 COMMENT 'AI生成フラグ',
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  updated_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP 
                              ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='メニュー';

-- おかず項目テーブル
CREATE TABLE IF NOT EXISTS menu_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '項目ID',
  menu_id        BIGINT UNSIGNED NOT NULL COMMENT 'メニューID',
  name           VARCHAR(120)    NOT NULL COMMENT '名称',
  category       ENUM('main','side','staple','other') NOT NULL COMMENT '区分（主菜/副菜/主食/他）',
  ingredients    TEXT                     COMMENT '材料',
  nutrition_json JSON                     COMMENT '栄養JSON',
  notes          TEXT                     COMMENT '備考',
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (id),
  KEY idx_menu_id (menu_id),
  CONSTRAINT fk_menu_items_menu
    FOREIGN KEY (menu_id)
    REFERENCES menus(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='おかず項目';

-- お気に入りテーブル
CREATE TABLE IF NOT EXISTS favorites (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'お気に入りID',
  user_id     BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  menu_id     BIGINT UNSIGNED NOT NULL COMMENT 'メニューID',
  title       VARCHAR(255)              COMMENT 'レシピタイトル',
  image_url   VARCHAR(512)              COMMENT 'レシピ画像URL',
  calories    INT                       COMMENT 'カロリー',
  description TEXT                      COMMENT 'レシピ説明',
  ingredients TEXT                      COMMENT '材料(JSON文字列)',
  steps       TEXT                      COMMENT '手順(JSON文字列)',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登録日時',
  PRIMARY KEY (id),
  UNIQUE KEY uq_favorites_user_menu (user_id, menu_id),
  KEY idx_user (user_id),
  KEY idx_menu (menu_id),
  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_favorites_menu
    FOREIGN KEY (menu_id)
    REFERENCES menus(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='お気に入り';

-- 既存DBにカラム追加用（手動実行用）
-- 材料カラム追加
ALTER TABLE favorites ADD COLUMN ingredients TEXT COMMENT '材料(JSON文字列)';
-- 手順カラム追加
ALTER TABLE favorites ADD COLUMN steps TEXT COMMENT '手順(JSON文字列)';

-- 買い物リストテーブル
CREATE TABLE IF NOT EXISTS shopping_lists (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'リストID',
  user_id    BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  title      VARCHAR(120)    NOT NULL COMMENT 'リスト名',
  memo       TEXT                     COMMENT 'メモ',
  due_date   DATE                     COMMENT '期限',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  CONSTRAINT fk_shopping_lists_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='買い物リスト';

-- 買い物リスト項目テーブル
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '項目ID',
  user_id     BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  item_name   VARCHAR(120)    NOT NULL COMMENT '品目名',
  quantity    VARCHAR(50)     NOT NULL DEFAULT '' COMMENT '数量（例: 200g, 2本）',
  category    VARCHAR(50)              COMMENT 'カテゴリ',
  recipe_name VARCHAR(200)             COMMENT '料理名',
  checked     BOOLEAN         NOT NULL DEFAULT 0 COMMENT 'チェック',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  CONSTRAINT fk_shopping_list_items_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='買い物リスト項目';

-- 天気データログテーブル
CREATE TABLE IF NOT EXISTS weather_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '天気ID',
  user_id    BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  date       DATE            NOT NULL COMMENT '日付（ユーザー別＋日付検索用）',
  temp_c     DECIMAL(4,1)             COMMENT '気温(℃)',
  weather    ENUM('clear','clouds','rain','snow','thunder','other') COMMENT '天気',
  region     VARCHAR(120)             COMMENT '地域',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '記録時刻',
  PRIMARY KEY (id),
  KEY idx_user_date (user_id, date),
  CONSTRAINT fk_weather_logs_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='天気データログ';

-- 予定テーブル
CREATE TABLE IF NOT EXISTS schedules (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '予定ID',
  user_id          BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  title            VARCHAR(120)    NOT NULL COMMENT '予定名',
  location         VARCHAR(255)             COMMENT '場所',
  start_at         DATETIME        NOT NULL COMMENT '開始日時（ユーザー別＋開始時刻検索用）',
  end_at           DATETIME                 COMMENT '終了日時',
  memo             TEXT                     COMMENT '説明',
  source           ENUM('manual','google')  NOT NULL DEFAULT 'manual' COMMENT '連携元',
  external_event_id VARCHAR(255)            COMMENT '外部ID',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (id),
  KEY idx_user_start (user_id, start_at),
  CONSTRAINT fk_schedules_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='予定';

-- 評価テーブル
CREATE TABLE IF NOT EXISTS ratings (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '評価ID',
  user_id     BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  menu_id     BIGINT UNSIGNED NOT NULL COMMENT 'メニューID',
  score       TINYINT UNSIGNED NOT NULL COMMENT '評価点（1〜5）',
  comment     TEXT                     COMMENT 'コメント',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '評価日時',
  PRIMARY KEY (id),
  CONSTRAINT chk_score CHECK (score BETWEEN 1 AND 5),
  KEY idx_user (user_id),
  KEY idx_menu (menu_id),
  CONSTRAINT fk_ratings_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_menu
    FOREIGN KEY (menu_id)
    REFERENCES menus(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='評価';

-- 提案履歴テーブル
CREATE TABLE IF NOT EXISTS suggestion_history (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '提案ID',
  user_id       BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  menu_id       BIGINT UNSIGNED          COMMENT 'メニューID',
  suggested_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提案日時',
  weather_at    ENUM('clear','clouds','rain','snow','thunder','other') COMMENT '天気(提案時)',
  temp_at       DECIMAL(4,1)             COMMENT '気温(提案時)',
  reason        TEXT                     COMMENT '提案理由',
  PRIMARY KEY (id),
  KEY idx_user_time (user_id, suggested_at),
  KEY idx_menu (menu_id),
  CONSTRAINT fk_sgh_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_sgh_menu
    FOREIGN KEY (menu_id)
    REFERENCES menus(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提案履歴';

-- 初期データの挿入

-- 詳細お弁当サイズ設定カラムを追加
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bento_capacity VARCHAR(20) COMMENT '容量(ml)',
ADD COLUMN IF NOT EXISTS bento_width VARCHAR(20) COMMENT '横幅(cm)',
ADD COLUMN IF NOT EXISTS bento_length VARCHAR(20) COMMENT '縦(cm)', 
ADD COLUMN IF NOT EXISTS bento_height VARCHAR(20) COMMENT '高さ(cm)',
ADD COLUMN IF NOT EXISTS use_detailed_size BOOLEAN DEFAULT FALSE COMMENT '詳細サイズ使用フラグ';

-- 栄養摂取ログテーブル（五大栄養素対応）
CREATE TABLE IF NOT EXISTS nutrition_intake_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '摂取ログID',
  user_id       BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  intake_date   DATE            NOT NULL COMMENT '摂取日',
  meal_type     ENUM('breakfast','lunch','dinner','snack') NOT NULL DEFAULT 'lunch' COMMENT '食事種類',
  bento_id      VARCHAR(100)             COMMENT 'お弁当ID（自動生成されたもの）',
  bento_name    VARCHAR(200)             COMMENT 'お弁当名',
  calories      DECIMAL(7,2)    NOT NULL COMMENT '摂取カロリー',
  protein       DECIMAL(5,2)             COMMENT 'タンパク質(g)',
  carbs         DECIMAL(5,2)             COMMENT '炭水化物(g)',
  fat           DECIMAL(5,2)             COMMENT '脂質(g)',
  vitamins      DECIMAL(6,2)             COMMENT 'ビタミン総量(mg)',
  minerals      DECIMAL(6,2)             COMMENT 'ミネラル総量(mg)',
  items_json    JSON                     COMMENT 'お弁当構成要素(JSON)',
  notes         TEXT                     COMMENT 'メモ',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP 
                                         ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (id),
  KEY idx_user_date (user_id, intake_date),
  KEY idx_user_meal (user_id, meal_type),
  CONSTRAINT fk_nutrition_intake_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='栄養摂取ログ';

-- 楽天レシピキャッシュテーブル
CREATE TABLE IF NOT EXISTS rakuten_recipes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  recipe_id     VARCHAR(50)     NOT NULL COMMENT '楽天レシピID',
  title         VARCHAR(200)    NOT NULL COMMENT 'レシピタイトル',
  description   TEXT                     COMMENT 'レシピ説明',
  image_url     VARCHAR(500)             COMMENT '画像URL',
  source_url    VARCHAR(500)    NOT NULL COMMENT '楽天レシピ元URL',
  cooking_time  VARCHAR(50)              COMMENT '調理時間',
  servings      VARCHAR(50)              COMMENT '分量',
  difficulty    VARCHAR(20)              COMMENT '難易度',
  cost          VARCHAR(50)              COMMENT '概算費用',
  ingredients_json JSON                  COMMENT '材料JSON',
  instructions_json JSON                 COMMENT '作り方JSON',
  category      VARCHAR(100)             COMMENT 'カテゴリ',
  source        ENUM('rakuten') NOT NULL DEFAULT 'rakuten' COMMENT 'ソース',
  cached_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'キャッシュ日時',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP 
                                ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (id),
  UNIQUE KEY uq_rakuten_recipes_recipe_id (recipe_id),
  INDEX idx_rakuten_recipes_category (category),
  INDEX idx_rakuten_recipes_cached_at (cached_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='楽天レシピキャッシュ';

-- 楽天レシピお気に入りテーブル
CREATE TABLE IF NOT EXISTS rakuten_recipe_favorites (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  user_id     BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  recipe_id   BIGINT UNSIGNED NOT NULL COMMENT '楽天レシピID',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (id),
  UNIQUE KEY uq_rakuten_favorites_user_recipe (user_id, recipe_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES rakuten_recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='楽天レシピお気に入り';

-- テストユーザーを追加（パスワード: password123 をハッシュ化）
INSERT INTO users (name, email, password, bento_box_size, allergies, preferences) 
VALUES 
  ('テストユーザー', 'test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '25cm', '特になし', 'ベジタリアン')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 既存のshopping_list_itemsテーブルにrecipe_nameカラムを追加（既に存在する場合はスキップ）
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS recipe_name VARCHAR(200) COMMENT '料理名' AFTER category;
