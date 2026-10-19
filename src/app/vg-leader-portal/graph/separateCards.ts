// A card's centre and the d3 pins on it (fx/fy: the tree layout pins each row's y, a drag pins both).
type Card = { x?: number; y?: number; fx?: number; fy?: number };

// Below this, two cards count as clear of each other (rounding left over from a push).
const EPSILON = 0.01;

/**
 * Tree rows (cards pinned to the same y): lay each row out left to right with at least `minDx`
 * between centres, keeping their order and moving the cards as little as possible overall. A
 * card being dragged (fx set) stays where it is. That's isotonic regression on x − i·minDx,
 * solved by pooling adjacent violators.
 */
function packRows(cards: Card[], minDx: number) {
  const rows = new Map<number, Card[]>();
  for (const c of cards) {
    if (c.fy == null) continue;
    const row = rows.get(c.fy);
    if (row) row.push(c);
    else rows.set(c.fy, [c]);
  }
  for (const row of rows.values()) {
    if (row.length < 2) continue;
    row.sort((a, b) => a.x! - b.x!);
    const blocks: { sum: number; weight: number; count: number }[] = [];
    row.forEach((c, i) => {
      const weight = c.fx != null ? 1e6 : 1;
      let block = { sum: (c.x! - i * minDx) * weight, weight, count: 1 };
      for (let prev = blocks.at(-1); prev && prev.sum / prev.weight > block.sum / block.weight; prev = blocks.at(-1)) {
        blocks.pop();
        block = { sum: prev.sum + block.sum, weight: prev.weight + block.weight, count: prev.count + block.count };
      }
      blocks.push(block);
    });
    let i = 0;
    for (const b of blocks) {
      for (let k = 0; k < b.count; k++, i++) {
        if (row[i].fx == null) row[i].x = b.sum / b.weight + i * minDx;
      }
    }
  }
}

/**
 * One sweep (sorted by x, so only near neighbours are compared) pushing every overlapping pair
 * apart along the axis they overlap least on — or the other axis if that one is pinned for both.
 * A pinned card doesn't move; the other one takes the whole push. Returns whether anything moved.
 */
function pushApart(cards: Card[], minDx: number, minDy: number) {
  const sorted = [...cards].sort((a, b) => a.x! - b.x!);
  let moved = false;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length && sorted[j].x! - a.x! < minDx; j++) {
      const b = sorted[j];
      const dx = b.x! - a.x!;
      const dy = b.y! - a.y!;
      const ox = minDx - Math.abs(dx);
      const oy = minDy - Math.abs(dy);
      if (ox <= EPSILON || oy <= EPSILON) continue;
      const xFree = a.fx == null || b.fx == null;
      const yFree = a.fy == null || b.fy == null;
      const axis = xFree && (!yFree || ox <= oy) ? "x" : yFree ? "y" : null;
      if (!axis) continue;
      const pin = axis === "x" ? "fx" : "fy";
      const overlap = axis === "x" ? ox : oy;
      const dir = (axis === "x" ? dx : dy) >= 0 ? 1 : -1;
      const aShare = a[pin] != null ? 0 : b[pin] != null ? 1 : 0.5;
      a[axis] = a[axis]! - dir * overlap * aShare;
      b[axis] = b[axis]! + dir * overlap * (1 - aShare);
      moved = true;
    }
  }
  return moved;
}

/**
 * Moves cards apart so none overlap — run after every layout tick, so whatever the forces did,
 * the frame that's drawn has every name readable. `minDx` × `minDy` is the room a card needs
 * around its centre (its size plus the gap kept between cards). `settle` (when the layout has
 * stopped, so nothing pushes back) keeps going until every overlap is gone.
 */
export function separateCards(cards: Card[], minDx: number, minDy: number, settle = false) {
  const placed = cards.filter((c) => c.x != null && c.y != null);
  packRows(placed, minDx);
  const passes = settle ? 500 : 5;
  for (let i = 0; i < passes && pushApart(placed, minDx, minDy); i++);
}
