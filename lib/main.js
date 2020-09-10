'use babel';

import { CompositeDisposable } from 'atom';
import Composer from './composer';
import Path from 'path';

const knownEditors = [];
let thisModuleEnabled = true;

export default {
  activate() {
    this.subscriptions = new CompositeDisposable();

    // subscribe to changing editors
    this.subscriptions.add(atom.workspace.observeActiveTextEditor((editor) => {
      if (!thisModuleEnabled || !editor || knownEditors[editor.id]) {
        return;
      }
      knownEditors[editor.id] = true;

      window.requestIdleCallback(() => {
        const filePath = editor.getPath();
        if (!filePath) {
          delete knownEditors[editor.id];
          return;
        }
        const fileName = Path.basename(filePath);
        if (fileName == 'composer.json') {
          knownEditors[editor.id] = new Composer(editor);
        }
        if (fileName == 'package.json') {
          // TODO
        }

        editor.onDidDestroy(() => {
          if (knownEditors[editor.id].deactivate) {
            knownEditors[editor.id].deactivate();
          }
          delete knownEditors[editor.id];
        });
      });
    }));

    // Register palette commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-lock-file-version-display:toggle': () => {
        thisModuleEnabled = !thisModuleEnabled;
        if (!thisModuleEnabled) {
          this.forgetAllEditors();
        }

        const message = 'Lock File Version Display has been ' + (thisModuleEnabled ? 'enabled' : 'disabled');
        const options = {};
        if (thisModuleEnabled) {
          options.description = 'Please reopen this file or switch tabs/windows to see results.';
        }
        atom.notifications.addSuccess(message, options);
      }
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.forgetAllEditors();
  },

  forgetAllEditors() {
    knownEditors.forEach((handler, i) => {
      if (handler.deactivate) {
        handler.deactivate();
      }
      delete knownEditors[i];
    });
  }
};
