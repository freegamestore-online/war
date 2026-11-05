import { useRef, useState, useCallback, useEffect } from "react";
import { GameShell, GameTopbar, GameAuth, GameButton, useGameSounds } from "@freegamestore/games";
import { useHighScore } from "./hooks/useHighScore";
import { type Card, RANK_LABEL, initialDecks, playRound } from "./game";

type SoundsApi = ReturnType<typeof useGameSounds>;

function AudioBridge({ apiRef }: { apiRef: React.MutableRefObject<SoundsApi | null> }) {
  const sounds = useGameSounds();
  apiRef.current = sounds;
  return null;
}

type Phase = "playing" | "over";

export default function App() {
  const [decks, setDecks] = useState(initialDecks);
  const { you, cpu } = decks;
  const [yourCard, setYourCard] = useState<Card | null>(null);
  const [cpuCard, setCpuCard] = useState<Card | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [message, setMessage] = useState("Tap Draw to start.");
  const [wins, setWins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, updateHighScore] = useHighScore("war-best-streak");
  const audioRef = useRef<SoundsApi | null>(null);

  const reset = useCallback(() => {
    setDecks(initialDecks());
    setYourCard(null);
    setCpuCard(null);
    setPhase("playing");
    setMessage("Tap Draw to start.");
    setWins(0);
    setStreak(0);
  }, []);

  const draw = useCallback(() => {
    if (phase === "over" || you.length === 0 || cpu.length === 0) return;
    const r = playRound(decks);
    setDecks({ you: r.you, cpu: r.cpu });
    setYourCard(r.yourCard);
    setCpuCard(r.cpuCard);

    const war = r.wars === 0 ? "" : r.wars === 1 ? "WAR — " : `WAR ×${r.wars} — `;
    if (r.winner === "you") {
      setWins((w) => w + 1);
      const ns = streak + 1;
      setStreak(ns);
      updateHighScore(ns);
      setMessage(r.wars === 0
        ? `Your ${RANK_LABEL[r.yourCard.rank]} beats ${RANK_LABEL[r.cpuCard.rank]}.`
        : `${war}your ${RANK_LABEL[r.yourCard.rank]} takes ${r.taken} cards.`);
    } else if (r.winner === "cpu") {
      setStreak(0);
      setMessage(r.wars === 0
        ? `CPU's ${RANK_LABEL[r.cpuCard.rank]} beats your ${RANK_LABEL[r.yourCard.rank]}.`
        : `${war}CPU's ${RANK_LABEL[r.cpuCard.rank]} takes ${r.taken} cards.`);
    } else {
      setMessage(`${war}both out of cards. Pile split.`);
    }

    if (r.cpu.length === 0) {
      setPhase("over");
      setMessage("You took the deck. You win!");
      audioRef.current?.playLevelUp();
    } else if (r.you.length === 0) {
      setPhase("over");
      setMessage("CPU took the deck.");
      audioRef.current?.playGameOver();
    } else if (r.winner === "you") {
      audioRef.current?.playScore();
    } else if (r.winner === "cpu") {
      audioRef.current?.playError();
    } else {
      audioRef.current?.playTick();
    }
  }, [decks, you, cpu, phase, streak, updateHighScore]);

  // Space (or Enter) draws; New Game when the game is over.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      if (e.repeat || (e.target instanceof Element && e.target.closest("button, a, input, textarea, select"))) return;
      e.preventDefault();
      if (phase === "over") reset();
      else draw();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, draw, reset]);

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
                <li>Tap Draw (or press Space) to play the top card from each deck</li>
              </ul>
              <h4 style={{ marginTop: "0.75rem", fontWeight: 600 }}>Rules</h4>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                <li>Ace high. Two equal cards trigger a war: burn 3, reveal 1 (fewer if short on cards; another tie means another war)</li>
                <li>Out of cards during a war = lose the war</li>
                <li>Won cards go to the bottom of your deck (shuffled)</li>
                <li>Run out of cards = lose. Streak counts consecutive round wins.</li>
              </ul>
            </div>
          }
          actions={<GameAuth />}
        />
      }
    >
      <AudioBridge apiRef={audioRef} />
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
