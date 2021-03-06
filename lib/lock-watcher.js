'use babel';

import { CompositeDisposable, File, Point } from 'atom';
import Path from 'path';

export default class LockWatcher {
  constructor(editor, lockFileName) {
    this.editor = editor;
    this.lockFileName = lockFileName;
    this.packageVersions = {};
    this.subscriptions = new CompositeDisposable();

    this.findLockFile(Path.dirname(this.editor.getPath()));
    this.subscriptions.add(this.editor.onDidStopChanging(this.updateAnnotations.bind(this)));

    // I'd really like to use only this.editor.onDidStopChanging() instead of
    // also a MutationObserver. Because we need to manipulate the DOM to add to
    // the datalist, we're only feasibly able to annotate lines that are within
    // the current viewport. Using a MutationObserver as well means we can catch
    // scrolling events and redraw as needed.
    this.mutationObserver = new MutationObserver(this.throttle(this.updateAnnotations));
    this.mutationObserver.observe(this.editor.element, {
      attributes: true,
      attributeFilter: ['data-screen-row'],
      subtree: true
    });
  }

  findLockFile(path) {
    const file = new File(Path.resolve(path, this.lockFileName));
    return file.exists().then((result) => {
      if (result) {
        this.lockFile = file;
        this.subscriptions.add(file.onDidChange(this.throttle(this.parseLockFile)));
        window.requestIdleCallback(this.parseLockFile.bind(this));
      } else {
        const newPath = Path.dirname(path);
        if (path != newPath) {
          return this.findLockFile(newPath);
        }
      }
    });
  }

  parseLockFile() {
    this.lockFile.read().then((contents) => {
      try {
        const content = JSON.parse(contents);

        // composer.lock
        ['packages', 'packages-dev'].forEach((key) => {
          if (content[key]) {
            content[key].forEach((composerPackage) => {
              this.packageVersions[composerPackage.name] = composerPackage.version;
            });
          }
        });

        // package-lock.json
        ['dependencies', 'devDependencies'].forEach((key) => {
          if (content[key]) {
            Object.keys(content[key]).forEach((packageName) => {
              this.packageVersions[packageName] = content[key][packageName].version;
            });
          }
        });
      } catch (e) {
        return;
      }

      this.updateAnnotations();
    });
  }

  updateAnnotations() {
    if (!this.packageVersions) {
      // We didn't find a lock file
      return;
    }
    const lineCount = this.editor.getLineCount();
    for (let lineNumber = 0; lineNumber < lineCount; lineNumber++) {
      const bufferPosition = new Point(lineNumber, 0);
      const screenPosition = this.editor.screenPositionForBufferPosition(bufferPosition);
      const element = this.editor.element.querySelector(
        '.line[data-screen-row="' + screenPosition.row + '"]'
      );
      if (element) {
        const lineText = this.editor.lineTextForBufferRow(lineNumber) || '';
        const packageName = lineText.split('"')[1];
        if (element.dataset.lockFileVersion || this.packageVersions[packageName]) {
          window.requestAnimationFrame(() => {
            if (this.packageVersions[packageName]) {
              element.dataset.lockFileVersion = this.packageVersions[packageName];
            } else {
              delete element.dataset.lockFileVersion;
            }
          });
        }
      }
    }
  }

  throttle(callback) {
    return () => {
      if (callback.timer) {
        window.clearTimeout(callback.timer);
      }
      callback.timer = window.setTimeout(() => {
        window.requestIdleCallback(callback.bind(this));
      }, 300);
    };
  }

  deactivate() {
    this.mutationObserver.disconnect();
    this.subscriptions.dispose();

    this.editor.element.querySelectorAll('[data-lock-file-version]').forEach(
      (element) => delete element.dataset.lockFileVersion
    );
  }
}
