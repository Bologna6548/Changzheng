import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Chapter } from "@/data/chapters";

interface GameScreenProps {
  chapter: Chapter;
  onExit: () => void;
  onComplete: () => void;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  dir: number;
  cooldown: number;
  type: string;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  fromPlayer: boolean;
}

interface Pickup {
  id: number;
  x: number;
  y: number;
  kind: "ammo" | "grenade";
  taken: boolean;
}

const WORLD_WIDTH = 2400;
const GROUND_Y = 300;
const PLAYER_SPEED = 3.2;
const PLAYER_MAX_HP = 100;

export function GameScreen({ chapter, onExit, onComplete }: GameScreenProps) {
  const [paused, setPaused] = useState(false);
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [ammo, setAmmo] = useState(chapter.ammo);
  const [grenades, setGrenades] = useState(chapter.grenades);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState("");

  const playerXRef = useRef(80);
  const playerYRef = useRef(GROUND_Y);
  const facingRef = useRef(1);
  const crouchRef = useRef(false);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const shotCooldownRef = useRef(0);
  const idRef = useRef(1);
  const [, forceRender] = useState(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const hpRef = useRef(PLAYER_MAX_HP);
  const statusRef = useRef<"playing" | "won" | "lost">("playing");
  const pausedRef = useRef(false);

  useEffect(() => {
    hpRef.current = hp;
  }, [hp]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const spawnEnemies = useCallback(() => {
    const arr: Enemy[] = [];
    for (let i = 0; i < chapter.enemyCount; i++) {
      arr.push({
        id: idRef.current++,
        x: 600 + i * 260 + Math.random() * 80,
        y: GROUND_Y,
        hp: chapter.enemyType === "碉堡守军" ? 3 : 2,
        dir: -1,
        cooldown: 1 + Math.random() * 2,
        type: chapter.enemyType,
      });
    }
    enemiesRef.current = arr;
  }, [chapter]);

  const spawnPickups = useCallback(() => {
    const arr: Pickup[] = [];
    for (let i = 0; i < 4; i++) {
      arr.push({
        id: idRef.current++,
        x: 400 + i * 480 + Math.random() * 100,
        y: GROUND_Y - 20,
        kind: i % 2 === 0 ? "ammo" : "grenade",
        taken: false,
      });
    }
    pickupsRef.current = arr;
  }, []);

  const reset = useCallback(() => {
    playerXRef.current = 80;
    playerYRef.current = GROUND_Y;
    facingRef.current = 1;
    crouchRef.current = false;
    bulletsRef.current = [];
    setHp(PLAYER_MAX_HP);
    hpRef.current = PLAYER_MAX_HP;
    setAmmo(chapter.ammo);
    setGrenades(chapter.grenades);
    setProgress(0);
    setStatus("playing");
    statusRef.current = "playing";
    setMessage("");
    spawnEnemies();
    spawnPickups();
  }, [chapter, spawnEnemies, spawnPickups]);

  useEffect(() => {
    spawnEnemies();
    spawnPickups();
  }, [spawnEnemies, spawnPickups]);

  const shoot = useCallback(() => {
    if (statusRef.current !== "playing" || pausedRef.current) return;
    if (shotCooldownRef.current > 0) return;
    setAmmo((a) => {
      if (a <= 0) {
        setMessage("弹药耗尽，需依靠拼刺突围");
        return a;
      }
      shotCooldownRef.current = 0.55;
      bulletsRef.current.push({
        id: idRef.current++,
        x: playerXRef.current + facingRef.current * 20,
        y: playerYRef.current - 26,
        vx: facingRef.current * 12,
        fromPlayer: true,
      });
      return a - 1;
    });
  }, []);

  const melee = useCallback(() => {
    if (statusRef.current !== "playing" || pausedRef.current) return;
    if (shotCooldownRef.current > 0) return;
    shotCooldownRef.current = 0.4;
    const px = playerXRef.current;
    enemiesRef.current.forEach((en) => {
      if (Math.abs(en.x - px) < 46) {
        en.hp -= 1;
        en.x += facingRef.current * 26;
      }
    });
  }, []);

  const throwGrenade = useCallback(() => {
    if (statusRef.current !== "playing" || pausedRef.current) return;
    setGrenades((g) => {
      if (g <= 0) {
        setMessage("手雷已用尽");
        return g;
      }
      const px = playerXRef.current;
      enemiesRef.current.forEach((en) => {
        if (Math.abs(en.x - px) < 140) en.hp -= 2;
      });
      setMessage("土制手雷爆炸，压制集群追兵");
      return g - 1;
    });
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "Escape") {
        setPaused((p) => !p);
      }
      if (e.key === " ") {
        e.preventDefault();
        shoot();
      }
      if (e.key.toLowerCase() === "f") {
        melee();
      }
      if (e.key.toLowerCase() === "g") {
        throwGrenade();
      }
      if (e.key.toLowerCase() === "s" || e.key === "Shift") {
        crouchRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
      if (e.key.toLowerCase() === "s" || e.key === "Shift") {
        crouchRef.current = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [shoot, melee, throwGrenade]);

  const update = useCallback(
    (dt: number) => {
      const keys = keysRef.current;
      const crouch = crouchRef.current;
      const speed = crouch ? PLAYER_SPEED * 0.45 : PLAYER_SPEED;

      if (keys["a"] || keys["arrowleft"]) {
        playerXRef.current = Math.max(0, playerXRef.current - speed);
        facingRef.current = -1;
      }
      if (keys["d"] || keys["arrowright"]) {
        playerXRef.current = Math.min(WORLD_WIDTH, playerXRef.current + speed);
        facingRef.current = 1;
      }

      if (shotCooldownRef.current > 0) shotCooldownRef.current -= dt;

      const px = playerXRef.current;

      bulletsRef.current.forEach((b) => {
        b.x += b.vx;
      });

      let hpDelta = 0;
      bulletsRef.current = bulletsRef.current.filter((b) => {
        if (b.x < -50 || b.x > WORLD_WIDTH + 50) return false;
        if (b.fromPlayer) {
          for (const en of enemiesRef.current) {
            if (en.hp > 0 && Math.abs(en.x - b.x) < 22) {
              en.hp -= 1;
              en.x += 12;
              return false;
            }
          }
        } else {
          if (Math.abs(px - b.x) < 20 && !crouch) {
            hpDelta -= 8;
            return false;
          }
        }
        return true;
      });

      enemiesRef.current.forEach((en) => {
        if (en.hp <= 0) return;
        const dist = px - en.x;
        if (Math.abs(dist) > 220) {
          en.x += Math.sign(dist) * 1.1 * dt * 60 * 0.02;
        }
        en.cooldown -= dt;
        if (en.cooldown <= 0 && Math.abs(dist) < 420) {
          en.cooldown = 1.6 + Math.random() * 1.4;
          bulletsRef.current.push({
            id: idRef.current++,
            x: en.x,
            y: GROUND_Y - 26,
            vx: Math.sign(dist) * 7,
            fromPlayer: false,
          });
        }
      });

      pickupsRef.current.forEach((p) => {
        if (p.taken) return;
        if (Math.abs(p.x - px) < 26) {
          p.taken = true;
          if (p.kind === "ammo") {
            setAmmo((a) => a + 6);
            setMessage("拾取到少量子弹");
          } else {
            setGrenades((g) => g + 1);
            setMessage("拾取到一枚土制手雷");
          }
        }
      });

      if (hpDelta !== 0) {
        const next = Math.max(0, hpRef.current + hpDelta);
        hpRef.current = next;
        setHp(next);
      }

      const alive = enemiesRef.current.filter((e) => e.hp > 0).length;
      const p = Math.min(100, Math.round((px / WORLD_WIDTH) * 100));
      setProgress(p);

      if (px >= WORLD_WIDTH - 60 && alive <= 1) {
        statusRef.current = "won";
        setStatus("won");
        onComplete();
      }

      if (hpRef.current <= 0) {
        statusRef.current = "lost";
        setStatus("lost");
      }
    },
    [onComplete]
  );

  useEffect(() => {
    const loop = (t: number) => {
      const dt = lastTimeRef.current ? (t - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = t;
      if (statusRef.current === "playing" && !pausedRef.current) {
        update(dt);
      }
      forceRender((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [update]);

  const aliveEnemies = enemiesRef.current.filter((e) => e.hp > 0);

  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 px-6 py-3">
        <div className="flex items-center gap-3">
          <Badge className="bg-red-800 text-stone-50 hover:bg-red-800">
            第{chapter.id}章
          </Badge>
          <span className="font-serif text-lg font-bold">{chapter.title}</span>
          <span className="text-xs text-stone-400">{chapter.place}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-stone-300">
            体力 <span className="font-bold text-red-400">{Math.max(0, hp)}</span>
          </span>
          <span className="text-stone-300">
            子弹 <span className="font-bold text-amber-400">{ammo}</span>
          </span>
          <span className="text-stone-300">
            手雷 <span className="font-bold text-orange-400">{grenades}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
            onClick={() => setPaused(true)}
          >
            ESC 菜单
          </Button>
        </div>
      </div>

      <div className="relative mx-auto mt-4 h-80 w-full max-w-6xl overflow-hidden rounded-xl border border-stone-800 bg-gradient-to-b from-stone-800 to-stone-950">
        <div
          className="absolute inset-0"
          style={{
            transform: `translateX(${-Math.max(0, playerXRef.current - 400)}px)`,
          }}
        >
          <div
            className="absolute left-0 right-0 h-24 bg-stone-700"
            style={{ top: GROUND_Y + 20 }}
          />
          {pickupsRef.current.map((p) =>
            p.taken ? null : (
              <div
                key={p.id}
                className="absolute flex h-6 w-6 items-center justify-center rounded-full border border-amber-500 bg-amber-900 text-xs"
                style={{ left: p.x, top: p.y }}
              >
                {p.kind === "ammo" ? "弹" : "雷"}
              </div>
            )
          )}
          {enemiesRef.current.map((en) =>
            en.hp <= 0 ? null : (
              <div
                key={en.id}
                className="absolute h-16 w-8 rounded-sm border border-stone-500 bg-stone-600"
                style={{ left: en.x, top: en.y - 16 }}
              >
                <div className="mt-1 text-center text-xs text-stone-200">
                  {en.hp}
                </div>
              </div>
            )
          )}
          {bulletsRef.current.map((b) => (
            <div
              key={b.id}
              className={`absolute h-1 w-3 rounded-full ${
                b.fromPlayer ? "bg-amber-400" : "bg-red-500"
              }`}
              style={{ left: b.x, top: b.y }}
            />
          ))}
          <div
            className={`absolute w-8 rounded-sm border ${
              crouchRef.current
                ? "h-12 border-stone-400 bg-stone-500"
                : "h-20 border-red-700 bg-red-900"
            }`}
            style={{ left: playerXRef.current, top: playerYRef.current - 20 }}
          >
            <div className="mt-1 text-center text-xs text-stone-100">红军</div>
          </div>
        </div>

        <div className="absolute bottom-2 left-4 right-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full bg-red-700 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-stone-400">
            突围进度 {progress}% · 剩余敌军 {aliveEnemies.length}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-6xl px-6">
        <p className="text-sm text-stone-400">
          操作：A/D 移动 · 空格 步枪点射 · F 拼刺 · G 投掷手雷 · S/Shift 匍匐隐蔽 · ESC 菜单
        </p>
        {message && <p className="mt-2 text-sm text-amber-400">{message}</p>}
      </div>

      {paused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/85">
          <div className="w-80 rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-xl">
            <h3 className="font-serif text-xl font-bold">暂停</h3>
            <p className="mt-1 text-sm text-stone-400">{chapter.objective}</p>
            <div className="mt-5 flex flex-col gap-3">
              <Button
                className="bg-red-800 text-stone-50 hover:bg-red-900"
                onClick={() => setPaused(false)}
              >
                继续战斗
              </Button>
              <Button
                variant="outline"
                className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
                onClick={reset}
              >
                休整重来
              </Button>
              <Button
                variant="outline"
                className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
                onClick={onExit}
              >
                退回主界面
              </Button>
            </div>
          </div>
        </div>
      )}

      {status === "won" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/90">
          <div className="w-96 rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-xl">
            <Badge className="bg-red-800 text-stone-50 hover:bg-red-800">
              突围成功
            </Badge>
            <h3 className="mt-3 font-serif text-2xl font-bold">
              {chapter.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              {chapter.history}
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Button
                className="bg-red-800 text-stone-50 hover:bg-red-900"
                onClick={onExit}
              >
                返回主界面
              </Button>
              <Button
                variant="outline"
                className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
                onClick={reset}
              >
                再战一次
              </Button>
            </div>
          </div>
        </div>
      )}

      {status === "lost" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/90">
          <div className="w-96 rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-xl">
            <Badge className="bg-stone-700 text-stone-100 hover:bg-stone-700">
              体力透支
            </Badge>
            <h3 className="mt-3 font-serif text-2xl font-bold">原地休整</h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              战士体力耗尽，暂时撤离战场休整。稍作恢复，再次突围。
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Button
                className="bg-red-800 text-stone-50 hover:bg-red-900"
                onClick={reset}
              >
                休整重来
              </Button>
              <Button
                variant="outline"
                className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
                onClick={onExit}
              >
                退回主界面
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}