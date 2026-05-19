
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
