## 1.0.2 - Bugfix
* Replace CSS selector with `.element` getter on TextEditor object. The selector introduced in v1.0.1 was fragile and caused errors. This replaces the selector with a different (more robust) approach.

## 1.0.1 - Bugfix
* Use a better CSS selector string to target the active editor. Before this, with multiple text editors (tabs) open, the annotations were added to the wrong editor / file.

## 1.0.0 - First Release
* Support for composer (composer.json / composer.lock)
