export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export interface Card { rank: Rank; suit: Suit; }

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const RANK_LABEL: Record<Rank, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8",
  9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface Decks { you: Card[]; cpu: Card[]; }

export function initialDecks(): Decks {
  const deck = shuffle(
    SUITS.flatMap((suit) => RANKS.map((rank): Card => ({ rank, suit }))),
  );
  return { you: deck.slice(0, 26), cpu: deck.slice(26) };
}

export interface RoundResult extends Decks {
  /** The last face-up cards (the war reveal if there was one). */
  yourCard: Card;
  cpuCard: Card;
  winner: "you" | "cpu" | "split";
  wars: number;
  /** Cards in the pile the winner took. */
  taken: number;
}

/**
 * Play one round. Both decks must be non-empty. Ties go to war: each side
 * burns up to 3 face-down (keeping one to reveal) and wars repeat until the
 * reveals differ. A side with no card left to reveal loses the war.
 */
export function playRound(decks: Decks): RoundResult {
  const you = decks.you.slice();
  const cpu = decks.cpu.slice();
  const pile: Card[] = [];
  let wars = 0;
  for (;;) {
    const yourCard = you.shift()!;
    const cpuCard = cpu.shift()!;
    pile.push(yourCard, cpuCard);
    let winner: RoundResult["winner"] | null = null;
    if (yourCard.rank !== cpuCard.rank) winner = yourCard.rank > cpuCard.rank ? "you" : "cpu";
    else if (you.length === 0 && cpu.length === 0) winner = "split";
    else if (you.length === 0) winner = "cpu";
    else if (cpu.length === 0) winner = "you";

    if (winner) {
      if (winner === "split") {
        const half = Math.floor(pile.length / 2);
        you.push(...shuffle(pile.slice(0, half)));
        cpu.push(...shuffle(pile.slice(half)));
      } else {
        (winner === "you" ? you : cpu).push(...shuffle(pile));
      }
      return { you, cpu, yourCard, cpuCard, winner, wars, taken: pile.length };
    }

    wars++;
    pile.push(...you.splice(0, Math.min(3, you.length - 1)));
    pile.push(...cpu.splice(0, Math.min(3, cpu.length - 1)));
  }
}
