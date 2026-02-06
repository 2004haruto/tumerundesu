import * as Calendar from 'expo-calendar';

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  notes?: string;
}

/**
 * カレンダーへのアクセス許可を取得
 */
export const requestCalendarPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('カレンダー許可エラー:', error);
    return false;
  }
};

/**
 * 今日のカレンダーイベントを取得
 */
export const getTodayEvents = async (): Promise<CalendarEvent[]> => {
  try {
    // カレンダーへのアクセス許可を確認
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      console.log('カレンダーへのアクセス許可がありません');
      return [];
    }

    // デバイスのカレンダーを取得
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    console.log('利用可能なカレンダー:', calendars.length);

    if (calendars.length === 0) {
      console.log('カレンダーが見つかりません');
      return [];
    }

    // 今日の開始時刻と終了時刻を設定
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // すべてのカレンダーから今日のイベントを取得
    const calendarIds = calendars
      .filter(cal => cal.allowsModifications || cal.source.type === Calendar.SourceType.LOCAL)
      .map(cal => cal.id);

    if (calendarIds.length === 0) {
      console.log('アクセス可能なカレンダーがありません');
      return [];
    }

    const events = await Calendar.getEventsAsync(
      calendarIds,
      startOfDay,
      endOfDay
    );

    console.log(`今日のイベント: ${events.length}件`);

    // イベントを変換してソート
    return events
      .map(event => ({
        id: event.id,
        title: event.title || '(タイトルなし)',
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        allDay: event.allDay || false,
        location: event.location,
        notes: event.notes,
      }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  } catch (error) {
    console.error('イベント取得エラー:', error);
    return [];
  }
};

/**
 * 時刻をフォーマット（例: "10:00 AM"）
 */
export const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
};

/**
 * イベントの時間帯をフォーマット（例: "10:00 AM - 11:00 AM"）
 */
export const formatEventTime = (startDate: Date, endDate: Date, allDay: boolean): string => {
  if (allDay) {
    return '終日';
  }
  return `${formatTime(startDate)} - ${formatTime(endDate)}`;
};

/**
 * イベントのアイコン名を取得（Material Community Icons）
 */
export const getEventIcon = (title: string): string => {
  const titleLower = title.toLowerCase();
  
  // キーワードに基づいてアイコンを選択
  if (titleLower.includes('ミーティング') || titleLower.includes('会議') || titleLower.includes('meeting')) {
    return 'account-group-outline';
  }
  if (titleLower.includes('ランチ') || titleLower.includes('昼食') || titleLower.includes('lunch') || titleLower.includes('食事')) {
    return 'food-outline';
  }
  if (titleLower.includes('課題') || titleLower.includes('勉強') || titleLower.includes('study') || titleLower.includes('学習')) {
    return 'book-outline';
  }
  if (titleLower.includes('運動') || titleLower.includes('ジム') || titleLower.includes('exercise') || titleLower.includes('workout')) {
    return 'run';
  }
  if (titleLower.includes('買い物') || titleLower.includes('shopping')) {
    return 'cart-outline';
  }
  if (titleLower.includes('医者') || titleLower.includes('病院') || titleLower.includes('doctor') || titleLower.includes('hospital')) {
    return 'hospital-box-outline';
  }
  if (titleLower.includes('電話') || titleLower.includes('通話') || titleLower.includes('call') || titleLower.includes('phone')) {
    return 'phone-outline';
  }
  
  // デフォルトアイコン
  return 'calendar-outline';
};
