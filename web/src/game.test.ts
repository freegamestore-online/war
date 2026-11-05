import { describe, it, expect } from "vitest";
import { playRound, initialDecks, type Card, type Rank } from "./game";

const cards = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: "♠" }));

describe("initialDecks", () => {
  it("deals 26 cards each from one 52-card deck", () => {
    const { you, cpu } = initialDecks();
    expect(you).toHaveLength(26);
    expect(cpu).toHaveLength(26);
    expect(new Set([...you, ...cpu].map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});

describe("playRound", () => {
  it("higher card takes both", () => {
    const r = playRound({ you: cards(9, 2), cpu: cards(5, 3) });
    expect(r.winner).toBe("you");
    expect(r.wars).toBe(0);
    expect(r.you).toHaveLength(3);
    expect(r.cpu).toHaveLength(1);
  });

  it("war burns 3 and the reveal decides", () => {
    const r = playRound({ you: cards(7, 2, 2, 2, 14, 3), cpu: cards(7, 2, 2, 2, 13, 3) });
    expect(r.winner).toBe("you");
    expect(r.wars).toBe(1);
    expect(r.taken).toBe(10);
    expect(r.yourCard.rank).toBe(14);
    expect(r.you).toHaveLength(11);
    expect(r.cpu).toHaveLength(1);
  });

  it("a war with fewer than 4 cards left still plays, burning fewer", () => {
    // CPU has only 2 cards after the tie: burns 1, reveals 1.
    const r = playRound({ you: cards(7, 2, 2, 2, 5, 3), cpu: cards(7, 2, 12) });
    expect(r.winner).toBe("cpu");
    expect(r.cpuCard.rank).toBe(12);
    expect(r.you.length + r.cpu.length).toBe(9);
  });

  it("a side with no card left to reveal loses the war", () => {
    const r = playRound({ you: cards(7, 4), cpu: cards(7) });
    expect(r.winner).toBe("you");
    expect(r.cpu).toHaveLength(0);
    expect(r.you).toHaveLength(3);
  });

  it("a double tie goes to another war instead of splitting", () => {
    const r = playRound({
      you: cards(7, 2, 2, 2, 9, 2, 2, 2, 3),
      cpu: cards(7, 2, 2, 2, 9, 2, 2, 2, 11),
    });
    expect(r.winner).toBe("cpu");
    expect(r.wars).toBe(2);
    expect(r.taken).toBe(18);
    expect(r.cpu).toHaveLength(18);
  });
});
