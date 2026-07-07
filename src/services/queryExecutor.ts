import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import { MongoClient } from 'mongodb';
import sqlite3 from 'sqlite3';
import sql from 'mssql';
import { Connection } from './connectionManager';

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
}

export class QueryExecutor {
  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      switch (connection.type) {
        case 'mysql':
          return await this.executeMySQLQuery(connection, query);
        case 'postgresql':
          return await this.executePostgreSQLQuery(connection, query);
        case 'mongodb':
          return await this.executeMongoDBQuery(connection, query);
        case 'sqlite':
          return await this.executeSQLiteQuery(connection, query);
        case 'mssql':
          return await this.executeMSSQLQuery(connection, query);
        default:
          throw new Error(`Unsupported database type: ${connection.type}`);
      }
    } finally {
      // Additional cleanup if needed
    }
  }

  private async executeMySQLQuery(connection: Connection, query: string): Promise<QueryResult> {
    const conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: connection.ssl ? 'Amazon RDS' : undefined
    });

    try {
      const startTime = Date.now();
      const [rows, fields] = await conn.execute(query);
      const executionTime = Date.now() - startTime;

      const columns = (fields || []).map(f => (f as any).name);
      const result = Array.isArray(rows) ? rows : [];

      return {
        columns,
        rows: result,
        rowCount: result.length,
        executionTime
      };
    } finally {
      await conn.end();
    }
  }

  private async executePostgreSQLQuery(connection: Connection, query: string): Promise<QueryResult> {
    const pool = new PgPool({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false
    });

    try {
      const startTime = Date.now();
      const result = await pool.query(query);
      const executionTime = Date.now() - startTime;

      return {
        columns: result.fields?.map(f => f.name) || [],
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        executionTime
      };
    } finally {
      await pool.end();
    }
  }

  private async executeMongoDBQuery(connection: Connection, query: string): Promise<QueryResult> {
    const uri = `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
    const client = new MongoClient(uri, {
      tls: connection.ssl,
      tlsInsecure: !connection.ssl
    });

    try {
      await client.connect();
      const startTime = Date.now();
      
      // Parse MongoDB query (simplified - assumes JSON format)
      const db = client.db(connection.database);
      const [collection, operation] = query.split(':');
      const filter = JSON.parse(operation || '{}');

      const results = await db.collection(collection).find(filter).toArray();
      const executionTime = Date.now() - startTime;

      const columns = results.length > 0 ? Object.keys(results[0]) : [];

      return {
        columns,
        rows: results,
        rowCount: results.length,
        executionTime
      };
    } finally {
      await client.close();
    }
  }

  private async executeSQLiteQuery(connection: Connection, query: string): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.Database)(connection.database);
      const startTime = Date.now();

      db.all(query, (err: any, rows: any[]) => {
        const executionTime = Date.now() - startTime;

        if (err) {
          db.close();
          reject(err);
          return;
        }

        const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

        db.close();
        resolve({
          columns,
          rows: rows || [],
          rowCount: rows?.length || 0,
          executionTime
        });
      });
    });
  }

  private async executeMSSQLQuery(connection: Connection, query: string): Promise<QueryResult> {
    const pool = new sql.ConnectionPool({
      server: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      options: {
        encrypt: connection.ssl,
        trustServerCertificate: !connection.ssl
      }
    });

    try {
      await pool.connect();
      const startTime = Date.now();
      const result = await pool.request().query(query);
      const executionTime = Date.now() - startTime;

      const rows = result.recordset || [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime
      };
    } finally {
      await pool.close();
    }
  }
}