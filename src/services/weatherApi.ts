import { OPENWEATHER_API_KEY } from '@env';

export interface WeatherData {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  description: string;
  icon: string;
  main: string;
  windSpeed: number;
  city: string;
}

export interface WeatherError {
  message: string;
  code?: string;
}

const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * OpenWeatherMap APIから現在の天気情報を取得
 * @param latitude 緯度
 * @param longitude 経度
 * @returns 天気情報
 */
export const getCurrentWeather = async (
  latitude: number,
  longitude: number
): Promise<WeatherData> => {
  try {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeatherMap APIキーが設定されていません');
    }

    const url = `${API_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '天気情報の取得に失敗しました');
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      tempMin: Math.round(data.main.temp_min),
      tempMax: Math.round(data.main.temp_max),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      main: data.weather[0].main,
      windSpeed: data.wind.speed,
      city: data.name,
    };
  } catch (error) {
    console.error('Weather API Error:', error);
    throw error;
  }
};

/**
 * 天気アイコンコードからEmoji絵文字を取得
 * @param iconCode OpenWeatherMapのアイコンコード
 * @returns 天気を表すEmoji
 */
export const getWeatherEmoji = (iconCode: string): string => {
  const iconMap: { [key: string]: string } = {
    '01d': '☀️', // 晴れ（昼）
    '01n': '🌙', // 晴れ（夜）
    '02d': '⛅', // 少し曇り（昼）
    '02n': '☁️', // 少し曇り（夜）
    '03d': '☁️', // 曇り
    '03n': '☁️',
    '04d': '☁️', // 曇り（厚い）
    '04n': '☁️',
    '09d': '🌧️', // にわか雨
    '09n': '🌧️',
    '10d': '🌦️', // 雨（昼）
    '10n': '🌧️', // 雨（夜）
    '11d': '⛈️', // 雷雨
    '11n': '⛈️',
    '13d': '🌨️', // 雪
    '13n': '🌨️',
    '50d': '🌫️', // 霧
    '50n': '🌫️',
  };

  return iconMap[iconCode] || '🌤️';
};

/**
 * 気温から服装の提案を取得
 * @param temp 気温（℃）
 * @returns 服装の提案
 */
export const getClothingSuggestion = (temp: number): {
  name: string;
  description: string;
  imageUrl: string;
} => {
  if (temp >= 30) {
    return {
      name: 'サンダル・軽装',
      description: '真夏の暑さ。軽めの服装がおすすめ',
      imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
    };
  } else if (temp >= 25) {
    return {
      name: '半袖・短パン',
      description: '夏の陽気。涼しい服装で',
      imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop',
    };
  } else if (temp >= 20) {
    return {
      name: '長袖シャツ',
      description: '快適な気温。長袖がちょうど良い',
      imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop',
    };
  } else if (temp >= 15) {
    return {
      name: '薄手のジャケット',
      description: '少し肌寒い。羽織るものがあると安心',
      imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop',
    };
  } else if (temp >= 10) {
    return {
      name: 'ジャケット',
      description: '寒くなってきました。上着を忘れずに',
      imageUrl: 'https://images.unsplash.com/photo-1544923246-77307a2c3e7b?q=80&w=800&auto=format&fit=crop',
    };
  } else {
    return {
      name: 'コート・厚着',
      description: '寒い日。しっかり防寒対策を',
      imageUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800&auto=format&fit=crop',
    };
  }
};

/**
 * 気温から持ち物の提案を取得
 * @param temp 気温（℃）
 * @param description 天気の説明
 * @returns 持ち物の提案
 */
export const getItemSuggestion = (temp: number, description: string): {
  name: string;
  description: string;
  imageUrl: string;
} => {
  const isRainy = description.includes('雨');
  
  if (isRainy) {
    return {
      name: '傘',
      description: '雨が予想されます。傘を持って出かけましょう',
      imageUrl: 'https://images.unsplash.com/photo-1551623026-1bac3b02d5e2?q=80&w=800&auto=format&fit=crop',
    };
  }
  
  if (temp >= 28) {
    return {
      name: '保冷剤・冷たい飲み物',
      description: '真夏には保冷剤を。飲み物は冷たいものを。',
      imageUrl: 'https://images.unsplash.com/photo-1621293954906-c4a19a2eb2b3?q=80&w=800&auto=format&fit=crop',
    };
  } else if (temp >= 20) {
    return {
      name: '水筒',
      description: '適度な水分補給を心がけましょう',
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=800&auto=format&fit=crop',
    };
  } else {
    return {
      name: '温かい飲み物',
      description: '寒い日は温かい飲み物で体を温めて',
      imageUrl: 'https://images.unsplash.com/photo-1514481538271-cf9f99627ab4?q=80&w=800&auto=format&fit=crop',
    };
  }
};
