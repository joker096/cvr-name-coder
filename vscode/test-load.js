const fs = require('fs');
const path = require('path');

// Create a fake vscode module
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain) {
  if (request === 'vscode') {
    return path.join(__dirname, 'vscode-mock.js');
  }
  return originalResolveFilename.call(this, request, parent, isMain);
};

// Create the mock vscode module file
const mockVscodeCode = `
class ThemeColor {
  constructor(id) { this.id = id; }
}
class Range {
  constructor(s, e) { this.start = s; this.end = e; }
}
class Position {
  constructor(l, c) { this.line = l; this.character = c; }
}

module.exports = {
  window: {
    createStatusBarItem: () => ({
      text: '', tooltip: '', command: '', show: () => {}, hide: () => {}, dispose: () => {}, backgroundColor: undefined
    }),
    createWebviewPanel: () => ({
      webview: { html: '', options: {} },
      onDidDispose: () => {}, dispose: () => {}, reveal: () => {}
    }),
    showInformationMessage: (...args) => console.log('[INFO]', ...args),
    showWarningMessage: (...args) => console.log('[WARN]', ...args),
    showErrorMessage: (...args) => console.log('[ERROR]', ...args),
    registerWebviewViewProvider: () => ({ dispose: () => {} }),
    visibleTextEditors: [],
    onDidChangeVisibleTextEditors: (listener) => { console.log('[MOCK] onDidChangeVisibleTextEditors'); return { dispose: () => {} }; }
  },
  workspace: {
    workspaceFolders: null,
    getConfiguration: (section) => ({
      get: (key, def) => def,
      update: () => Promise.resolve(),
      has: () => false
    }),
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    openTextDocument: (uri) => Promise.resolve({ getText: () => '', positionAt: () => new Position(0,0) }),
    getWorkspaceFolder: () => undefined
  },
  commands: {
    registerCommand: (id, handler) => {
      console.log('[CMD REGISTERED]', id);
      return { dispose: () => {} };
    },
    executeCommand: () => Promise.resolve()
  },
  languages: {
    registerInlineCompletionItemProvider: () => ({ dispose: () => {} }),
    createDiagnosticCollection: (name) => ({ set: () => {}, clear: () => {}, dispose: () => {} })
  },
  StatusBarAlignment: { Right: 1, Left: 0 },
  ViewColumn: { One: 1, Two: 2 },
  Uri: {
    file: (p) => ({ fsPath: p, path: p }),
    parse: (p) => ({ fsPath: p })
  },
  ThemeColor,
  Range,
  Position,
  DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
  CancellationTokenSource: class { get token() { return { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) }; } },
  EventEmitter: class {
    constructor() {
      this.event = (listener) => { this._listener = listener; return { dispose: () => {} }; };
      this.fire = (data) => { if (this._listener) this._listener(data); };
    }
  }
};
`;

fs.writeFileSync(path.join(__dirname, 'vscode-mock.js'), mockVscodeCode);

// Make sure app directory exists
const appDir = path.join(__dirname, 'app');
if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(path.join(appDir, 'index.html'), '<!DOCTYPE html><html><body>Test</body></html>');
}

// Make sure storage dir exists
const storageDir = path.join(__dirname, '.opencode-infinite');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const mockContext = {
  extensionPath: path.resolve(__dirname),
  globalStorageUri: { fsPath: storageDir },
  subscriptions: [],
  extensionUri: { fsPath: path.resolve(__dirname) }
};

console.log('Extension path:', mockContext.extensionPath);
console.log('App dir exists:', fs.existsSync(appDir));

console.log('\nLoading extension module...');

let ext;
try {
  ext = require('./dist/extension.js');
  console.log('Module loaded! Exports:', Object.keys(ext));
} catch (err) {
  console.error('FAILED to load module:', err.message);
  console.error(err.stack);
  process.exit(1);
}

if (ext.activate) {
  console.log('\nCalling activate()...');
  ext.activate(mockContext).then(() => {
    console.log('\n✓ activate() resolved successfully');
    console.log('Server port after activate:', ext.serverPort);
    
    // Wait for deferred server start
    console.log('Waiting 3s for deferred server start...');
    setTimeout(() => {
      console.log('Server port after 3s:', ext.serverPort);
      setTimeout(() => process.exit(0), 1000);
    }, 3000);
  }).catch(err => {
    console.error('\n✗ activate() rejected:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
} else {
  console.log('No activate function');
}

setTimeout(() => {
  console.log('\nFinal timeout reached');
  console.log('Server port:', ext.serverPort);
  process.exit(0);
}, 20000);
