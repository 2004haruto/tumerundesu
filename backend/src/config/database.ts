// src/config/database.ts
const mysql = require('mysql2/promise');

// 型定義
interface Pool {
  query<T = any>(sql: string, values?: any[]): Promise<[T, any]>;
  getConnection(): Promise<PoolConnection>;
  execute<T = any>(sql: string, values?: any[]): Promise<[T, any]>;
  end(): Promise<void>;
}

interface PoolConnection {
  query<T = any>(sql: string, values?: any[]): Promise<[T, any]>;
  execute<T = any>(sql: string, values?: any[]): Promise<[T, any]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

interface RowDataPacket {
  [column: string]: any;
}

interface ResultSetHeader {
  fieldCount: number;
  affectedRows: number;
  insertId: number;
  info: string;
  serverStatus: number;
  warningStatus: number;
}

interface FieldPacket {
  name: string;
  type: number;
  length: number;
}

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
  multipleStatements: boolean;
  charset: string;
  connectTimeout?: number;
  [key: string]: any;
}

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3309'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'tumerundesu_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  charset: 'utf8mb4',
  connectTimeout: 10000
};

// 接続プールを作成
const pool: Pool = mysql.createPool(dbConfig);

// 接続時に文字セットを明示的に設定（型アサーション使用）
(pool as any).on('connection', (connection: any) => {
  connection.query('SET NAMES utf8mb4');
  console.log('✅ Database connection charset set to utf8mb4');
});

// 接続テスト関数
async function testConnection(): Promise<boolean> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 as test');
    console.log('✅ Database connection test passed:', rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', (error as Error).message);
    return false;
  }
}

// カスタムクエリ実行関数
export class DatabaseService {
  static async query<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string, 
    values?: any[]
  ): Promise<[T, FieldPacket[]]> {
    return pool.query<T>(sql, values);
  }

  static async getConnection(): Promise<PoolConnection> {
    return pool.getConnection();
  }

  static async transaction<T>(
    callback: (connection: PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static end(): Promise<void> {
    return pool.end();
  }
}

// 初期化時に接続をテスト（一時的にコメントアウト）
// testConnection();

export default pool;