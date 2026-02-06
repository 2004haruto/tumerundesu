# OpenWeatherMap API 統合

このプロジェクトは、OpenWeatherMap APIを使用して現在の天気情報を取得し、ホーム画面に表示します。

## セットアップ手順

### 1. OpenWeatherMap APIキーを取得

1. [OpenWeatherMap](https://openweathermap.org/api) にアクセス
2. アカウントを作成してサインイン
3. 「API keys」ページで新しいキーを生成
4. APIキーをコピー

**注意**: APIキーは発行後、有効になるまで数分～最大2時間かかる場合があります。

### 2. 環境変数を設定

プロジェクトルートに `.env` ファイルを作成（`.env.example`をコピーして使用可能）：

```bash
cp .env.example .env
```

`.env` ファイルに OpenWeatherMap APIキーを追加：

```bash
OPENWEATHER_API_KEY=your_actual_api_key_here
```

### 3. 必要なパッケージをインストール

```bash
npm install
```

以下のパッケージが必要です：
- `expo-location`: 位置情報を取得
- `react-native-dotenv`: 環境変数を読み込む

### 4. アプリを起動

```bash
npm start
```

## 位置情報の許可

アプリの初回起動時に、位置情報へのアクセス許可を求められます。

- **iOS**: 「設定 > プライバシー > 位置情報サービス」から許可
- **Android**: アプリのインストール時または実行時に許可

## 機能

### 現在の天気情報を表示
- 都市名
- 現在の気温
- 天気の説明（晴れ、曇り、雨など）
- 天気アイコン（絵文字）

### 気温に基づく提案
- **服装の提案**: 気温に応じた適切な服装を提案
- **持ち物の提案**: 天気や気温に応じた持ち物を提案（傘、保冷剤など）

## API制限

OpenWeatherMap 無料プランの制限：
- 1日あたり1,000回のリクエスト
- 1分あたり60回のリクエスト

## トラブルシューティング

### 「天気情報を取得できませんでした」と表示される場合

1. **APIキーが正しく設定されているか確認**
   - `.env` ファイルに正しいAPIキーが記載されているか
   - APIキーが有効化されているか（発行後2時間程度かかる場合あり）

2. **位置情報の許可を確認**
   - デバイスの設定で位置情報サービスが有効になっているか
   - アプリに位置情報へのアクセス許可が与えられているか

3. **インターネット接続を確認**
   - デバイスがインターネットに接続されているか

4. **アプリを再起動**
   - Expoサーバーを停止して再起動
   ```bash
   # Ctrl+C で停止
   npm start
   ```

5. **キャッシュをクリア**
   ```bash
   npm start -- --clear
   ```

### エラーログの確認

開発中は、コンソールに詳細なエラーログが表示されます。

## 実装の詳細

### ファイル構成

- `src/services/weatherApi.ts`: OpenWeatherMap APIとの通信ロジック
- `src/screens/HomeScreen.tsx`: 天気情報の表示とUI
- `src/types/env.d.ts`: 環境変数の型定義
- `.env`: 環境変数設定ファイル（gitignore済み）

### 主な機能

#### `getCurrentWeather(latitude, longitude)`
現在の天気情報を取得

#### `getWeatherEmoji(iconCode)`
天気アイコンコードから適切な絵文字を返す

#### `getClothingSuggestion(temp)`
気温に基づいた服装の提案を返す

#### `getItemSuggestion(temp, description)`
気温と天気に基づいた持ち物の提案を返す

## 関連ドキュメント

- [OpenWeatherMap API Documentation](https://openweathermap.org/api)
- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [環境変数設定ガイド](./docs/environment-variables-guide.md)
