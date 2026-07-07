import * as vscode from 'vscode';
import { ConnectionManager } from './services/connectionManager';
import { LicenseService } from './services/licenseService';
import { ConnectionTreeProvider } from './providers/connectionTreeProvider';

let connectionManager: ConnectionManager;
let licenseService: LicenseService;
let panel: vscode.WebviewPanel | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('DataBees extension activating...');

  // Initialize services
  connectionManager = new ConnectionManager(context);
  licenseService = new LicenseService(context);

  // Check license on startup
  const isLicensed = await licenseService.checkLicense();
  if (!isLicensed) {
    vscode.window.showWarningMessage(
      'DataBees trial expired. Please subscribe to continue using DataBees.',
      'Subscribe Now'
    ).then(selection => {
      if (selection === 'Subscribe Now') {
        licenseService.openPaymentPage();
      }
    });
  }

  // Register command: Open main panel
  context.subscriptions.push(
    vscode.commands.registerCommand('databees.openPanel', async () => {
      await openMainPanel(context, connectionManager);
    })
  );

  // Register command: New connection
  context.subscriptions.push(
    vscode.commands.registerCommand('databees.newConnection', async () => {
      const connectionType = await vscode.window.showQuickPick(
        ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'MSSQL'],
        { placeHolder: 'Select database type' }
      );

      if (connectionType) {
        await connectionManager.createConnectionUI(connectionType as any);
      }
    })
  );

  // Register command: Execute query
  context.subscriptions.push(
    vscode.commands.registerCommand('databees.executeQuery', async () => {
      if (panel) {
        panel.reveal();
      }
    })
  );

  // Register command: Export results
  context.subscriptions.push(
    vscode.commands.registerCommand('databees.exportResults', async () => {
      if (panel) {
        panel.webview.postMessage({ command: 'export' });
      }
    })
  );

  // Register tree data provider for connections
  const treeProvider = new ConnectionTreeProvider(connectionManager);
  vscode.window.registerTreeDataProvider('databees-connections', treeProvider);

  console.log('DataBees extension activated successfully!');
}

async function openMainPanel(
  context: vscode.ExtensionContext,
  connectionManager: ConnectionManager
) {
  if (panel) {
    panel.reveal();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'databees',
    'DataBees Database Client',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
    }
  );

  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'databees-icon.png');

  // Get webview HTML
  const html = getWebviewContent(context, panel.webview);
  panel.webview.html = html;

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case 'getConnections':
        const connections = await connectionManager.getAllConnections();
        panel?.webview.postMessage({ command: 'connectionsList', data: connections });
        break;
      case 'executeQuery':
        // Handle query execution
        break;
      case 'exportResults':
        // Handle export
        break;
    }
  });

  panel.onDidDispose(() => {
    panel = undefined;
  });
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DataBees Database Client</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          padding: 20px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
          color: #FFD700;
        }
        
        .welcome {
          padding: 20px;
          background: var(--vscode-editor-background);
          border: 1px solid var(--vscode-editorGroup-border);
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .button {
          background: #FFD700;
          color: #000;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-right: 10px;
          margin-top: 10px;
        }
        
        .button:hover {
          background: #FFC700;
        }
        
        .button-secondary {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }
        
        .button-secondary:hover {
          background: var(--vscode-button-hoverBackground);
        }
        
        .connections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        
        .connection-card {
          padding: 15px;
          background: var(--vscode-sideBar-background);
          border: 1px solid var(--vscode-editorGroup-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .connection-card:hover {
          background: var(--vscode-list-hoverBackground);
          border-color: #FFD700;
        }
        
        .connection-name {
          font-weight: bold;
          font-size: 14px;
          color: #FFD700;
          margin-bottom: 5px;
        }
        
        .connection-type {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🐝 DataBees Database Client</h1>
        
        <div class="welcome">
          <p>Welcome to DataBees! The modern database client for VSCode.</p>
          <p style="margin-top: 10px; font-size: 12px; color: var(--vscode-descriptionForeground);">
            Start by creating a new connection or selecting an existing one.
          </p>
          <button class="button" onclick="vscode.postMessage({command: 'newConnection'})">+ New Connection</button>
          <button class="button button-secondary" onclick="vscode.postMessage({command: 'getConnections'})">Refresh</button>
        </div>
        
        <div id="connections" class="connections-grid"></div>
      </div>
      
      <script>
        const vscode = acquireVsCodeApi();
        
        // Load connections on startup
        vscode.postMessage({command: 'getConnections'});
        
        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          if (message.command === 'connectionsList') {
            displayConnections(message.data);
          }
        });
        
        function displayConnections(connections) {
          const container = document.getElementById('connections');
          
          if (connections.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; color: var(--vscode-descriptionForeground);">No connections yet. Create your first connection!</p>';
            return;
          }
          
          container.innerHTML = connections.map(conn => `
            <div class="connection-card" onclick="vscode.postMessage({command: 'selectConnection', id: '${conn.id}'})">
              <div class="connection-name">${conn.name}</div>
              <div class="connection-type">${conn.type} - ${conn.host}</div>
            </div>
          `).join('');
        }
      </script>
    </body>
    </html>
  `;
}

export function deactivate() {
  console.log('DataBees extension deactivating...');
}