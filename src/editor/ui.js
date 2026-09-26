// The panels around the level view: menus, tools, palette, properties and problems

import PrinceJS from "../PrinceJS.js";
import * as model from "./model.js";
import { paletteFor, tileName, hasGraphics, TILE_NAMES, TILE_NOTES, MODIFIERS } from "./palette.js";
import { renderThumbnails } from "./EditorScene.js";

const T = PrinceJS.Level;
const LEVEL_COUNT = 14;
const LEVEL_NAMES = [
  "Cell",
  "Guards",
  "Skeleton",
  "Mirror",
  "Thief",
  "Plunge",
  "Weightless",
  "Mouse",
  "Twisty",
  "Quad",
  "Fragile",
  "Tower",
  "Jaffar",
  "Rescue"
];

const TOOLS = [
  { id: "select", name: "Select", key: "V", help: "Select tiles and characters. Drag characters to move them." },
  { id: "paint", name: "Paint", key: "B", help: "Paint tiles with the palette. Right click picks a tile." },
  { id: "rooms", name: "Rooms", key: "R", help: "Click + to add a room. Drag rooms to move them." },
  { id: "guard", name: "Guard", key: "G", help: "Click a tile to add a guard." }
];

const GUARD_COLORS = ["", "blue", "red", "orange", "green", "purple", "pink", "yellow"];

// Builds DOM elements: h("div.class", { attributes }, children...)
function h(tag, attributes, ...children) {
  let [name, ...classes] = tag.split(".");
  let element = document.createElement(name);
  if (classes.length) {
    element.className = classes.join(" ");
  }
  for (let [key, value] of Object.entries(attributes || {})) {
    if (key.startsWith("on")) {
      element.addEventListener(key.slice(2), value);
    } else if (key === "checked" || key === "disabled" || key === "value" || key === "selected") {
      element[key] = value;
    } else if (value !== undefined && value !== null && value !== false) {
      element.setAttribute(key, value);
    }
  }
  for (let child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) {
      element.append(child.nodeType ? child : String(child));
    }
  }
  return element;
}

function $(selector) {
  return document.querySelector(selector);
}

export class EditorUI {
  constructor(state, options, game) {
    this.state = state;
    this.options = options;
    this.game = game;
    this.scene = null;
    this.thumbnails = {};
    this.paletteType = null;
    this.testOptions = { sword: true, health: 3 };

    this.buildHeader();
    this.buildTools();
    this.buildViewOptions();
    this.setupKeyboard();
    this.setupPlayOverlay();

    state.on("level", () => {
      this.refreshPalette();
      this.refreshProperties();
      this.refreshHeader();
    });
    state.on("selection", () => this.refreshProperties());
    state.on("tool", () => {
      this.refreshTools();
      this.refreshStatus();
    });
    state.on("hover", () => this.refreshStatus());
    game.events.on("editor-zoom", (zoom) => {
      $("#zoom").textContent = Math.round(zoom * 100) + "%";
    });
  }

  // Called once the level view is ready
  attach(scene) {
    this.scene = scene;
    this.refreshPalette();
    this.refreshProperties();
    this.refreshTools();
    this.refreshHeader();
  }

  // ---- Header: levels, files, history, test play ----

  buildHeader() {
    let select = $("#level-select");
    select.append(h("option", { value: "" }, "Open a level…"));
    let official = h("optgroup", { label: "Original levels" });
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      official.append(h("option", { value: "level:" + i }, `Level ${i} · ${LEVEL_NAMES[i - 1]}`));
    }
    select.append(official);
    select.append(
      h(
        "optgroup",
        { label: "New level" },
        h("option", { value: "new:0" }, "New dungeon level"),
        h("option", { value: "new:1" }, "New palace level")
      )
    );
    select.addEventListener("change", () => {
      let value = select.value;
      select.value = "";
      // Keep the keyboard shortcuts working
      select.blur();
      if (value) {
        this.openLevel(value);
      }
    });

    $("#import").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", (event) => {
      let file = event.target.files[0];
      event.target.value = "";
      if (file) {
        this.importFile(file);
      }
    });
    $("#export").addEventListener("click", () => this.exportLevel());
    $("#undo").addEventListener("click", () => this.state.undo());
    $("#redo").addEventListener("click", () => this.state.redo());
    $("#play").addEventListener("click", () => this.play(false));
    $("#play-here").addEventListener("click", () => this.play(true));
  }

  refreshHeader() {
    let state = this.state;
    $("#undo").disabled = !state.undoStack.length;
    $("#redo").disabled = !state.redoStack.length;
    $("#level-title").textContent = `${state.level.name} (level ${state.level.number})${state.unsaved ? " *" : ""}`;
    $("#play-here").disabled = !this.playPosition();
  }

  confirmDiscard() {
    return (
      !this.state.unsaved ||
      window.confirm("The current level has changes that were not saved to a file. Discard them?")
    );
  }

  async openLevel(value) {
    if (!this.confirmDiscard()) {
      return;
    }
    let [kind, number] = value.split(":");
    if (kind === "new") {
      this.state.load(model.newLevel(Number(number)), false);
    } else {
      let response = await fetch(`assets/maps/level${number}.json`);
      this.state.load(await response.json());
    }
    this.scene.fit();
    this.toast(`${this.state.level.name} opened`);
  }

  async importFile(file) {
    if (!this.confirmDiscard()) {
      return;
    }
    try {
      let level = JSON.parse(await file.text());
      if (!level.room || !level.size || !level.prince) {
        throw new Error("not a level");
      }
      level.guards = level.guards || [];
      level.events = level.events || [];
      this.state.load(level);
      this.scene.fit();
      this.toast(`${file.name} opened`);
    } catch (e) {
      window.alert(`${file.name} is not a PrinceJS level (${e.message})`);
    }
  }

  exportLevel() {
    let text = formatLevel(this.state.level);
    let link = h("a", {
      href: URL.createObjectURL(new Blob([text], { type: "application/json" })),
      download: `level${this.state.level.number}.json`
    });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    this.state.markSaved();
    this.toast(`Saved as level${this.state.level.number}.json`);
  }

  // ---- Tools and palette ----

  buildTools() {
    let tools = $("#tools");
    for (let tool of TOOLS) {
      tools.append(
        h(
          "button.tool",
          { "data-tool": tool.id, title: `${tool.help} (${tool.key})`, onclick: () => this.state.setTool(tool.id) },
          tool.name,
          h("kbd", {}, tool.key)
        )
      );
    }
  }

  refreshTools() {
    for (let button of document.querySelectorAll("#tools .tool")) {
      button.classList.toggle("active", button.dataset.tool === this.state.tool);
    }
    for (let button of document.querySelectorAll("#palette button")) {
      let brush = this.state.brush;
      button.classList.toggle(
        "active",
        this.state.tool === "paint" &&
          Number(button.dataset.element) === brush.element &&
          Number(button.dataset.modifier) === brush.modifier
      );
    }
    let pick = this.state.pick;
    $("#pick").hidden = !pick;
    $("#pick-message").textContent = pick ? pick.message : "";
    $("#brush-name").textContent = "Brush: " + tileName(this.state.brush.element, this.state.brush.modifier);
    let tool = TOOLS.find((t) => t.id === this.state.tool);
    $("#tool-help").textContent = tool ? tool.help : "";
  }

  async refreshPalette() {
    let type = this.state.level.type;
    if (!this.scene || type === this.paletteType) {
      return;
    }
    this.paletteType = type;
    let entries = paletteFor(this.scene, type);
    let palette = $("#palette");
    palette.textContent = "";
    this.thumbnails = await renderThumbnails(this.scene, type, entries);
    for (let entry of entries) {
      palette.append(
        h(
          "button",
          {
            "data-element": entry.element,
            "data-modifier": entry.modifier,
            title: entry.name,
            onclick: () => this.state.setBrush(entry.element, entry.modifier)
          },
          h("img", { src: this.thumbnails[entry.element + ":" + entry.modifier], alt: entry.name })
        )
      );
    }
    // Keep a brush that exists in this level type
    let brush = this.state.brush;
    if (!entries.some((e) => e.element === brush.element && e.modifier === brush.modifier)) {
      this.state.brush = { element: T.TILE_FLOOR, modifier: 0 };
    }
    this.refreshTools();
  }

  buildViewOptions() {
    let options = this.options;
    let view = $("#view-options");
    let toggle = (key, label) =>
      h(
        "label",
        {},
        h("input", {
          type: "checkbox",
          checked: options[key],
          onchange: (event) => {
            options[key] = event.target.checked;
            if (this.scene) {
              this.scene.drawLabels();
              this.scene.drawOverlay();
            }
          }
        }),
        label
      );
    view.append(
      toggle("grid", "Tile grid"),
      toggle("roomNumbers", "Room numbers"),
      toggle("allLinks", "All button links"),
      toggle("animate", "Animate")
    );
    $("#zoom-in").addEventListener("click", () => this.scene.zoomBy(1.25));
    $("#zoom-out").addEventListener("click", () => this.scene.zoomBy(0.8));
    $("#zoom-fit").addEventListener("click", () => this.scene.fit());
    $("#pick-cancel").addEventListener("click", () => this.state.cancelPick());
  }

  refreshStatus() {
    let hover = this.state.hover;
    let text = "";
    if (hover && hover.room !== -1) {
      let tile = model.getTile(this.state.level, hover.room, hover.index);
      text = `Room ${hover.room} · column ${hover.index % 10}, row ${Math.floor(hover.index / 10)} · ${tileName(
        tile.element,
        tile.modifier
      )}`;
      if (model.isButton(tile)) {
        text += ` · event ${tile.modifier}`;
      }
    } else if (hover) {
      text = "Empty cell";
    }
    $("#status").textContent = text;
  }

  // ---- Properties ----

  refreshProperties() {
    let panel = $("#properties");
    panel.textContent = "";
    let selection = this.state.selection;
    if (selection && selection.kind === "tile") {
      panel.append(this.tileProperties(selection.room, selection.index));
    } else if (selection && selection.kind === "room") {
      panel.append(this.roomProperties(selection.room));
    } else if (selection && selection.kind === "prince") {
      panel.append(this.princeProperties());
    } else if (selection && selection.kind === "guard") {
      panel.append(this.guardProperties(selection.guard));
    } else {
      panel.append(h("p.hint", {}, "Select a tile, a room or a character to edit it."));
    }
    $("#level-properties").textContent = "";
    $("#level-properties").append(this.levelProperties());
    this.refreshProblems();
    $("#play-here").disabled = !this.playPosition();
  }

  tileProperties(room, index) {
    let state = this.state;
    let level = state.level;
    let tile = model.getTile(level, room, index);
    let section = h("section", {}, h("h2", {}, tileName(tile.element, tile.modifier)));
    section.append(
      h("p.coords", {}, `Room ${room} · column ${index % 10}, row ${Math.floor(index / 10)}`),
      this.field(
        "Tile",
        this.select(
          paletteFor(this.scene, level.type)
            .filter((entry, i, all) => all.findIndex((e) => e.element === entry.element) === i)
            .map((entry) => [entry.element, tileName(entry.element)]),
          tile.element,
          (value) => {
            let variants = MODIFIERS[value];
            state.change((l) => model.setTile(l, room, index, value, variants ? variants[0][0] : 0));
          }
        )
      )
    );

    let variants = MODIFIERS[tile.element];
    if (variants && variants.length > 1) {
      section.append(
        this.field(
          "Variant",
          this.select(variants, tile.modifier, (value) => state.change((l) => model.setModifier(l, room, index, value)))
        )
      );
    }
    if (TILE_NOTES[tile.element]) {
      section.append(h("p.note", {}, TILE_NOTES[tile.element]));
    }

    if (model.isButton(tile)) {
      section.append(this.buttonLinks(room, index, tile));
    }
    if (model.isTarget(tile)) {
      let buttons = model.buttonsFor(level, room, index);
      section.append(
        h("h3", {}, "Opened and closed by"),
        buttons.length
          ? h(
              "ul.links",
              {},
              buttons.map((button) =>
                h(
                  "li",
                  {},
                  h(
                    "a",
                    { href: "#", onclick: (e) => this.selectTile(e, button.room, button.index) },
                    `${tileName(button.tile.element)} in room ${button.room}`
                  )
                )
              )
            )
          : h("p.hint", {}, "No button opens or closes it.")
      );
    }

    let characters = model.charactersAt(level, room, index);
    let actions = h("div.actions", {});
    for (let character of characters) {
      let name = character === "prince" ? "Prince" : `Guard ${character + 1}`;
      actions.append(
        h(
          "button",
          {
            onclick: () =>
              state.select(character === "prince" ? { kind: "prince" } : { kind: "guard", guard: character })
          },
          `Select ${name.toLowerCase()}`
        )
      );
    }
    actions.append(
      h(
        "button",
        {
          onclick: () =>
            state.change((l) => {
              l.prince.room = room;
              l.prince.location = index;
            })
        },
        "Place the prince here"
      ),
      h(
        "button",
        {
          onclick: () => {
            state.change((l) => {
              l.guards.push(model.newGuard(room, index));
              state.selection = { kind: "guard", guard: l.guards.length - 1 };
            });
            state.emit("selection");
          }
        },
        "Add a guard here"
      )
    );
    section.append(actions);
    return section;
  }

  buttonLinks(room, index, tile) {
    let state = this.state;
    let level = state.level;
    let targets = model.buttonTargets(level, tile);
    let sharing = model.sharingButtons(level, tile).length - 1;
    let opens = tile.element === T.TILE_RAISE_BUTTON;
    let box = h("div", {}, h("h3", {}, opens ? "Opens" : "Closes"));

    let setTargets = (list) => state.change((l) => model.setButtonTargets(l, room, index, list));
    if (targets.length) {
      box.append(
        h(
          "ul.links",
          {},
          targets.map((target, i) => {
            let targetTile = model.getTile(level, target.room, target.index);
            return h(
              "li",
              {},
              h(
                "a",
                { href: "#", onclick: (e) => this.selectTile(e, target.room, target.index) },
                `${targetTile ? tileName(targetTile.element) : "Missing tile"} in room ${target.room}`
              ),
              h("button.remove", { title: "Unlink", onclick: () => setTargets(targets.filter((t, j) => j !== i)) }, "×")
            );
          })
        )
      );
    } else {
      box.append(h("p.hint", {}, "Not linked to any gate or door yet."));
    }
    if (sharing > 0) {
      box.append(
        h("p.note", {}, `Shares its links with ${sharing} other button${sharing > 1 ? "s" : ""}: changes apply to all.`)
      );
    }
    box.append(
      h(
        "div.actions",
        {},
        h(
          "button",
          {
            onclick: () =>
              state.startPick("target", "Click a gate or an exit door to link it", (r, i) => {
                let picked = model.getTile(state.level, r, i);
                if (!model.isTarget(picked)) {
                  this.toast("Only gates and exit doors can be linked");
                  return;
                }
                let target = model.normalizeTarget(state.level, r, i);
                let current = model.buttonTargets(state.level, model.getTile(state.level, room, index));
                if (!current.some((t) => t.room === target.room && t.index === target.index)) {
                  state.change((l) => model.setButtonTargets(l, room, index, current.concat([target])));
                }
                state.cancelPick();
              })
          },
          "Link a gate or door…"
        ),
        h(
          "button",
          {
            onclick: () =>
              state.startPick("button", "Click another button to share its links", (r, i) => {
                let other = model.getTile(state.level, r, i);
                if (!model.isButton(other) || (r === room && i === index)) {
                  this.toast("Click another button");
                  return;
                }
                state.change((l) => model.shareButtonTargets(l, room, index, model.getTile(l, r, i)));
                state.cancelPick();
              })
          },
          "Same links as…"
        ),
        targets.length ? h("button", { onclick: () => setTargets([]) }, "Unlink all") : null
      )
    );
    return box;
  }

  roomProperties(id) {
    let state = this.state;
    let level = state.level;
    let position = model.roomPosition(level, id);
    let neighbour = (dx, dy) => {
      let other = model.roomAt(level, position.x + dx, position.y + dy);
      return other === -1 ? "wall" : `room ${other}`;
    };
    return h(
      "section",
      {},
      h("h2", {}, `Room ${id}`),
      h("p.coords", {}, `Column ${position.x}, row ${position.y} of the map`),
      h(
        "dl.neighbours",
        {},
        h("dt", {}, "Left"),
        h("dd", {}, neighbour(-1, 0)),
        h("dt", {}, "Right"),
        h("dd", {}, neighbour(1, 0)),
        h("dt", {}, "Up"),
        h("dd", {}, neighbour(0, -1)),
        h("dt", {}, "Down"),
        h("dd", {}, neighbour(0, 1))
      ),
      h("p.hint", {}, "Drag the room with the Rooms tool to move it. Double click it to zoom in."),
      h(
        "div.actions",
        {},
        h("button", { onclick: () => this.scene.focusRoom(id) }, "Zoom in"),
        h(
          "button",
          {
            onclick: () => {
              let brush = state.brush;
              state.change((l) => {
                model.getRoom(l, id).tile.forEach((tile, i) => model.setTile(l, id, i, brush.element, brush.modifier));
              });
            }
          },
          `Fill with ${tileName(state.brush.element, state.brush.modifier).toLowerCase()}`
        ),
        h(
          "button.danger",
          {
            disabled: model.rooms(level).length <= 1,
            onclick: () => {
              if (window.confirm(`Delete room ${id} and the guards in it?`)) {
                state.change((l) => model.removeRoom(l, id));
                state.select(null);
              }
            }
          },
          "Delete room"
        )
      )
    );
  }

  princeProperties() {
    let state = this.state;
    let prince = state.level.prince;
    let set = (fn) => state.change((l) => fn(l.prince));
    return h(
      "section",
      {},
      h("h2", {}, "Prince"),
      h(
        "p.coords",
        {},
        `Room ${prince.room} · column ${prince.location % 10}, row ${Math.floor(prince.location / 10)}`
      ),
      this.field(
        "Facing",
        this.select(
          [
            [-1, "left"],
            [1, "right"]
          ],
          model.princeFacing(prince),
          (value) => set((p) => model.setPrinceFacing(p, value))
        )
      ),
      this.checkbox("Turns around as the level starts", prince.turn !== false, (value) =>
        set((p) => model.setPrinceTurn(p, value))
      ),
      this.field(
        "Offset",
        this.number(prince.offset || 0, -14, 14, (value) =>
          set((p) => {
            if (value) {
              p.offset = value;
            } else {
              delete p.offset;
            }
          })
        )
      ),
      this.field(
        "Camera room",
        this.number(prince.cameraRoom || 0, 0, 99, (value) =>
          set((p) => {
            if (value) {
              p.cameraRoom = value;
            } else {
              delete p.cameraRoom;
            }
          })
        )
      ),
      h("p.hint", {}, "Camera room: the room shown at the start, if not the prince's (0: his room)."),
      h("div.actions", {}, this.moveButton("prince"))
    );
  }

  guardProperties(i) {
    let state = this.state;
    let guard = state.level.guards[i];
    let set = (fn) => state.change((l) => fn(l.guards[i]));
    let section = h(
      "section",
      {},
      h("h2", {}, `Guard ${i + 1}`),
      h("p.coords", {}, `Room ${guard.room} · column ${guard.location % 10}, row ${Math.floor(guard.location / 10)}`),
      this.field(
        "Character",
        this.select(
          model.GUARD_TYPES.map((type) => [type, type]),
          guard.type,
          (value) =>
            set((g) => {
              g.type = value;
              g.colors = value === "guard" ? g.colors || 1 : 0;
            })
        )
      )
    );
    if (guard.type === "guard") {
      section.append(
        this.field(
          "Colors",
          this.select(
            GUARD_COLORS.slice(1).map((name, c) => [c + 1, name]),
            guard.colors,
            (value) => set((g) => (g.colors = value))
          )
        )
      );
    }
    section.append(
      this.field(
        "Skill",
        this.number(guard.skill, 0, 11, (value) => set((g) => (g.skill = value)))
      ),
      this.field(
        "Facing",
        this.select(
          [
            [-1, "left"],
            [1, "right"]
          ],
          guard.direction,
          (value) => set((g) => (g.direction = value))
        )
      ),
      this.checkbox("Visible at the start", guard.visible !== false, (value) =>
        set((g) => {
          if (value) {
            delete g.visible;
          } else {
            g.visible = false;
          }
        })
      ),
      this.checkbox("Active at the start", guard.active !== false, (value) =>
        set((g) => {
          if (value) {
            delete g.active;
          } else {
            g.active = false;
          }
        })
      ),
      h(
        "p.hint",
        {},
        "The shadow, the skeleton and Jaffar are driven by the scripts of their original levels (3, 4, 5, 6, 12, 13)."
      ),
      h(
        "div.actions",
        {},
        this.moveButton(i),
        h(
          "button.danger",
          {
            onclick: () => {
              state.change((l) => l.guards.splice(i, 1));
              state.select(null);
            }
          },
          "Delete guard"
        )
      )
    );
    return section;
  }

  moveButton(character) {
    let state = this.state;
    return h(
      "button",
      {
        onclick: () =>
          state.startPick("character", "Click the tile to move to", (room, index) => {
            state.change((l) => {
              let c = character === "prince" ? l.prince : l.guards[character];
              c.room = room;
              c.location = index;
            });
            state.cancelPick();
          })
      },
      "Move…"
    );
  }

  levelProperties() {
    let state = this.state;
    let level = state.level;
    let set = (fn) => state.change(fn);
    return h(
      "section",
      {},
      h("h2", {}, "Level"),
      this.field(
        "Name",
        h("input", {
          type: "text",
          value: level.name,
          onchange: (event) => set((l) => (l.name = event.target.value))
        })
      ),
      this.field(
        "Number",
        this.number(level.number, 1, 14, (value) =>
          set((l) => {
            l.number = value;
          })
        )
      ),
      h("p.hint", {}, "The number picks the guards' strength and the game's script for that level."),
      this.field(
        "Type",
        this.select(
          [
            [T.TYPE_DUNGEON, "dungeon"],
            [T.TYPE_PALACE, "palace"]
          ],
          level.type,
          (value) => set((l) => (l.type = value))
        )
      ),
      h(
        "p.coords",
        {},
        `${model.rooms(level).length} rooms · ${level.guards.length} guards · ${level.events.length} events`
      ),
      h("h3", {}, "Test play"),
      this.checkbox("Prince has a sword", this.testOptions.sword, (value) => (this.testOptions.sword = value)),
      this.field(
        "Lives",
        this.number(this.testOptions.health, 1, 10, (value) => (this.testOptions.health = value))
      )
    );
  }

  refreshProblems() {
    let list = $("#problems");
    list.textContent = "";
    let level = this.state.level;
    let problems = model.check(level);
    // Tiles of the other level type, which have no graphics in this one
    if (this.scene) {
      for (let room of model.rooms(level)) {
        room.tile.forEach((tile, index) => {
          if (!hasGraphics(this.scene, level.type, tile.element)) {
            let type = level.type === T.TYPE_DUNGEON ? "dungeon" : "palace";
            problems.push({
              message: `${TILE_NAMES[tile.element]} does not exist in ${type} levels`,
              room: room.id,
              index,
              info: false
            });
          }
        });
      }
    }
    problems.sort((a, b) => a.info - b.info);
    $("#problems-count").textContent = problems.length ? `(${problems.length})` : "";
    if (!problems.length) {
      list.append(h("li.ok", {}, "No problems found"));
    }
    for (let problem of problems) {
      list.append(
        h(
          problem.info ? "li.info" : "li",
          {},
          problem.room !== undefined
            ? h("a", { href: "#", onclick: (e) => this.selectTile(e, problem.room, problem.index) }, problem.message)
            : problem.message
        )
      );
    }
  }

  selectTile(event, room, index) {
    event.preventDefault();
    this.state.select({ kind: "tile", room, index });
  }

  // ---- Form helpers ----

  field(label, input) {
    return h("label.field", {}, h("span", {}, label), input);
  }

  select(options, value, onchange) {
    return h(
      "select",
      {
        onchange: (event) => {
          let option = options[event.target.selectedIndex];
          onchange(option[0]);
        }
      },
      options.map(([v, name]) => h("option", { selected: v === value }, name))
    );
  }

  number(value, min, max, onchange) {
    return h("input", {
      type: "number",
      value: value,
      min: min,
      max: max,
      onchange: (event) => {
        let v = Math.round(Number(event.target.value));
        if (Number.isFinite(v)) {
          onchange(Math.min(max, Math.max(min, v)));
        }
      }
    });
  }

  checkbox(label, checked, onchange) {
    return h(
      "label.check",
      {},
      h("input", { type: "checkbox", checked: checked, onchange: (event) => onchange(event.target.checked) }),
      label
    );
  }

  toast(message) {
    let toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // ---- Keyboard ----

  setupKeyboard() {
    window.addEventListener("keydown", (event) => {
      let target = event.target;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") {
        return;
      }
      if (!$("#play-overlay").hidden) {
        return;
      }
      let state = this.state;
      let ctrl = event.ctrlKey || event.metaKey;
      let key = event.key.toLowerCase();
      if (ctrl && key === "z" && !event.shiftKey) {
        state.undo();
      } else if (ctrl && (key === "y" || (key === "z" && event.shiftKey))) {
        state.redo();
      } else if (ctrl && key === "s") {
        this.exportLevel();
      } else if (ctrl) {
        return;
      } else if (key === "escape") {
        if (state.pick) {
          state.cancelPick();
        } else {
          state.select(null);
        }
      } else if (key === "delete" || key === "backspace") {
        this.deleteSelection();
      } else if (TOOLS.some((tool) => tool.key.toLowerCase() === key)) {
        state.setTool(TOOLS.find((tool) => tool.key.toLowerCase() === key).id);
      } else if (key === "f") {
        this.scene.fit();
      } else if (key === "+" || key === "=") {
        this.scene.zoomBy(1.25);
      } else if (key === "-") {
        this.scene.zoomBy(0.8);
      } else if (key === "p") {
        this.play(event.shiftKey);
      } else if (key.startsWith("arrow")) {
        let camera = this.scene.cameras.main;
        let step = 64 / camera.zoom;
        camera.scrollX += key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        camera.scrollY += key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
      } else {
        return;
      }
      event.preventDefault();
    });
  }

  deleteSelection() {
    let state = this.state;
    let selection = state.selection;
    if (selection && selection.kind === "guard") {
      state.change((l) => l.guards.splice(selection.guard, 1));
      state.select(null);
    } else if (selection && selection.kind === "tile") {
      state.change((l) => model.setTile(l, selection.room, selection.index, T.TILE_SPACE, 0));
    }
  }

  // ---- Test play ----

  // Where "play from here" starts: the selected tile, if the prince can stand there
  playPosition() {
    let selection = this.state.selection;
    if (selection && selection.kind === "tile") {
      return { room: selection.room, location: selection.index };
    }
    return null;
  }

  play(fromHere) {
    let errors = model.check(this.state.level).filter((problem) => !problem.info);
    if (errors.length && !window.confirm(`The level has problems:\n${errors[0].message}\n\nPlay it anyway?`)) {
      return;
    }
    let level = model.clone(this.state.level);
    if (fromHere) {
      let position = this.playPosition();
      if (!position) {
        this.toast("Select the tile to start from");
        return;
      }
      level.prince = { location: position.location, room: position.room, direction: model.princeFacing(level.prince) };
      level.prince.turn = false;
    }
    try {
      localStorage.setItem(
        PrinceJS.TEST_PLAY_KEY,
        JSON.stringify({ level: level, sword: this.testOptions.sword, health: this.testOptions.health })
      );
    } catch (e) {
      window.alert("The level cannot be passed to the game: the browser storage is not available.");
      return;
    }
    let frame = $("#play-frame");
    frame.src = "index.html?test=" + Date.now();
    $("#play-overlay").hidden = false;
    this.game.loop.sleep();
  }

  setupPlayOverlay() {
    let frame = $("#play-frame");
    let close = () => {
      if ($("#play-overlay").hidden) {
        return;
      }
      $("#play-overlay").hidden = true;
      frame.src = "about:blank";
      this.game.loop.wake();
      window.focus();
    };
    this.closePlay = close;
    frame.addEventListener("load", () => {
      if (frame.src === "about:blank") {
        return;
      }
      frame.contentWindow.focus();
      frame.contentWindow.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          close();
        }
      });
    });
    $("#play-close").addEventListener("click", close);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
      }
    });
    window.addEventListener("message", (event) => {
      if (event.origin === location.origin && event.data && event.data.type === "princejs-test-play") {
        close();
        this.toast("Level completed!");
      }
    });
  }
}

// The level in the format of the files in assets/maps
export function formatLevel(level) {
  return JSON.stringify(level, null, 3).replace(/^(\s*"(?:[^"\\]|\\.)*"): /gm, "$1:");
}
