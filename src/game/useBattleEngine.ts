import { useRef, useState, useCallback, useEffect } from "react";
import type { Chapter } from "@/data/chapters";

export interface GameState {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  ammo: number;
  grenades: number;
  mines: number;
  progress: number;
  crouching: boolean;
  aiming: boolean;
  reloadCooldown: number;
  meleeCooldown: number;
  grenadeCooldown: number;
  mineCooldown: number;
  enemiesRemaining: number;
  alliesAlive: number;
  message: string;
  messageTimer: number;
  running: boolean;
  ended: "victory" | "defeat" | null;
}

export interface EngineApi {
  state: GameState;
  init: (chapter: Chapter) => void;
  onEnd: (cb: (r: "victory" | "defeat") => void) => () => void;
  setState: (updater: (s: GameState) => GameState) => void;
  registerFrame: (fn: (dt: number, s: GameState) => Partial<GameState> | void) => () => void;
  chapterRef: React.MutableRefObject<Chapter | null>;
}

export function useBattleEngine(): EngineApi {
  const [state, setStateRaw] = useState<GameState>(() => initial());
  const chapterRef = useRef<Chapter | null>(null);
  const endCbs = useRef<Set<(r: "victory" | "defeat") => void>>(new Set());
  const frameFns = useRef<Set<(dt: number, s: GameState) => Partial<GameState> | void>>(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  const setState = useCallback((updater: (s: GameState) => GameState) => {
    setStateRaw((s) => {
      const next = updater(s);
      stateRef.current = next;
      return next;
    });
  }, []);

  const init = useCallback((chapter: Chapter) => {
    chapterRef.current = chapter;
    setStateRaw({
      hp: chapter.playerHp,
      maxHp: chapter.playerHp,
      stamina: 100,
      maxStamina: 100,
      ammo: chapter.ammo,
      grenades: chapter.grenades,
      mines: chapter.mines,
      progress: 0,
      crouching: false,
      aiming: false,
      reloadCooldown: 0,
      meleeCooldown: 0,
      grenadeCooldown: 0,
      mineCooldown: 0,
      enemiesRemaining: chapter.enemies.reduce((a, e) => a + e.count, 0),
      alliesAlive: 2,
      message: "突围开始，注意掩体与弹药",
      messageTimer: 3,
      running: true,
      ended: null,
    });
  }, []);

  const onEnd = useCallback((cb: (r: "victory" | "defeat") => void) => {
    endCbs.current.add(cb);
    return () => endCbs.current.delete(cb);
  }, []);

  const registerFrame = useCallback(
    (fn: (dt: number, s: GameState) => Partial<GameState> | void) => {
      frameFns.current.add(fn);
      return () => frameFns.current.delete(fn);
    },
    []
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;
      if (s.running && !s.ended) {
        let patch: Partial<GameState> = {};
        frameFns.current.forEach((fn) => {
          const r = fn(dt, s);
          if (r) patch = { ...patch, ...r };
        });
        if (Object.keys(patch).length > 0) {
          setStateRaw((prev) => {
            const next = { ...prev, ...patch };
            stateRef.current = next;
            return next;
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (state.ended && state.running) {
      setStateRaw((s) => ({ ...s, running: false }));
      endCbs.current.forEach((cb) => cb(state.ended!));
    }
  }, [state.ended, state.running]);

  return { state, init, onEnd, setState, registerFrame, chapterRef };
}

function initial(): GameState {
  return {
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    ammo: 0,
    grenades: 0,
    mines: 0,
    progress: 0,
    crouching: false,
    aiming: false,
    reloadCooldown: 0,
    meleeCooldown: 0,
    grenadeCooldown: 0,
    mineCooldown: 0,
    enemiesRemaining: 0,
    alliesAlive: 0,
    message: "",
    messageTimer: 0,
    running: false,
    ended: null,
  };
}