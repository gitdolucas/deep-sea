# Inventory HUD

**Board-first** layout: **left mission rail** (citadel, waves, speed, send wave, leave mission), **right rail** for **shells**, **collapsible defenses inventory**, and the optional **hotkey hint** (`#hudHotkeyHint` while playing), **left slide-in drawer** for the selected placed defense (details, upgrade, salvage, targeting, move). Placement flow stays defense-first: pick type → range preview on the grid → commit; spend rules live in `GameSession`, `EconomyController`, `MapController`.

## HUD / UX rationale (evaluation summary)

- **Wallet / armory coupling:** Shell currency is primarily spent in the armory; keeping **`#statShells`** in the right rail (above the Defenses toggle) groups spend UI with defense cards. Citadel survival reads stay in the **left mission** stack with wave controls.
- **Hierarchy:** Display typography is reserved for high-impact labels (e.g. main menu title, armory toggle wordmark); body copy, stats, and card text use the UI sans for legibility at small sizes.
- **Narrow / mobile:** The armory may default collapsed; the shells row remains next to the expand control so balance is visible without opening the grid.
- **Sprite cohesion:** Card thumbnails keep pixelated rendering; UI uses a crisp sans plus sparse display accents so HUD does not fight billboard sprites.

## Layout (`#gameHud` in `index.html`)

| Region | Content |
|--------|---------|
| **Left mission rail (`#hudMissionRail`)** | Single glass panel (`.hud-mission-rail__panel`): **Citadel** (`#statCastle`, `#citadelHpTrack`), wave progress (`#waveProgressHost`), speed (`#hudSpeed`), **Send wave** (`#sendWave`), **Leave mission** (`#btnMainMenu`). |
| **Right rail (`#hudRightRail`)** | **Armory** panel (`.hud-right-rail__panel--armory`) — **Shells** (`#statShells`, `#statShellsRow`), **Defenses toggle** (`#btnDefensesToggle`, `aria-expanded`, controls `#section-armory`), optional hotkey hint (`#hudHotkeyHint` under the toggle while playing), **inventory grid** (`#defenseInventoryGrid`). The armory panel scrolls when needed. |
| **Placement dock (`#placementDock`, bottom center)** | Shown only while a defense **type** is selected for placement: hint (`#placementHint`), **Cancel placement** (`#invCancel`). Visible even when the armory panel is **collapsed** so the player is never stranded. |
| **Left drawer** | **Backdrop** (`#defenseDetailBackdrop`) + **panel** (`#defenseDetailDrawer`): opens when a **placed** defense is focused (tower tap). Details, **Targeting**, **Upgrade**, **Salvage**, **Dismiss**, D-pad **Move**. Closes on backdrop tap, **Dismiss**, **Escape** (clears focus), or when the tower is removed. |

### Breakpoints

- **Wide (default desktop):** inventory grid **2 cards per row**; armory defaults **expanded** unless the user has stored a preference in `localStorage` (`deepSeaArmoryOpen`: `"1"` / `"0"`).
- **Narrow (`max-width: 720px`):** **1 card per row**, **compact** card density (horizontal thumb + text); armory defaults **collapsed** on first visit; same `localStorage` key overrides.

### Defenses toggle + placement

- Collapsing the armory **does not** cancel placement. **Cancel** remains on `#placementDock`, and **Escape** still clears placement.
- Expanding the armory is optional before picking a card; keyboard **1–6** still selects defenses when the match is **playing**.

## Inventory defense card

Each card (`[data-defense-card]`) includes:

- **1:1** icon/thumbnail (tower glyph),
- **Title** (`ARMORY_DISPLAY_NAME`),
- **Role tags** (1–2 chips from `ARMORY_ROLE_TAGS` in `src/game/defense-armory-meta.ts`),
- **Main perk** (one line from `ARMORY_CARD_PERK`),
- **Cost** accent (L1 build cost from `buildCostL1`).

**Click / tap** the card (`.pick`, `data-defense`) enters placement mode like the legacy hotbar. **Hotkeys 1–6** map to `ARMORY_DEFENSE_ORDER` via `hotbarIndexFromKey` (`src/game/hotbar-key.ts`).

## Keyboard

- **1–6** select/toggle the matching defense (same as clicking the card): only while outcome is **playing**; ignored with Ctrl/Cmd/Alt and on key repeat.

## Interaction model

### 1. Idle

- Right rail shows mission controls; armory may be collapsed (narrow default).
- Left drawer is closed; board has normal orbit unless a tower is focused (camera eases to focused tower).

### 2. Select a defense (placement mode)

- **Click** a card or press **1–6** → active placement type; selected card `aria-pressed="true"`.
- **Placement dock** appears (hint + cancel).
- Range preview follows pointer over valid empty tiles (off path, citadel, decorations); see `GameApp` + `attackRangeTiles`.

### 3–5. Hover, confirm, cancel

Unchanged from previous spec: valid cell shows rings; click commits via `tryPurchaseDefenseL1` (or type-specific purchase); **Escape**, cancel, or same-type toggle clears placement.

### Disabled / insufficient funds

- Card button **disabled** when not playing or when shells insufficient (unless already selected for placement). Status is reflected in `aria-label`.

### Defense focus — drawer + grid move

When a placed defense is focused, the **left drawer** opens. **Move** D-pad calls `GameSession.tryMoveDefenseStep`. **Upgrade** → `tryUpgradeDefense`; **Salvage** → `trySalvageDefense`; **Targeting** cycles `cycleDefenseTargetMode`. Camera FOV/orbit behavior is unchanged (`GameApp.syncDefenseFocusCamera`).

## Architecture notes

- Do **not** duplicate combat math in HUD markup — costs and stats come from `buildCostL1`, `DefenseController.upgradeShellCost`, `buildPlacedDefenseTooltipSpec`, etc.
- **Orchestration:** `GameApp` drives DOM and calls `GameSession` only for mutations.
- **Accessibility:** defenses toggle uses `aria-controls` / `aria-expanded`; drawer uses `aria-modal` when open and focus moves to the dismiss control; respect `prefers-reduced-motion` for slide transitions.

## Relation to MVP UI

`GameApp` + `index.html`: Bloons-style rails with collapsible armory and left detail drawer; keyboard shortcuts preserved from the hotbar era.
