// The tiles offered by the editor, with the meaning of their modifiers

import PrinceJS from "../PrinceJS.js";
import "../Level.js";

const T = PrinceJS.Level;

export const TILE_NAMES = {
  [T.TILE_SPACE]: "Empty",
  [T.TILE_FLOOR]: "Floor",
  [T.TILE_SPIKES]: "Spikes",
  [T.TILE_PILLAR]: "Pillar",
  [T.TILE_GATE]: "Gate",
  [T.TILE_STUCK_BUTTON]: "Stuck button",
  [T.TILE_DROP_BUTTON]: "Closer button",
  [T.TILE_TAPESTRY]: "Tapestry",
  [T.TILE_BOTTOM_BIG_PILLAR]: "Big pillar (bottom)",
  [T.TILE_TOP_BIG_PILLAR]: "Big pillar (top)",
  [T.TILE_POTION]: "Potion",
  [T.TILE_LOOSE_BOARD]: "Loose floor",
  [T.TILE_TAPESTRY_TOP]: "Tapestry (top)",
  [T.TILE_MIRROR]: "Mirror",
  [T.TILE_DEBRIS]: "Debris",
  [T.TILE_RAISE_BUTTON]: "Opener button",
  [T.TILE_EXIT_LEFT]: "Exit door (left)",
  [T.TILE_EXIT_RIGHT]: "Exit door (right)",
  [T.TILE_CHOPPER]: "Chopper",
  [T.TILE_TORCH]: "Torch",
  [T.TILE_WALL]: "Wall",
  [T.TILE_SKELETON]: "Skeleton",
  [T.TILE_SWORD]: "Sword",
  [T.TILE_BALCONY_LEFT]: "Balcony (left)",
  [T.TILE_BALCONY_RIGHT]: "Balcony (right)",
  [T.TILE_LATTICE_PILLAR]: "Lattice pillar",
  [T.TILE_LATTICE_SUPPORT]: "Lattice support",
  [T.TILE_SMALL_LATTICE]: "Small lattice",
  [T.TILE_LATTICE_LEFT]: "Lattice (left)",
  [T.TILE_LATTICE_RIGHT]: "Lattice (right)",
  [T.TILE_TORCH_WITH_DEBRIS]: "Torch with debris",
  [T.TILE_DEBRIS_ONLY]: "Debris only"
};

// The modifiers worth choosing for each element, with a name. Buttons use the modifier
// to link to gates (see model.js) and are placed unlinked.
export const MODIFIERS = {
  [T.TILE_SPACE]: [
    [0, "plain"],
    [1, "variant 1"],
    [2, "variant 2"],
    [3, "variant 3"]
  ],
  [T.TILE_FLOOR]: [
    [0, "plain"],
    [1, "variant 1"],
    [2, "variant 2"]
  ],
  [T.TILE_GATE]: [
    [0, "closed"],
    [1, "open"]
  ],
  [T.TILE_TAPESTRY]: [
    [0, "plain"],
    [1, "variant 1"],
    [2, "variant 2"]
  ],
  [T.TILE_TAPESTRY_TOP]: [
    [0, "plain"],
    [1, "variant 1"],
    [2, "variant 2"]
  ],
  [T.TILE_POTION]: [
    [T.POTION_RECOVER, "heal"],
    [T.POTION_ADD, "life"],
    [T.POTION_BUFFER, "float"],
    [T.POTION_FLIP, "upside down"],
    [T.POTION_DAMAGE, "poison"]
  ],
  [T.TILE_WALL]: [
    [0, "plain"],
    [1, "variant 1"]
  ],
  [T.TILE_DROP_BUTTON]: [[-1, "unlinked"]],
  [T.TILE_RAISE_BUTTON]: [[-1, "unlinked"]]
};

// Elements that need something more than the tile to work
export const TILE_NOTES = {
  [T.TILE_MIRROR]: "Only shows up through the script of level 4, when its exit door opens.",
  [T.TILE_EXIT_LEFT]: "Needs the right half of the door next to it.",
  [T.TILE_EXIT_RIGHT]: "Needs the left half of the door next to it.",
  [T.TILE_SKELETON]: "Only comes to life through the script of level 3."
};

// The graphics of the variants of some elements, which not every level type has
const VARIANT_FRAMES = {
  [T.TILE_SPACE]: (key, modifier) => key + "_0_" + modifier,
  [T.TILE_FLOOR]: (key, modifier) => key + "_1_" + modifier,
  [T.TILE_TAPESTRY]: (key, modifier) => key + "_7_" + modifier,
  [T.TILE_TAPESTRY_TOP]: (key, modifier) => key + "_12_" + modifier,
  [T.TILE_POTION]: (key, modifier) => key + "_10_fg_" + modifier
};

// Whether an element has graphics in a level type
export function hasGraphics(scene, type, element) {
  let key = type === T.TYPE_DUNGEON ? "dungeon" : "palace";
  let frame = element === T.TILE_MIRROR ? key + "_1_mirror" : key + "_" + element;
  return scene.textures.get(key).has(frame);
}

export function tileName(element, modifier) {
  let name = TILE_NAMES[element] || "Element " + element;
  let variants = MODIFIERS[element];
  if (variants && variants.length > 1 && modifier !== undefined) {
    let variant = variants.find((v) => v[0] === modifier);
    name += " (" + (variant ? variant[1] : modifier) + ")";
  }
  return name;
}

// The palette for a level type: [{ element, modifier, name }], only with the tiles that
// have graphics in that type
export function paletteFor(scene, type) {
  let key = type === T.TYPE_DUNGEON ? "dungeon" : "palace";
  let texture = scene.textures.get(key);
  let entries = [];
  for (let element = T.TILE_SPACE; element <= T.TILE_DEBRIS_ONLY; element++) {
    if (!hasGraphics(scene, type, element)) {
      continue;
    }
    for (let [modifier] of MODIFIERS[element] || [[0]]) {
      let variantFrame = VARIANT_FRAMES[element];
      if (modifier > 0 && variantFrame && !texture.has(variantFrame(key, modifier))) {
        continue;
      }
      entries.push({ element, modifier, name: tileName(element, modifier) });
    }
  }
  return entries;
}
