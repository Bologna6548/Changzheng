import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import type { Chapter } from "@/data/chapters";

interface BattleScreenProps {
  chapter: Chapter;
  onExit: () => void;
  onComplete: () => void;
}

type Phase = "playing" | "debrief" | "failed";

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  ranged: boolean;
  name: string;
  cooldown: number;
  hitFlash: number;
  retreating: boolean;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  fromPlayer: boolean;
  damage: number;
}

interface Pickup {
  id: number;
  x: number;
  y: number;
  kind: "ammo" | "grenade" | "medkit";
  taken: boolean;
}

interface Ally {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  down: boolean;
  cooldown: number;
}

const GROUND_Y = 0.78;
const PLAYER_SPEED = 2.6;
const GRAVITY = 0.55;
const JUMP_V = -11;

export function BattleScreen({ chapter, onExit, onComplete }: BattleScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [hud, setHud] = useState({
    stamina: 100,
    ammo: chapter.ammo,
    grenades: chapter.grenades,
    progress: 0,
    enemiesLeft: chapter.enemies.reduce((s, e) => s + e.count, 0),
    alliesUp: 2,
  });
  const [message, setMessage] = useState("");

  const stateRef = useRef({
    player: {
      x: 120,
      y: 0,
      vy: 0,
      onGround: true,
      facing: 1,
      stamina: 100,
      ammo: chapter.ammo,
      grenades: chapter.grenades,
      prone: false,
      aimCooldown: 0,
      meleeCooldown: 0,
      hitFlash: 0,
      hurtFlash: 0,
    },
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    pickups: [] as Pickup[],
    allies: [] as Ally[],
    camera: 0,
    worldWidth: chapter.distance,
    keys: {} as Record<string, boolean>,
    nextId: 1,
    time: 0,
    spawnTimer: 0,
    finished: false,
    failed: false,
    message: "",
    messageTimer: 0,
  });

  const initWorld = useCallback(() => {
    const s = stateRef.current;
    s.player = {
      x: 120,
      y: 0,
      vy: 0,
      onGround: true,
      facing: 1,
      stamina: 100,
      ammo: chapter.ammo,
      grenades: chapter.grenades,
      prone: false,
      aimCooldown: 0,
      meleeCooldown: 0,
      hitFlash: 0,
      hurtFlash: 0,
    };
    s.enemies = [];
    s.bullets = [];
    s.pickups = [];
    s.allies = [];
    s.camera = 0;
    s.nextId = 1;
    s.time = 0;
    s.spawnTimer = 0;
    s.finished = false;
    s.failed = false;
    s.message = "";
    s.messageTimer = 0;

    let ex = 700;
    chapter.enemies.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        s.enemies.push({
          id: s.nextId++,
          x: ex,
          y: 0,
          hp: group.hp,
          maxHp: group.hp,
          speed: group.speed,
          damage: group.damage,
          ranged: group.ranged,
          name: group.name,
          cooldown: Math.random() * 2,
          hitFlash: 0,
          retreating: false,
        });
        ex += 160 + Math.random() * 120;
      }
      ex += 300;
    });

    for (let i = 0; i < 6; i++) {
      s.pickups.push({
        id: s.nextId++,
        x: 400 + i * (chapter.distance / 7),
        y: 0,
        kind: i % 3 === 0 ? "grenade" : i % 3 === 1 ? "medkit" : "ammo",
        taken: false,
      });
    }

    for (let i = 0; i < 2; i++) {
      s.allies.push({
        id: s.nextId++,
        x: 200 + i * 90,
        y: 0,
        hp: 60,
        maxHp: 60,
        down: false,
        cooldown: 1 + i,
      });
    }
  }, [chapter]);

  useEffect(() => {
    initWorld();
    setPhase("playing");
    setHud({
      stamina: 100,
      ammo: chapter.ammo,
      grenades: chapter.grenades,
      progress: 0,
      enemiesLeft: chapter.enemies.reduce((s, e) => s + e.count, 0),
      alliesUp: 2,
    });
    setMessage("");
  }, [chapter, initWorld]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = true;
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 2);
      last = now;
      update(dt);
      render(ctx, canvas);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [chapter]);

  const update = (dt: number) => {
    const s = stateRef.current;
    if (s.finished || s.failed) return;
    s.time += dt;
    const p = s.player;
    const keys = s.keys;

    if (p.aimCooldown > 0) p.aimCooldown -= dt;
    if (p.meleeCooldown > 0) p.meleeCooldown -= dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;
    if (s.messageTimer > 0) {
      s.messageTimer -= dt;
      if (s.messageTimer <= 0) s.message = "";
    }

    const staminaFactor = p.stamina < 30 ? 0.55 : p.stamina < 60 ? 0.8 : 1;

    const moveLeft = keys["a"] || keys["arrowleft"];
    const moveRight = keys["d"] || keys["arrowright"];
    const wantProne = keys["s"] || keys["arrowdown"];
    p.prone = wantProne && p.onGround;

    let vx = 0;
    if (moveLeft) vx -= PLAYER_SPEED * staminaFactor;
    if (moveRight) vx += PLAYER_SPEED * staminaFactor;
    if (p.prone) vx *= 0.4;
    if (vx !== 0) p.facing = vx > 0 ? 1 : -1;
    p.x += vx * dt;

    if ((keys["w"] || keys["arrowup"]) && p.onGround && !p.prone) {
      p.vy = JUMP_V;
      p.onGround = false;
      p.stamina -= 3;
    }
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y >= 0) {
      p.y = 0;
      p.vy = 0;
      p.onGround = true;
    }

    if (vx !== 0) p.stamina -= 0.045 * dt;
    if (chapter.weather === "snow") p.stamina -= 0.05 * dt;
    if (chapter.weather === "swamp") p.stamina -= 0.06 * dt;
    if (chapter.weather === "rain") p.stamina -= 0.02 * dt;
    p.stamina = Math.max(0, Math.min(100, p.stamina));

    if (p.stamina <= 0) {
      s.failed = true;
      setPhase("failed");
      return;
    }

    p.x = Math.max(60, Math.min(s.worldWidth - 60, p.x));

    if (keys["j"] && p.aimCooldown <= 0 && p.ammo > 0) {
      p.aimCooldown = 42;
      p.ammo -= 1;
      s.bullets.push({
        id: s.nextId++,
        x: p.x + p.facing * 26,
        y: p.y - 34,
        vx: p.facing * 16,
        fromPlayer: true,
        damage: 22,
      });
      p.hitFlash = 4;
    }

    if (keys["k"] && p.meleeCooldown <= 0) {
      p.meleeCooldown = 34;
      p.hitFlash = 6;
      s.enemies.forEach((e) => {
        if (Math.abs(e.x - p.x) < 52 && !e.retreating) {
          e.hp -= 26;
          e.hitFlash = 6;
          e.x += p.facing * 14;
        }
      });
    }

    if (keys["l"] && p.grenades > 0) {
      p.grenades -= 1;
      const gx = p.x + p.facing * 40;
      s.enemies.forEach((e) => {
        if (Math.abs(e.x - gx) < 130 && !e.retreating) {
          e.hp -= 55;
          e.hitFlash = 8;
        }
      });
      s.message = "投掷土制手雷";
      s.messageTimer = 40;
    }

    s.enemies.forEach((e) => {
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.retreating) {
        e.x -= 1.2 * dt;
        return;
      }
      if (e.hp <= 0) {
        e.retreating = true;
        return;
      }
      const dist = p.x - e.x;
      const absDist = Math.abs(dist);
      if (e.speed > 0) {
        if (absDist > 70) {
          e.x += Math.sign(dist) * e.speed * 1.1 * dt;
        } else if (absDist < 40 && !e.ranged) {
          e.x += Math.sign(dist) * e.speed * 0.5 * dt;
        }
      }
      e.cooldown -= dt;
      if (e.cooldown <= 0 && absDist < 420) {
        if (e.ranged) {
          e.cooldown = 90 + Math.random() * 40;
          const aim = p.prone ? 0.35 : 0.85;
          if (Math.random() < aim) {
            s.bullets.push({
              id: s.nextId++,
              x: e.x + Math.sign(dist) * 20,
              y: -34,
              vx: Math.sign(dist) * 9,
              fromPlayer: false,
              damage: e.damage,
            });
          }
        } else {
          e.cooldown = 70;
          if (absDist < 55) {
            p.stamina -= e.damage * 0.6;
            p.hurtFlash = 8;
          }
        }
      }
    });

    s.bullets.forEach((b) => {
      b.x += b.vx * dt;
      if (b.fromPlayer) {
        s.enemies.forEach((e) => {
          if (!e.retreating && Math.abs(e.x - b.x) < 26 && Math.abs(-34 - b.y) < 40) {
            e.hp -= b.damage;
            e.hitFlash = 5;
            b.x = -9999;
          }
        });
      } else {
        if (Math.abs(p.x - b.x) < 24 && Math.abs(p.y - 34 - b.y) < 44) {
          p.stamina -= b.damage;
          p.hurtFlash = 10;
          b.x = -9999;
        }
      }
    });
    s.bullets = s.bullets.filter((b) => b.x > -500 && b.x < s.worldWidth + 500);

    s.pickups.forEach((pk) => {
      if (!pk.taken && Math.abs(pk.x - p.x) < 40) {
        pk.taken = true;
        if (pk.kind === "ammo") {
          p.ammo += 8;
          s.message = "拾取子弹 +8";
        } else if (pk.kind === "grenade") {
          p.grenades += 1;
          s.message = "拾取手雷 +1";
        } else {
          p.stamina = Math.min(100, p.stamina + 25);
          s.message = "战友递来干粮，体力 +25";
        }
        s.messageTimer = 60;
      }
    });

    s.allies.forEach((a) => {
      if (a.down) return;
      if (Math.abs(p.x - a.x) < 40 && keys["h"]) {
        a.hp = a.maxHp;
        a.down = false;
        s.message = "救助战友，并肩再战";
        s.messageTimer = 60;
      }
      a.cooldown -= dt;
      if (a.cooldown <= 0) {
        const target = s.enemies.find((e) => !e.retreating && Math.abs(e.x - a.x) < 380);
        if (target) {
          a.cooldown = 110;
          s.bullets.push({
            id: s.nextId++,
            x: a.x + 20,
            y: -34,
            vx: 12,
            fromPlayer: true,
            damage: 14,
          });
        }
      }
      if (a.hp <= 0) a.down = true;
    });

    const activeEnemies = s.enemies.filter((e) => !e.retreating);
    if (activeEnemies.length === 0 && p.x > s.worldWidth - 200) {
      s.finished = true;
      setPhase("debrief");
      return;
    }

    if (p.x >= s.worldWidth - 60) {
      s.finished = true;
      setPhase("debrief");
      return;
    }

    s.camera = Math.max(0, Math.min(p.x - 400, s.worldWidth - 900));

    setHud({
      stamina: Math.round(p.stamina),
      ammo: p.ammo,
      grenades: p.grenades,
      progress: Math.round((p.x / s.worldWidth) * 100),
      enemiesLeft: activeEnemies.length,
      alliesUp: s.allies.filter((a) => !a.down).length,
    });
    setMessage(s.message);
  };

  const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const s = stateRef.current;
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;
    const gy = H * GROUND_Y;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, gy);
    skyGrad.addColorStop(0, chapter.sky);
    skyGrad.addColorStop(1, chapter.fog);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, gy);

    ctx.save();
    ctx.translate(-s.camera, 0);

    ctx.fillStyle = chapter.ground;
    ctx.fillRect(s.camera, gy, W, H - gy);

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 40; i++) {
      const bx = i * 220 + 100;
      ctx.fillRect(bx, gy - 6, 60, 6);
    }

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < 30; i++) {
      const tx = i * 300 + 200;
      ctx.beginPath();
      ctx.arc(tx, gy - 60, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(tx - 4, gy - 60, 8, 60);
    }

    if (chapter.weather === "rain") {
      ctx.strokeStyle = "rgba(200,210,220,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 120; i++) {
        const rx = (i * 137 + s.time * 8) % (W + 200) + s.camera;
        const ry = (i * 91 + s.time * 14) % gy;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 12);
        ctx.stroke();
      }
    }
    if (chapter.weather === "snow") {
      ctx.fillStyle = "rgba(240,245,250,0.7)";
      for (let i = 0; i < 80; i++) {
        const sx = (i * 173 + s.time * 2) % (W + 200) + s.camera;
        const sy = (i * 59 + s.time * 3) % gy;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    s.pickups.forEach((pk) => {
      if (pk.taken) return;
      const py = gy - 22;
      ctx.fillStyle =
        pk.kind === "ammo" ? "#c9a227" : pk.kind === "grenade" ? "#7a5a3a" : "#8a3a3a";
      ctx.fillRect(pk.x - 10, py - 10, 20, 20);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(pk.x - 10, py - 10, 20, 20);
    });

    s.allies.forEach((a) => {
      const ax = a.x;
      const ay = gy - 46;
      ctx.fillStyle = a.down ? "#5a5a5a" : "#6b6f5a";
      ctx.fillRect(ax - 12, ay, 24, 46);
      ctx.fillStyle = "#4a4f3f";
      ctx.beginPath();
      ctx.arc(ax, ay - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a2a2a";
      ctx.fillRect(ax - 10, ay - 14, 20, 5);
      if (a.down) {
        ctx.fillStyle = "#c9a227";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("H 救助", ax - 22, ay - 26);
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(ax - 16, ay - 30, 32, 4);
      ctx.fillStyle = "#6b8f4a";
      ctx.fillRect(ax - 16, ay - 30, 32 * (a.hp / a.maxHp), 4);
    });

    s.enemies.forEach((e) => {
      if (e.retreating && e.x < s.camera - 100) return;
      const ex = e.x;
      const ey = gy - 48;
      const alpha = e.retreating ? 0.4 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = e.hitFlash > 0 ? "#d8c070" : "#4a4a52";
      ctx.fillRect(ex - 13, ey, 26, 48);
      ctx.fillStyle = "#3a3a42";
      ctx.beginPath();
      ctx.arc(ex, ey - 8, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(ex - 12, ey - 16, 24, 6);
      if (!e.retreating) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(ex - 18, ey - 30, 36, 4);
        ctx.fillStyle = "#a83a3a";
        ctx.fillRect(ex - 18, ey - 30, 36 * (e.hp / e.maxHp), 4);
      }
      ctx.globalAlpha = 1;
    });

    const p = s.player;
    const px = p.x;
    const py = gy - (p.prone ? 26 : 52);
    ctx.fillStyle = p.hurtFlash > 0 ? "#d8a0a0" : "#6b6f5a";
    if (p.prone) {
      ctx.fillRect(px - 20, gy - 22, 40, 20);
    } else {
      ctx.fillRect(px - 13, py, 26, 52);
    }
    ctx.fillStyle = "#4a4f3f";
    ctx.beginPath();
    ctx.arc(px, py - 8, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a2a2a";
    ctx.fillRect(px - 11, py - 15, 22, 6);
    ctx.fillStyle = "#3a3a30";
    ctx.fillRect(px + p.facing * 12, py + 6, p.facing * 30, 4);
    if (p.hitFlash > 0) {
      ctx.fillStyle = "rgba(255,220,120,0.9)";
      ctx.beginPath();
      ctx.arc(px + p.facing * 30, py + 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    s.bullets.forEach((b) => {
      ctx.fillStyle = b.fromPlayer ? "#f0d060" : "#e08040";
      ctx.beginPath();
      ctx.arc(b.x, b.y + gy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  };

  return (
    <div className="relative min-h-screen bg-stone-900 text-stone-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-700 bg-stone-800/90 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-700"
            onClick={onExit}
          >
            返回
          </Button>
          <div>
            <h1 className="font-serif text-lg font-bold text-amber-100">
              第 {chapter.id} 章 · {chapter.title}
            </h1>
            <p className="text-xs text-stone-400">{chapter.place}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-200">
            目标：{chapter.objective}
          </Badge>
          <Badge className="border-stone-500/40 bg-stone-700/50 text-stone-300">
            敌军 {hud.enemiesLeft}
          </Badge>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block h-[58vh] w-full bg-stone-800 sm:h-[62vh]"
        />

        <div className="pointer-events-none absolute left-4 top-4 w-56 space-y-2 rounded-xl border border-stone-700/60 bg-stone-900/70 p-3 backdrop-blur-sm">
          <div>
            <div className="mb-1 flex justify-between text-xs text-stone-300">
              <span>体力</span>
              <span>{hud.stamina}</span>
            </div>
            <Progress value={hud.stamina} className="h-2 bg-stone-700" />
          </div>
          <div className="flex justify-between text-xs text-stone-300">
            <span>子弹 {hud.ammo}</span>
            <span>手雷 {hud.grenades}</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-stone-300">
              <span>突围进度</span>
              <span>{hud.progress}%</span>
            </div>
            <Progress value={hud.progress} className="h-2 bg-stone-700" />
          </div>
          <div className="text-xs text-stone-400">战友在阵 {hud.alliesUp} 人</div>
        </div>

        {message && (
          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-amber-400/40 bg-stone-900/80 px-4 py-1 text-sm text-amber-200">
            {message}
          </div>
        )}

        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-stone-700/60 bg-stone-900/70 px-4 py-2 text-center text-xs text-stone-300 backdrop-blur-sm">
          A/D 移动 · W 跳跃 · S 匍匐 · J 步枪点射 · K 拼刺 · L 手雷 · H 救助战友
        </div>
      </div>

      {phase === "failed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4">
          <Card className="w-full max-w-md border-stone-700 bg-stone-800 text-stone-100">
            <CardContent className="p-6 text-center">
              <h2 className="font-serif text-2xl font-bold text-amber-100">体力透支</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-300">
                战士力竭倒地，突围受阻。原地休整，重整旗鼓再战。
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  className="bg-red-800 text-amber-50 hover:bg-red-900"
                  onClick={() => {
                    initWorld();
                    setPhase("playing");
                  }}
                >
                  休整重试
                </Button>
                <Button
                  variant="outline"
                  className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-700"
                  onClick={onExit}
                >
                  返回关卡
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "debrief" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4">
          <Card className="w-full max-w-lg border-stone-700 bg-stone-800 text-stone-100">
            <CardContent className="p-6">
              <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-200">
                突围成功
              </Badge>
              <h2 className="mt-3 font-serif text-2xl font-bold text-amber-100">
                第 {chapter.id} 章 · {chapter.title}
              </h2>
              <p className="mt-1 text-xs text-stone-400">
                {chapter.date} · {chapter.place}
              </p>
              <div className="mt-4 rounded-lg border border-stone-700 bg-stone-900/60 p-4">
                <h3 className="text-sm font-semibold text-amber-200">史实讲解</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-300">
                  {chapter.history}
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-700"
                  onClick={onExit}
                >
                  返回关卡
                </Button>
                <Button
                  className="bg-red-800 text-amber-50 hover:bg-red-900"
                  onClick={onComplete}
                >
                  继续前进
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}