import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type DatabaseType = 'mysql' | 'postgresql' | 'mongodb' | 'sqlite' | 'mssql';

export interface Connection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string; // encrypted
  database: string;
  ssl: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

const STORAGE_KEY = 'databees:connections';
const ENCRYPTION_KEY_NAME = 'databees:encryption-key';

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadConnections();
  }

  private async getEncryptionKey(): Promise<Buffer> {
    let key = await this.context.secrets.get(ENCRYPTION_KEY_NAME);
    
    if (!key) {
      // Generate new encryption key
      key = crypto.randomBytes(32).toString('hex');
      await this.context.secrets.store(ENCRYPTION_KEY_NAME, key);
    }
    
    return Buffer.from(key, 'hex');
  }

  private encrypt(data: string): string {
    const key = this.context.globalState.get<Buffer>('encryption-key') || crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(data: string): string {
    const key = this.context.globalState.get<Buffer>('encryption-key') || crypto.randomBytes(32);
    const parts = data.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async createConnection(config: Omit<Connection, 'id' | 'createdAt'>): Promise<Connection> {
    const connection: Connection = {
      ...config,
      id: uuidv4(),
      createdAt: new Date(),
      password: this.encrypt(config.password)
    };

    this.connections.set(connection.id, connection);
    await this.saveConnections();

    vscode.window.showInformationMessage(`Connection "${connection.name}" created successfully!`);
    return connection;
  }

  async createConnectionUI(type: DatabaseType): Promise<Connection | undefined> {
    const name = await vscode.window.showInputBox({
      placeHolder: 'Connection name',
      prompt: 'Enter a name for this connection'
    });

    if (!name) return undefined;

    const host = await vscode.window.showInputBox({
      placeHolder: 'localhost',
      prompt: 'Enter host'
    });

    if (!host) return undefined;

    const portStr = await vscode.window.showInputBox({
      placeHolder: this.getDefaultPort(type).toString(),
      prompt: 'Enter port'
    });

    const port = parseInt(portStr || this.getDefaultPort(type).toString());

    const username = await vscode.window.showInputBox({
      placeHolder: 'root',
      prompt: 'Enter username'
    });

    if (!username) return undefined;

    const password = await vscode.window.showInputBox({
      placeHolder: 'password',
      prompt: 'Enter password',
      password: true
    });

    if (!password) return undefined;

    const database = await vscode.window.showInputBox({
      placeHolder: 'database',
      prompt: 'Enter database name'
    });

    if (!database) return undefined;

    const useSSL = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Use SSL/TLS?'
    });

    const connection = await this.createConnection({
      name,
      type,
      host,
      port,
      username,
      password,
      database,
      ssl: useSSL === 'Yes'
    });

    return connection;
  }

  private getDefaultPort(type: DatabaseType): number {
    const ports: Record<DatabaseType, number> = {
      mysql: 3306,
      postgresql: 5432,
      mongodb: 27017,
      sqlite: 0,
      mssql: 1433
    };
    return ports[type];
  }

  async getConnection(id: string): Promise<Connection | undefined> {
    const conn = this.connections.get(id);
    if (conn) {
      // Decrypt password before returning
      return {
        ...conn,
        password: this.decrypt(conn.password)
      };
    }
    return undefined;
  }

  async getAllConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values()).map(conn => ({
      ...conn,
      password: '***' // Never return decrypted password
    }));
  }

  async updateConnection(id: string, config: Partial<Connection>): Promise<Connection | undefined> {
    const connection = this.connections.get(id);
    if (!connection) return undefined;

    const updated = {
      ...connection,
      ...config,
      id: connection.id,
      createdAt: connection.createdAt,
      password: config.password ? this.encrypt(config.password) : connection.password
    };

    this.connections.set(id, updated);
    await this.saveConnections();
    return updated;
  }

  async deleteConnection(id: string): Promise<boolean> {
    const had = this.connections.has(id);
    this.connections.delete(id);
    if (had) {
      await this.saveConnections();
    }
    return had;
  }

  private async loadConnections(): Promise<void> {
    const stored = this.context.globalState.get<any[]>(STORAGE_KEY) || [];
    this.connections.clear();
    stored.forEach(conn => {
      this.connections.set(conn.id, conn);
    });
  }

  private async saveConnections(): Promise<void> {
    const connections = Array.from(this.connections.values());
    await this.context.globalState.update(STORAGE_KEY, connections);
  }
}