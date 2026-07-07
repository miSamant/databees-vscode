import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';

export class ConnectionTreeProvider implements vscode.TreeDataProvider<ConnectionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ConnectionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private connectionManager: ConnectionManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConnectionTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ConnectionTreeItem): Promise<ConnectionTreeItem[]> {
    if (element === undefined) {
      // Root level - show all connections
      const connections = await this.connectionManager.getAllConnections();
      return connections.map(
        (conn) =>
          new ConnectionTreeItem(
            conn.name,
            vscode.TreeItemCollapsibleState.None,
            `${conn.type} - ${conn.host}:${conn.port}`,
            conn.id
          )
      );
    }
    return [];
  }
}

class ConnectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly description: string,
    public readonly connectionId: string
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.contextValue = 'connection';
    this.iconPath = new vscode.ThemeIcon('database');
  }
}