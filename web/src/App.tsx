import { useState, useCallback } from "react";
import { GameShell, GameTopbar, GameAuth, GameButton } from "@freegamestore/games";
import { useHighScore } from "./hooks/useHighScore";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
interface Card { rank: Rank; suit: Suit; }

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const RANK_LABEL: Record<Rank, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8",
  9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

function freshDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j]!, d[i]!];
  }
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function initialDecks(): { you: Card[]; cpu: Card[] } {
  const deck = freshDeck();
  return { you: deck.slice(0, 26), cpu: deck.slice(26) };
}

type Phase = "playing" | "over";

export default function App() {
  const initial = initialDecks();
  const [you, setYou] = useState<Card[]>(initial.you);
  const [cpu, setCpu] = useState<Card[]>(initial.cpu);
  const [yourCard, setYourCard] = useState<Card | null>(null);
  const [cpuCard, setCpuCard] = useState<Card | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [message, setMessage] = useState("Tap Draw to start.");
  const [wins, setWins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, updateHighScore] = useHighScore("war-best-streak");

  const reset = useCallback(() => {
    const d = initialDecks();
    setYou(d.you);
    setCpu(d.cpu);
    setYourCard(null);
    setCpuCard(null);
    setPhase("playing");
    setMessage("Tap Draw to start.");
    setStreak(0);
  }, []);

  const draw = useCallback(() => {
    if (phase === "over") return;
    const yc = you[0];
    const cc = cpu[0];
    if (!yc || !cc) return;

    const yRest = you.slice(1);
    const cRest = cpu.slice(1);
    let pile: Card[] = [yc, cc];

    setYourCard(yc);
    setCpuCard(cc);

    if (yc.rank > cc.rank) {
      setYou(yRest.concat(shuffle(pile)));
      setCpu(cRest);
      setWins((w) => w + 1);
      setStreak((s) => { const ns = s + 1; updateHighScore(ns); return ns; });
      setMessage(`Your ${RANK_LABEL[yc.rank]} beats ${RANK_LABEL[cc.rank]}.`);
      if (cRest.length === 0) { setPhase("over"); setMessage("You took the deck. You win!"); }
      return;
    }
    if (cc.rank > yc.rank) {
      setYou(yRest);
      setCpu(cRest.concat(shuffle(pile)));
      setStreak(0);
      setMessage(`CPU's ${RANK_LABEL[cc.rank]} beats your ${RANK_LABEL[yc.rank]}.`);
      if (yRest.length === 0) { setPhase("over"); setMessage("CPU took the deck."); }
      return;
    }

    // War — each side burns 3 face-down, reveals 1
    if (yRest.length < 4 || cRest.length < 4) {
      setPhase("over");
      setMessage(yRest.length < 4 ? "CPU wins the war." : "You win the war!");
      return;
    }
    const yourBurn = yRest.slice(0, 3);
    const cpuBurn = cRest.slice(0, 3);
    const yourReveal = yRest[3]!;
    const cpuReveal = cRest[3]!;
    pile = pile.concat(yourBurn, cpuBurn, [yourReveal, cpuReveal]);
    const yRest2 = yRest.slice(4);
    const cRest2 = cRest.slice(4);
    setYourCard(yourReveal);
    setCpuCard(cpuReveal);

    if (yourReveal.rank > cpuReveal.rank) {
      setYou(yRest2.concat(shuffle(pile)));
      setCpu(cRest2);
      setWins((w) => w + 1);
      setStreak((s) => { const ns = s + 1; updateHighScore(ns); return ns; });
      setMessage(`WAR — your ${RANK_LABEL[yourReveal.rank]} takes ${pile.length} cards.`);
    } else if (cpuReveal.rank > yourReveal.rank) {
      setYou(yRest2);
      setCpu(cRest2.concat(shuffle(pile)));
      setStreak(0);
      setMessage(`WAR — CPU's ${RANK_LABEL[cpuReveal.rank]} takes ${pile.length} cards.`);
    } else {
      const half = Math.floor(pile.length / 2);
      setYou(yRest2.concat(shuffle(pile.slice(0, half))));
      setCpu(cRest2.concat(shuffle(pile.slice(half))));
      setMessage("Double tie. Pile split.");
    }
    if (yRest2.length === 0 || cRest2.length === 0) {
      setPhase("over");
      setMessage(yRest2.length === 0 ? "CPU wins after war." : "You win after war!");
    }
  }, [you, cpu, phase, updateHighScore]);

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="War"
          stats={[
            { label: "You", value: you.length, accent: true },
            { label: "CPU", value: cpu.length },
            { label: "Win", value: wins },
            { label: "Best", value: bestStreak },
          ]}
          rules={
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontWeight: 700 }}>War</h3>
              <p>Each round, both draw one card. Higher card takes both.</p>
              <h4 style={{ marginTop: "0.75rem", fontWeight: 600 }}>Controls</h4>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                <li>Tap Draw to play the top card from each deck</li>
              </ul>
              <h4 style={{ marginTop: "0.75rem", fontWeight: 600 }}>Rules</h4>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                <li>Ace high. Two equal cards trigger a war: burn 3, reveal 1</li>
                <li>Won cards go to the bottom of your deck (shuffled)</li>
                <li>Run out of cards = lose. Streak counts consecutive round wins.</li>
              </ul>
            </div>
          }
          actions={<GameAuth />}
        />
      }
    >
      <div className="flex flex-col items-center justify-center h-full gap-4 p-3 overflow-hidden">
        <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>CPU</div>
        <CardSlot card={cpuCard} />

        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 700,
            fontSize: "clamp(0.9rem, 4vmin, 1.1rem)",
            color: "var(--muted)",
            textAlign: "center",
            minHeight: "1.6em",
            maxWidth: "20rem",
          }}
        >
          {message}
        </div>

        <CardSlot card={yourCard} />
        <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>You · streak {streak}</div>

        <div className="flex gap-2">
          {phase !== "over" && you.length > 0 && cpu.length > 0 && (
            <GameButton size="md" variant="primary" onClick={draw}>Draw</GameButton>
          )}
          {phase === "over" && (
            <GameButton size="md" variant="primary" onClick={reset}>New Game</GameButton>
          )}
          {phase !== "over" && (
            <GameButton size="sm" variant="ghost" onClick={reset}>Reset</GameButton>
          )}
        </div>

        <a
          href="https://freegamestore.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--muted)", fontSize: "0.7rem", textDecoration: "none" }}
        >
          Part of FreeGameStore — free forever
        </a>
      </div>
    </GameShell>
  );
}

function CardSlot({ card }: { card: Card | null }) {
  if (!card) {
    return (
      <div
        style={{
          width: "clamp(3.4rem, 16vmin, 5rem)",
          height: "clamp(4.8rem, 22vmin, 7rem)",
          borderRadius: "0.5rem",
          border: "1.5px dashed var(--line-strong)",
        }}
      />
    );
  }
  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <div
      style={{
        width: "clamp(3.4rem, 16vmin, 5rem)",
        height: "clamp(4.8rem, 22vmin, 7rem)",
        borderRadius: "0.5rem",
        background: "var(--paper)",
        border: "1px solid var(--line-strong)",
        color: red ? "#dc2626" : "var(--ink)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "0.35rem 0.5rem",
        fontFamily: "Fraunces, serif",
        fontWeight: 700,
        fontSize: "clamp(1rem, 5vmin, 1.5rem)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      <span>{RANK_LABEL[card.rank]}</span>
      <span style={{ alignSelf: "flex-end", fontSize: "1.4em" }}>{card.suit}</span>
    </div>
  );
}
