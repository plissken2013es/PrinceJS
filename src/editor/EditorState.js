// The state of the editor: the level being edited, its undo history, the tool in use
// and the selection. The view (EditorScene) and the panels (ui.js) listen to its events:
//   "level"      the level changed (or another level was loaded)
//   "selection"  the selection changed
//   "tool"       the tool or the brush changed
//   "hover"      the tile under the pointer changed

import Phaser from "phaser";
import * as model from "./model.js";

const AUTOSAVE_KEY = "princejs-editor-level";
const HISTORY_LIMIT = 200;

export class EditorState extends Phaser.Events.EventEmitter {
  constructor() {
    super();

    this.level = null;
    this.undoStack = [];
    this.redoStack = [];
    // The level as last loaded or saved, to tell whether there are unsaved changes
    this.savedLevel = null;

    // "select", "paint", "rooms" or "guard"
    this.tool = "select";
    this.brush = { element: 1, modifier: 0 };

    // null, { kind: "tile", room, index }, { kind: "room", room }, { kind: "prince" },
    // or { kind: "guard", guard }
    this.selection = null;

    // A pending click on the level: { kind: "target" | "prince" | "guard", ... }
    this.pick = null;

    this.hover = null;
  }

  load(level, saved = true) {
    this.level = model.clone(level);
    this.undoStack = [];
    this.redoStack = [];
    this.savedLevel = saved ? JSON.stringify(this.level) : null;
    this.selection = null;
    this.pick = null;
    this.emit("level");
    this.emit("selection");
    this.autosave();
  }

  // Changes the level through fn(level), which returns false if it changed nothing
  change(fn) {
    let before = JSON.stringify(this.level);
    let result = fn(this.level);
    let after = JSON.stringify(this.level);
    if (result === false || before === after) {
      return false;
    }
    this.undoStack.push(before);
    if (this.undoStack.length > HISTORY_LIMIT) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.changed();
    return true;
  }

  // Groups the changes of a drag in one undo step: begin before the first change
  beginStroke() {
    this.stroke = JSON.stringify(this.level);
  }

  // Changes the level during a stroke, without a new undo step for each change
  strokeChange(fn) {
    if (fn(this.level) !== false) {
      this.changed();
    }
  }

  endStroke() {
    if (this.stroke !== undefined && this.stroke !== JSON.stringify(this.level)) {
      this.undoStack.push(this.stroke);
      this.redoStack = [];
    }
    this.stroke = undefined;
  }

  undo() {
    if (!this.undoStack.length) {
      return;
    }
    this.redoStack.push(JSON.stringify(this.level));
    this.level = JSON.parse(this.undoStack.pop());
    this.validateSelection();
    this.changed();
  }

  redo() {
    if (!this.redoStack.length) {
      return;
    }
    this.undoStack.push(JSON.stringify(this.level));
    this.level = JSON.parse(this.redoStack.pop());
    this.validateSelection();
    this.changed();
  }

  changed() {
    this.emit("level");
    this.autosave();
  }

  get unsaved() {
    return this.savedLevel !== JSON.stringify(this.level);
  }

  markSaved() {
    this.savedLevel = JSON.stringify(this.level);
    this.emit("level");
  }

  autosave() {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ level: this.level, saved: !this.unsaved }));
    } catch (e) {
      // Storage may be full or disabled: the editor still works without it
    }
  }

  static restore() {
    try {
      return JSON.parse(localStorage.getItem(AUTOSAVE_KEY));
    } catch (e) {
      return null;
    }
  }

  setTool(tool) {
    this.tool = tool;
    this.pick = null;
    this.emit("tool");
  }

  setBrush(element, modifier) {
    this.brush = { element, modifier };
    this.setTool("paint");
  }

  select(selection) {
    this.selection = selection;
    this.pick = null;
    this.emit("selection");
  }

  // The next click on the level is handled by fn(room, index) instead of the tool
  startPick(kind, message, fn) {
    this.pick = { kind, message, fn };
    this.emit("tool");
  }

  cancelPick() {
    if (this.pick) {
      this.pick = null;
      this.emit("tool");
    }
  }

  setHover(hover) {
    let same =
      hover === this.hover ||
      (hover && this.hover && hover.room === this.hover.room && hover.index === this.hover.index);
    this.hover = hover;
    if (!same) {
      this.emit("hover");
    }
  }

  // Drops the selection if what it points to is gone
  validateSelection() {
    let selection = this.selection;
    if (!selection) {
      return;
    }
    let valid =
      selection.kind === "prince" ||
      (selection.kind === "guard" && this.level.guards[selection.guard]) ||
      ((selection.kind === "tile" || selection.kind === "room") && model.getRoom(this.level, selection.room));
    if (!valid) {
      this.select(null);
    }
  }
}
