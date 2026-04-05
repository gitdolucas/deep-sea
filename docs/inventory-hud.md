# Inventory HUD

Right-side panel for **shell balance** and **buildable defenses**. It replaces the ad-hoc “select slot → side panel → Build” flow with a defense-first placement loop while keeping all spend/place rules in `src/game` (`GameSession`, `EconomyController`, `MapController`).

## Layout (right rail)

| Region | Content |
|--------|---------|
| **Shells** | Current shells (and optionally lifetime earned for meta/progression UI). Same canonical value as `EconomyController.getShells()` / top HUD. |
| **Defenses** | One entry per purchasable type (see `DefenseTypeKey` in `types.ts`). MVP: only **Arc Spine** is implemented for purchase; others can appear **locked** with copy or be hidden until `tryPurchase*` exists. |

Visual treatment should match existing deep-sea HUD: frosted panel, readable on dark 3D view (`docs/economy.md` counter guidance is a good baseline).

## Interaction model

### 1. Idle

- Panel shows balances and defense list.
- Board has normal camera/orbit; no placement ghost.

### 2. Select a defense (enter placement mode)

- **Click** a defense row/card → that type becomes the active **placement affordance**.
- Optional: highlight the selected card; dim others.
- Cursor or label indicates “place on grid.”

### 3. Hover the grid (preview)

While a defense is selected:

- **Raycast** build slots (only cells where `MapController.isBuildSlotPosition` is true and slot is empty).
- **Valid slot under cursor:** show a **range preview** for that defense at **level 1** (or selected tier if upgrades are exposed later).
  - Primary engagement radius: use `attackRangeTiles(type, level)` from `damage-resolver.ts` (e.g. Arc Spine L1 = **3** tiles).
  - For **Arc Spine**, optionally show a secondary ring or tooltip for **chain search radius** (tile Euclidean radius from `DefenseController` tuning: L1 chain hop radius **2** tiles) so players understand clustering value.
- **Invalid cell** (path, occupied, out of map): no ring, or a muted “blocked” state.

Preview is **read-only**; it must not mutate `GameSession`.

### 4. Confirm placement (economy debit)

- **Click** a valid empty build slot while a defense is selected → call the appropriate **`GameSession.tryPurchase…`** API (today: `tryPurchaseArcSpineL1`).
- **Debit rule:** shells are spent only when placement succeeds. Failed placement must not leave the economy inconsistent (session already refunds if `placeDefense` fails after spend).
- On success: exit placement mode or keep the same defense selected for rapid multi-build (product choice; document the chosen behavior in UI polish pass).

### 5. Cancel placement

- Clear selection when the user presses **Escape**, clicks a **cancel** control, or clicks the same defense again to toggle off.
- Clearing selection hides range preview and restores default pointer behavior.

## Disabled / insufficient funds

- If `getShells()` < build cost (MVP Arc Spine build: `MVP_ARC_SPINE_BUILD_COST` = **30**), the defense control should be **disabled** or show insufficient cost; clicking must not enter placement mode (or enters mode but never allows confirm — prefer disabling for clarity).

## Defense focus — grid move

When a placed defense is focused (bottom bar), **Move** / D-pad steps the tower by one tile using `GameSession.tryMoveDefenseStep` → `MapController.tryMoveDefenseTo`. Target cells use the same rules as new builds (`isBuildSlotPosition`, not occupied). No shell cost. Cooldown resets on successful move (same as reposition in sim). The main camera’s vertical FOV eases to half the normal value while the orbit pivot eases to the tower’s world position (screen center); both ease back on dismiss. Orbit pan is disabled during focus so the look-at stays aligned (tile **Move** still repositions the defense).

## Architecture notes

- **Do not** duplicate wave, targeting, or damage rules in the HUD. Range rings must derive from the same helpers the sim uses (`attackRangeTiles`, map slot checks via `MapController`).
- **Orchestration:** `GameApp` (or a dedicated UI module) reads session state, drives DOM/WebGL overlays, and calls `GameSession` for purchases only.
- **Tests:** add Vitest coverage for any new session APIs; keep preview math tested indirectly via existing `attackRangeTiles` / map tests where possible.

## Relation to current MVP UI

Current flow (`index.html` + `GameApp`): pick slot → `#panel` → **BUILD**. This spec moves **defense choice first**, then slot + range preview, then commit. Both must converge on the same session methods so balance stays single-sourced.
