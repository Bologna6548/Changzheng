import { useEffect, useRef, useState } from "react";
import type { Chapter } from "@/data/chapters";
import type { EngineApi } from "@/game/useBattleEngine";

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: "pursuer" | "bunker" | "militia";
  ranged: boolean;
  damage: number;
  speed: number;
  cooldown: number;
  hitFlash: number;
  facing: number;
  dead: boolean;
  stagger: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  damage: number;
  life: number;
}

interface Pickup {
  x: number;
  y: number;
  kind: "ammo" | "grenade" | "mine" | "med";
  taken: boolean;
}

interface Ally {
  x: number;
  y: number;
  hp: number;
  cooldown: number;
  down: boolean;
  facing: number;
  walkPhase: number;
  shootT: number;
  shootFired: boolean;
  boltT: number;
  thrustT: number;
  thrustHit: boolean;
  recoil: number;
}

interface Mine {
  x: number;
  y: number;
  armT: number;
  life: number;
  exploded: boolean;
}

interface Grenade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuse: number;
  spin: number;
  exploded: boolean;
  thrower: "player" | "ally";
}

type ObstacleKind =
  | "tree"
  | "rock"
  | "sandbag"
  | "barbedwire"
  | "banner"
  | "snowpile"
  | "reed"
  | "trench"
  | "bridgepost"
  | "loesscliff";

interface Obstacle {
  x: number;
  y: number;
  kind: ObstacleKind;
  w: number;
  h: number;
  solid: boolean;
  label?: string;
}

const WORLD_W = 3600;
const GROUND_Y = 360;
const VIEW_W = 900;
const VIEW_H = 480;
const MAX_SOLID_H = 78;

const THRUST_WINDUP = 0.12;
const THRUST_ACTIVE = 0.1;
const THRUST_RECOVER = 0.28;
const THRUST_TOTAL = THRUST_WINDUP + THRUST_ACTIVE + THRUST_RECOVER;
const THRUST_REACH = 78;

const AIM_TIME = 0.22;
const FIRE_TIME = 0.05;
const BOLT_TIME = 0.42;
const SHOOT_TOTAL = AIM_TIME + FIRE_TIME + BOLT_TIME;

const MINE_ARM_TIME = 0.6;
const MINE_LIFE = 14;
const MINE_TRIGGER_R = 46;
const MINE_BLAST_R = 120;
const MINE_DAMAGE = 60;

const GRENADE_FUSE = 1.6;
const GRENADE_BLAST_R = 130;
const GRENADE_DAMAGE = 55;
const GRENADE_GRAVITY = 900;

function makeAlly(x: number): Ally {
  return {
    x,
    y: GROUND_Y,
    hp: 60,
    cooldown: 0,
    down: false,
    facing: 1,
    walkPhase: 0,
    shootT: -1,
    shootFired: false,
    boltT: -1,
    thrustT: -1,
    thrustHit: false,
    recoil: 0,
  };
}

export default function BattleCanvas({
  engine,
  chapter,
  onExit,
}: {
  engine: EngineApi;
  chapter: Chapter;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onExitRef = useRef<() => void>(() => {});
  onExitRef.current = onExit;
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const worldRef = useRef({
    player: {
      x: 80,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      onGround: true,
      facing: 1,
      hitFlash: 0,
      walkPhase: 0,
      thrustT: -1,
      thrustHit: false,
      recoil: 0,
      shootT: -1,
      shootFired: false,
      boltT: -1,
      throwT: -1,
    },
    enemies: [] as Entity[],
    bullets: [] as Bullet[],
    pickups: [] as Pickup[],
    allies: [] as Ally[],
    obstacles: [] as Obstacle[],
    mines: [] as Mine[],
    grenades: [] as Grenade[],
    camX: 0,
    keys: {} as Record<string, boolean>,
    time: 0,
    spawnTimer: 0,
    spawnQueue: [] as Entity[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }[],
    shake: 0,
    hitStop: 0,
  });

  useEffect(() => {
    const w = worldRef.current;
    w.player = {
      x: 80,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      onGround: true,
      facing: 1,
      hitFlash: 0,
      walkPhase: 0,
      thrustT: -1,
      thrustHit: false,
      recoil: 0,
      shootT: -1,
      shootFired: false,
      boltT: -1,
      throwT: -1,
    };
    w.bullets = [];
    w.pickups = [];
    w.particles = [];
    w.mines = [];
    w.grenades = [];
    w.camX = 0;
    w.time = 0;
    w.spawnTimer = 1.2;
    w.shake = 0;
    w.hitStop = 0;
    w.allies = [makeAlly(140), makeAlly(200)];

    const queue: Entity[] = [];
    let spawnX = 900;
    chapter.enemies.forEach((spec) => {
      for (let i = 0; i < spec.count; i++) {
        queue.push({
          x: spawnX,
          y: GROUND_Y,
          vx: 0,
          vy: 0,
          hp: spec.hp,
          maxHp: spec.hp,
          type: spec.type,
          ranged: spec.ranged,
          damage: spec.damage,
          speed: spec.speed,
          cooldown: Math.random() * 2,
          hitFlash: 0,
          facing: -1,
          dead: false,
          stagger: 0,
        });
        spawnX += 220 + Math.random() * 140;
      }
    });
    w.spawnQueue = queue;
    w.enemies = [];

    const pickups: Pickup[] = [];
    for (let i = 0; i < 8; i++) {
      pickups.push({
        x: 500 + i * 400 + Math.random() * 200,
        y: GROUND_Y - 20,
        kind: i % 4 === 0 ? "grenade" : i % 4 === 1 ? "ammo" : i % 4 === 2 ? "mine" : "med",
        taken: false,
      });
    }
    w.pickups = pickups;

    w.obstacles = buildObstacles(chapter);
  }, [chapter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const key = e.key.toLowerCase();
      if (down && key === "escape") {
        e.preventDefault();
        setPaused((prev) => !prev);
        return;
      }
      if (pausedRef.current) return;
      worldRef.current.keys[key] = down;
      if (down && ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  useEffect(() => {
    const unregister = engine.registerFrame((rawDt, s) => {
      const w = worldRef.current;
      const p = w.player;
      const keys = w.keys;

      if (pausedRef.current) {
        return {
          stamina: s.stamina,
          ammo: s.ammo,
          grenades: s.grenades,
          mines: s.mines,
          reloadCooldown: s.reloadCooldown,
          meleeCooldown: s.meleeCooldown,
          grenadeCooldown: s.grenadeCooldown,
          mineCooldown: s.mineCooldown,
          crouching: s.crouching,
          progress: s.progress,
          enemiesRemaining: s.enemiesRemaining,
          messageTimer: s.messageTimer,
          ended: null,
        };
      }

      let dt = rawDt;
      if (w.hitStop > 0) {
        w.hitStop -= rawDt;
        dt = rawDt * 0.15;
      }

      w.time += dt;
      if (w.shake > 0) w.shake = Math.max(0, w.shake - rawDt * 3);
      if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - rawDt * 6);

      const crouch = !!keys["s"];
      const speedMul = s.stamina < 30 ? 0.65 : 1;
      const moveSpeed = (crouch ? 90 : 190) * speedMul;
      let vx = 0;
      if (keys["a"] || keys["arrowleft"]) vx -= moveSpeed;
      if (keys["d"] || keys["arrowright"]) vx += moveSpeed;
      if (vx !== 0) {
        p.facing = vx > 0 ? 1 : -1;
        p.walkPhase += dt * 9;
      } else {
        p.walkPhase = 0;
      }
      p.vx = vx;
      if ((keys["w"] || keys["arrowup"]) && p.onGround && !crouch) {
        p.vy = -480;
        p.onGround = false;
      }
      p.vy += 1300 * dt;
      const prevX = p.x;
      const prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y >= GROUND_Y) {
        p.y = GROUND_Y;
        p.vy = 0;
        p.onGround = true;
      }
      p.x = Math.max(20, Math.min(WORLD_W - 40, p.x));

      w.obstacles.forEach((o) => {
        if (!o.solid) return;
        const top = o.y - o.h;
        const bottom = o.y;
        const left = o.x - o.w / 2;
        const right = o.x + o.w / 2;
        const pLeft = p.x - 12;
        const pRight = p.x + 12;
        const pBottom = p.y;
        const pTop = p.y - 56;
        const overlapY = pBottom > top && pTop < bottom;
        if (overlapY && pRight > left && pLeft < right) {
          if (prevY <= top + 4) return;
          if (prevX <= left) p.x = left - 12;
          else if (prevX >= right) p.x = right + 12;
          else p.x = prevX;
        }
      });

      if (p.hitFlash > 0) p.hitFlash -= rawDt;

      let stamina = s.stamina;
      const drain = chapter.staminaDrain * (vx !== 0 ? 1.3 : 0.5) * (crouch ? 0.4 : 1);
      stamina -= drain * dt;
      if (stamina < 0) stamina = 0;

      w.spawnTimer -= dt;
      if (w.spawnTimer <= 0 && w.spawnQueue.length > 0) {
        const e = w.spawnQueue.shift()!;
        w.enemies.push(e);
        w.spawnTimer = 1.4;
      }

      w.pickups.forEach((pk) => {
        if (!pk.taken && Math.abs(pk.x - p.x) < 30 && Math.abs(pk.y - p.y) < 60) {
          pk.taken = true;
          if (pk.kind === "ammo") {
            engine.setState((st) => ({ ...st, ammo: st.ammo + 6, message: "拾取子弹 +6", messageTimer: 1.5 }));
          } else if (pk.kind === "grenade") {
            engine.setState((st) => ({ ...st, grenades: st.grenades + 1, message: "拾取土制手雷 +1", messageTimer: 1.5 }));
          } else if (pk.kind === "mine") {
            engine.setState((st) => ({ ...st, mines: st.mines + 1, message: "拾取土制地雷 +1", messageTimer: 1.5 }));
          } else {
            engine.setState((st) => ({ ...st, hp: Math.min(st.maxHp, st.hp + 15), message: "战友救护，体力 +15", messageTimer: 1.5 }));
          }
        }
      });

      let ammo = s.ammo;
      let reloadCd = Math.max(0, s.reloadCooldown - rawDt);
      let meleeCd = Math.max(0, s.meleeCooldown - rawDt);
      let grenadeCd = Math.max(0, s.grenadeCooldown - rawDt);
      let mineCd = Math.max(0, s.mineCooldown - rawDt);
      let grenades = s.grenades;
      let mines = s.mines;

      if (keys["k"] && meleeCd <= 0 && p.thrustT < 0) {
        p.thrustT = 0;
        p.thrustHit = false;
        meleeCd = THRUST_TOTAL + 0.05;
      }

      if (p.thrustT >= 0) {
        p.thrustT += rawDt;
        const inActive = p.thrustT >= THRUST_WINDUP && p.thrustT < THRUST_WINDUP + THRUST_ACTIVE;
        if (inActive && !p.thrustHit) {
          p.thrustHit = true;
          const tipX = p.x + p.facing * THRUST_REACH;
          let connected = false;
          w.enemies.forEach((e) => {
            if (e.dead) return;
            const dx = (e.x - p.x) * p.facing;
            if (dx > 0 && dx < THRUST_REACH && Math.abs(e.y - p.y) < 60) {
              connected = true;
              e.hp -= 34;
              e.hitFlash = 0.22;
              e.stagger = 0.45;
              e.x += p.facing * 26;
              if (e.hp <= 0) e.dead = true;
            }
          });
          if (connected) {
            w.hitStop = 0.07;
            w.shake = 0.22;
            p.recoil = 1;
            for (let i = 0; i < 10; i++) {
              w.particles.push({
                x: tipX,
                y: p.y - 32 + (Math.random() - 0.5) * 20,
                vx: p.facing * (40 + Math.random() * 120),
                vy: (Math.random() - 0.5) * 90,
                life: 0.3,
                max: 0.3,
                color: i % 3 === 0 ? "#f5f5f4" : "#a8a29e",
                size: 2 + Math.random() * 2,
              });
            }
          } else {
            w.shake = 0.05;
          }
        }
        if (p.thrustT >= THRUST_TOTAL) {
          p.thrustT = -1;
        }
      }

      if (keys["j"] && reloadCd <= 0 && ammo > 0 && p.shootT < 0) {
        p.shootT = 0;
        p.shootFired = false;
        p.boltT = -1;
      }

      if (p.shootT >= 0) {
        p.shootT += rawDt;
        const fireAt = AIM_TIME;
        if (!p.shootFired && p.shootT >= fireAt) {
          p.shootFired = true;
          ammo -= 1;
          const bx = p.x + p.facing * 30;
          const by = p.y - 36;
          w.bullets.push({ x: bx, y: by, vx: p.facing * 640, vy: -6, fromPlayer: true, damage: 18, life: 1.4 });
          p.recoil = 1;
          w.shake = 0.22;
          w.hitStop = 0.03;
          for (let i = 0; i < 12; i++) {
            w.particles.push({
              x: bx + p.facing * 6,
              y: by,
              vx: p.facing * (60 + Math.random() * 160),
              vy: (Math.random() - 0.5) * 50 - 10,
              life: 0.5,
              max: 0.5,
              color: i % 4 === 0 ? "#fde68a" : i % 3 === 0 ? "#d6d3d1" : "#a8a29e",
              size: 2 + Math.random() * 3,
            });
          }
          w.particles.push({
            x: bx - p.facing * 4,
            y: by - 4,
            vx: -p.facing * (40 + Math.random() * 40),
            vy: -140 - Math.random() * 60,
            life: 0.9,
            max: 0.9,
            color: "#b45309",
            size: 3,
          });
        }
        if (p.shootT >= AIM_TIME + FIRE_TIME) {
          p.boltT = p.shootT - (AIM_TIME + FIRE_TIME);
        }
        if (p.shootT >= SHOOT_TOTAL) {
          p.shootT = -1;
          p.boltT = -1;
          reloadCd = 0.35;
        }
      }

      if (keys["l"] && grenadeCd <= 0 && grenades > 0 && p.throwT < 0) {
        grenades -= 1;
        grenadeCd = 2.8;
        p.throwT = 0;
        const gx = p.x + p.facing * 26;
        const gy = p.y - 48;
        w.grenades.push({
          x: gx,
          y: gy,
          vx: p.facing * 340,
          vy: -300,
          fuse: GRENADE_FUSE,
          spin: 0,
          exploded: false,
          thrower: "player",
        });
        engine.setState((st) => ({ ...st, message: "投出土制手雷，注意爆炸范围", messageTimer: 1.6 }));
      }

      if (p.throwT >= 0) {
        p.throwT += rawDt;
        if (p.throwT > 0.35) p.throwT = -1;
      }

      if (keys["u"] && mineCd <= 0 && mines > 0) {
        mines -= 1;
        mineCd = 1.2;
        w.mines.push({
          x: p.x + p.facing * 34,
          y: GROUND_Y,
          armT: MINE_ARM_TIME,
          life: MINE_LIFE,
          exploded: false,
        });
        engine.setState((st) => ({ ...st, message: "埋设土制地雷，等待敌军踏入", messageTimer: 1.6 }));
      }

      w.mines.forEach((m) => {
        if (m.exploded) return;
        if (m.armT > 0) m.armT -= dt;
        m.life -= dt;
        if (m.armT <= 0) {
          const triggered = w.enemies.some(
            (e) => !e.dead && Math.abs(e.x - m.x) < MINE_TRIGGER_R && Math.abs(e.y - m.y) < 70
          );
          if (triggered) {
            m.exploded = true;
            w.enemies.forEach((e) => {
              if (!e.dead && Math.abs(e.x - m.x) < MINE_BLAST_R) {
                e.hp -= MINE_DAMAGE;
                e.hitFlash = 0.35;
                e.stagger = 0.5;
                e.x += Math.sign(e.x - m.x || 1) * 30;
                if (e.hp <= 0) e.dead = true;
              }
            });
            w.shake = 0.5;
            w.hitStop = 0.08;
            for (let i = 0; i < 26; i++) {
              w.particles.push({
                x: m.x + (Math.random() - 0.5) * 30,
                y: GROUND_Y - 10 - Math.random() * 30,
                vx: (Math.random() - 0.5) * 320,
                vy: -Math.random() * 260,
                life: 0.8,
                max: 0.8,
                color: i % 3 === 0 ? "#78350f" : i % 3 === 1 ? "#a16207" : "#57534e",
                size: 3 + Math.random() * 3,
              });
            }
          }
        }
      });
      w.mines = w.mines.filter((m) => !m.exploded && m.life > 0);

      w.grenades.forEach((g) => {
        if (g.exploded) return;
        g.vy += GRENADE_GRAVITY * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.spin += dt * 12;
        g.fuse -= dt;

        if (g.y >= GROUND_Y - 6) {
          g.y = GROUND_Y - 6;
          g.vy = -g.vy * 0.35;
          g.vx *= 0.6;
          if (Math.abs(g.vy) < 40) g.vy = 0;
        }

        if (g.fuse <= 0) {
          g.exploded = true;
          w.enemies.forEach((e) => {
            if (!e.dead && Math.abs(e.x - g.x) < GRENADE_BLAST_R) {
              const falloff = 1 - Math.abs(e.x - g.x) / GRENADE_BLAST_R;
              e.hp -= GRENADE_DAMAGE * (0.5 + falloff * 0.5);
              e.hitFlash = 0.35;
              e.stagger = 0.5;
              e.x += Math.sign(e.x - g.x || 1) * 34;
              if (e.hp <= 0) e.dead = true;
            }
          });
          if (Math.abs(p.x - g.x) < GRENADE_BLAST_R * 0.7) {
            const falloff = 1 - Math.abs(p.x - g.x) / (GRENADE_BLAST_R * 0.7);
            engine.setState((st) => ({ ...st, hp: Math.max(0, st.hp - 14 * falloff) }));
            p.hitFlash = 0.3;
          }
          w.shake = 0.55;
          w.hitStop = 0.09;
          for (let i = 0; i < 34; i++) {
            w.particles.push({
              x: g.x + (Math.random() - 0.5) * 40,
              y: g.y - Math.random() * 40,
              vx: (Math.random() - 0.5) * 380,
              vy: -Math.random() * 300,
              life: 0.85,
              max: 0.85,
              color: i % 4 === 0 ? "#fde68a" : i % 4 === 1 ? "#78350f" : i % 4 === 2 ? "#a16207" : "#57534e",
              size: 3 + Math.random() * 4,
            });
          }
        }
      });
      w.grenades = w.grenades.filter((g) => !g.exploded);

      w.bullets.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 60 * dt;
        b.life -= dt;
        for (const o of w.obstacles) {
          if (!o.solid) continue;
          const top = o.y - o.h;
          const left = o.x - o.w / 2;
          const right = o.x + o.w / 2;
          if (b.x > left && b.x < right && b.y > top && b.y < o.y) {
            b.life = 0;
            for (let i = 0; i < 5; i++) {
              w.particles.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 120,
                vy: -Math.random() * 80,
                life: 0.3,
                max: 0.3,
                color: "#a8a29e",
                size: 2,
              });
            }
            break;
          }
        }
        if (b.fromPlayer) {
          w.enemies.forEach((e) => {
            if (!e.dead && Math.abs(e.x - b.x) < 20 && Math.abs(e.y - 30 - b.y) < 40) {
              e.hp -= b.damage;
              e.hitFlash = 0.15;
              e.stagger = 0.2;
              if (e.hp <= 0) e.dead = true;
              b.life = 0;
            }
          });
        } else {
          if (Math.abs(p.x - b.x) < 18 && Math.abs(p.y - 30 - b.y) < 40) {
            const dmg = b.damage * (crouch ? 0.5 : 1);
            engine.setState((st) => ({ ...st, hp: Math.max(0, st.hp - dmg) }));
            p.hitFlash = 0.3;
            b.life = 0;
            w.shake = 0.18;
          }
        }
      });
      w.bullets = w.bullets.filter((b) => b.life > 0 && b.x > -50 && b.x < WORLD_W + 50);

      w.enemies.forEach((e) => {
        if (e.dead) return;
        if (e.hitFlash > 0) e.hitFlash -= rawDt;
        if (e.stagger > 0) {
          e.stagger -= rawDt;
          return;
        }
        const dist = p.x - e.x;
        const absDist = Math.abs(dist);
        e.facing = dist > 0 ? 1 : -1;
        if (e.type === "bunker") {
          e.cooldown -= dt;
          if (e.cooldown <= 0 && absDist < 500 && !crouch) {
            e.cooldown = 1.9;
            w.bullets.push({
              x: e.x + e.facing * 20,
              y: e.y - 34,
              vx: e.facing * 520,
              vy: 0,
              fromPlayer: false,
              damage: e.damage,
              life: 1.6,
            });
          }
        } else {
          if (absDist > 60) e.x += Math.sign(dist) * e.speed * 70 * dt;
          e.cooldown -= dt;
          if (e.ranged && e.cooldown <= 0 && absDist < 420) {
            e.cooldown = 2.0 + Math.random() * 0.8;
            w.bullets.push({
              x: e.x + e.facing * 18,
              y: e.y - 32,
              vx: e.facing * 480,
              vy: 0,
              fromPlayer: false,
              damage: e.damage,
              life: 1.6,
            });
          } else if (!e.ranged && absDist < 40 && e.cooldown <= 0) {
            e.cooldown = 1.3;
            engine.setState((st) => ({ ...st, hp: Math.max(0, st.hp - e.damage) }));
            p.hitFlash = 0.3;
          }
        }
      });
      w.enemies = w.enemies.filter((e) => !e.dead);

      w.allies.forEach((a) => {
        if (a.down) return;
        if (a.recoil > 0) a.recoil = Math.max(0, a.recoil - rawDt * 6);

        const nearest = w.enemies.find((e) => !e.dead && Math.abs(e.x - a.x) < 420);
        if (nearest) a.facing = nearest.x > a.x ? 1 : -1;

        if (Math.abs(a.x - p.x) > 110) {
          const dir = p.x > a.x ? 1 : -1;
          a.x += dir * 70 * dt;
          a.walkPhase += dt * 9;
        } else {
          a.walkPhase = 0;
        }

        if (a.thrustT >= 0) {
          a.thrustT += rawDt;
          const inActive = a.thrustT >= THRUST_WINDUP && a.thrustT < THRUST_WINDUP + THRUST_ACTIVE;
          if (inActive && !a.thrustHit) {
            a.thrustHit = true;
            const tipX = a.x + a.facing * THRUST_REACH;
            let connected = false;
            w.enemies.forEach((e) => {
              if (e.dead) return;
              const dx = (e.x - a.x) * a.facing;
              if (dx > 0 && dx < THRUST_REACH && Math.abs(e.y - a.y) < 60) {
                connected = true;
                e.hp -= 26;
                e.hitFlash = 0.22;
                e.stagger = 0.4;
                e.x += a.facing * 22;
                if (e.hp <= 0) e.dead = true;
              }
            });
            if (connected) {
              w.hitStop = 0.05;
              w.shake = 0.16;
              a.recoil = 1;
              for (let i = 0; i < 8; i++) {
                w.particles.push({
                  x: tipX,
                  y: a.y - 32 + (Math.random() - 0.5) * 20,
                  vx: a.facing * (40 + Math.random() * 100),
                  vy: (Math.random() - 0.5) * 80,
                  life: 0.3,
                  max: 0.3,
                  color: i % 3 === 0 ? "#f5f5f4" : "#a8a29e",
                  size: 2 + Math.random() * 2,
                });
              }
            }
          }
          if (a.thrustT >= THRUST_TOTAL) a.thrustT = -1;
        }

        if (a.shootT >= 0) {
          a.shootT += rawDt;
          if (!a.shootFired && a.shootT >= AIM_TIME) {
            a.shootFired = true;
            const bx = a.x + a.facing * 30;
            const by = a.y - 36;
            w.bullets.push({ x: bx, y: by, vx: a.facing * 620, vy: -6, fromPlayer: true, damage: 12, life: 1.4 });
            a.recoil = 1;
            w.shake = 0.14;
            for (let i = 0; i < 9; i++) {
              w.particles.push({
                x: bx + a.facing * 6,
                y: by,
                vx: a.facing * (60 + Math.random() * 140),
                vy: (Math.random() - 0.5) * 50 - 10,
                life: 0.45,
                max: 0.45,
                color: i % 4 === 0 ? "#fde68a" : i % 3 === 0 ? "#d6d3d1" : "#a8a29e",
                size: 2 + Math.random() * 3,
              });
            }
            w.particles.push({
              x: bx - a.facing * 4,
              y: by - 4,
              vx: -a.facing * (40 + Math.random() * 40),
              vy: -140 - Math.random() * 60,
              life: 0.9,
              max: 0.9,
              color: "#b45309",
              size: 3,
            });
          }
          if (a.shootT >= AIM_TIME + FIRE_TIME) {
            a.boltT = a.shootT - (AIM_TIME + FIRE_TIME);
          }
          if (a.shootT >= SHOOT_TOTAL) {
            a.shootT = -1;
            a.boltT = -1;
            a.cooldown = 1.6 + Math.random() * 1.2;
          }
        }

        if (nearest && a.shootT < 0 && a.thrustT < 0) {
          const d = Math.abs(nearest.x - a.x);
          if (d < 70) {
            a.thrustT = 0;
            a.thrustHit = false;
          } else if (d < 420 && a.cooldown <= 0) {
            a.shootT = 0;
            a.shootFired = false;
            a.boltT = -1;
          }
        }
        if (a.cooldown > 0) a.cooldown -= dt;
      });

      w.particles.forEach((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 380 * dt;
        pt.life -= rawDt;
      });
      w.particles = w.particles.filter((pt) => pt.life > 0);

      const targetCam = Math.max(0, Math.min(WORLD_W - VIEW_W, p.x - VIEW_W / 2));
      w.camX += (targetCam - w.camX) * Math.min(1, dt * 5);

      const progress = Math.min(100, (p.x / (WORLD_W - 200)) * 100);

      let ended: "victory" | "defeat" | null = null;
      if (s.hp <= 0) ended = "defeat";
      if (progress >= 100 && w.spawnQueue.length === 0 && w.enemies.length === 0) ended = "victory";

      return {
        stamina,
        ammo,
        grenades,
        mines,
        reloadCooldown: reloadCd,
        meleeCooldown: meleeCd,
        grenadeCooldown: grenadeCd,
        mineCooldown: mineCd,
        crouching: crouch,
        progress,
        enemiesRemaining: w.enemies.length + w.spawnQueue.length,
        messageTimer: Math.max(0, s.messageTimer - dt),
        ended,
      };
    });
    return unregister;
  }, [engine, chapter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const render = () => {
      const w = worldRef.current;
      const s = engine.state;
      const shakeX = w.shake > 0 ? (Math.random() - 0.5) * w.shake * 18 : 0;
      const shakeY = w.shake > 0 ? (Math.random() - 0.5) * w.shake * 18 : 0;

      ctx.save();
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.translate(shakeX, shakeY);

      drawBackground(ctx, chapter, w.camX, w.time);
      ctx.save();
      ctx.translate(-w.camX, 0);

      drawGround(ctx, chapter, w.camX);

      w.obstacles.forEach((o) => {
        if (!o.solid) drawObstacle(ctx, o, w.time);
      });

      w.mines.forEach((m) => drawMine(ctx, m, w.time));

      w.pickups.forEach((pk) => {
        if (pk.taken) return;
        drawPickup(ctx, pk);
      });

      w.allies.forEach((a) => drawAlly(ctx, a));
      w.enemies.forEach((e) => drawEnemy(ctx, e));
      drawPlayer(ctx, w.player, s.crouching, s.stamina);

      w.obstacles.forEach((o) => {
        if (o.solid) drawObstacle(ctx, o, w.time);
      });

      w.grenades.forEach((g) => drawGrenade(ctx, g));

      w.bullets.forEach((b) => {
        ctx.fillStyle = b.fromPlayer ? "#fbbf24" : "#f87171";
        ctx.fillRect(b.x - 4, b.y - 1, 8, 2);
      });

      w.particles.forEach((pt) => {
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.globalAlpha = 1;
      });

      ctx.restore();

      const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 200, VIEW_W / 2, VIEW_H / 2, 600);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      ctx.restore();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [engine, chapter]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-700 bg-stone-950 shadow-lg">
      <canvas
        ref={canvasRef}
        width={VIEW_W}
        height={VIEW_H}
        className="block w-full"
        style={{ imageRendering: "auto" }}
      />
      <button
        type="button"
        onClick={() => setPaused(true)}
        className="absolute right-3 top-3 rounded-md border border-stone-600 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-200 backdrop-blur transition hover:bg-red-900/80 hover:text-white"
      >
        暂停 (Esc)
      </button>

      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm">
          <div className="w-72 rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-2xl">
            <h3 className="mb-1 text-center font-serif text-xl font-bold text-stone-100">战斗暂停</h3>
            <p className="mb-5 text-center text-xs text-stone-400">红军战士暂作休整</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="w-full rounded-md border border-red-800 bg-red-900/70 px-4 py-2.5 text-sm font-semibold text-red-50 transition hover:bg-red-800"
              >
                返回游戏
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  if (typeof onExitRef.current === "function") onExitRef.current();
                }}
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-200 transition hover:bg-stone-700"
              >
                退回到主界面
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildObstacles(chapter: Chapter): Obstacle[] {
  const list: Obstacle[] = [];
  const env = chapter.environment;
  const rng = mulberry32(chapter.id * 9973);

  list.push({ x: 120, y: GROUND_Y, kind: "banner", w: 40, h: 90, solid: false, label: "红一方面军" });

  let x = 320;
  while (x < WORLD_W - 200) {
    const r = rng();
    let kind: ObstacleKind;
    let w = 40;
    let h = 40;
    let solid = true;
    let label: string | undefined;

    if (env === "forest") {
      if (r < 0.45) {
        kind = "tree";
        w = 90;
        h = 190;
        solid = false;
      } else if (r < 0.7) {
        kind = "rock";
        w = 50;
        h = 34;
      } else if (r < 0.85) {
        kind = "barbedwire";
        w = 70;
        h = 26;
      } else {
        kind = "reed";
        w = 40;
        h = 46;
        solid = false;
      }
    } else if (env === "river") {
      if (r < 0.35) {
        kind = "sandbag";
        w = 70;
        h = 40;
      } else if (r < 0.6) {
        kind = "barbedwire";
        w = 80;
        h = 26;
      } else if (r < 0.8) {
        kind = "rock";
        w = 50;
        h = 34;
      } else {
        kind = "reed";
        w = 40;
        h = 46;
        solid = false;
      }
    } else if (env === "valley") {
      if (r < 0.4) {
        kind = "rock";
        w = 60;
        h = 44;
      } else if (r < 0.65) {
        kind = "tree";
        w = 86;
        h = 180;
        solid = false;
      } else if (r < 0.85) {
        kind = "trench";
        w = 90;
        h = 22;
      } else {
        kind = "reed";
        w = 40;
        h = 46;
        solid = false;
      }
    } else if (env === "bridge") {
      if (r < 0.5) {
        kind = "bridgepost";
        w = 26;
        h = 72;
      } else if (r < 0.8) {
        kind = "sandbag";
        w = 70;
        h = 40;
      } else {
        kind = "banner";
        w = 40;
        h = 90;
        solid = false;
        label = "夺桥突击队";
      }
    } else if (env === "snow") {
      if (r < 0.5) {
        kind = "snowpile";
        w = 70;
        h = 40;
      } else if (r < 0.8) {
        kind = "rock";
        w = 50;
        h = 34;
      } else {
        kind = "banner";
        w = 40;
        h = 90;
        solid = false;
        label = "翻越夹金山";
      }
    } else {
      if (r < 0.5) {
        kind = "loesscliff";
        w = 80;
        h = 56;
      } else if (r < 0.8) {
        kind = "rock";
        w = 50;
        h = 34;
      } else {
        kind = "banner";
        w = 40;
        h = 90;
        solid = false;
        label = "胜利会师";
      }
    }

    if (solid && h > MAX_SOLID_H) h = MAX_SOLID_H;

    list.push({ x, y: GROUND_Y, kind, w, h, solid, label });
    x += 220 + rng() * 220;
  }

  list.push({ x: WORLD_W * 0.5, y: GROUND_Y, kind: "banner", w: 40, h: 90, solid: false, label: "红军万岁" });
  list.push({ x: WORLD_W - 260, y: GROUND_Y, kind: "banner", w: 40, h: 90, solid: false, label: "北上抗日" });

  return list;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawGrenade(ctx: CanvasRenderingContext2D, g: Grenade) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.spin);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#365314";
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4d7c0f";
  ctx.beginPath();
  ctx.ellipse(-2, -2, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#a8a29e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.lineTo(4, 4);
  ctx.moveTo(-4, 4);
  ctx.lineTo(4, -4);
  ctx.stroke();

  ctx.fillStyle = "#78716c";
  ctx.fillRect(-2, -12, 4, 5);
  ctx.strokeStyle = "#d6d3d1";
  ctx.beginPath();
  ctx.arc(2, -12, 3, 0, Math.PI * 1.5);
  ctx.stroke();

  const fusePct = Math.max(0, g.fuse / GRENADE_FUSE);
  if (fusePct < 0.5) {
    const blink = Math.sin(g.fuse * 30) > 0 ? 1 : 0.3;
    ctx.fillStyle = `rgba(239,68,68,${blink})`;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMine(ctx: CanvasRenderingContext2D, m: Mine, time: number) {
  ctx.save();
  ctx.translate(m.x, m.y);
  const armed = m.armT <= 0;
  const blink = armed ? (Math.sin(time * 8) > 0 ? 1 : 0.4) : 0.7;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3f3f46";
  ctx.beginPath();
  ctx.ellipse(0, -4, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#52525b";
  ctx.beginPath();
  ctx.ellipse(0, -6, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#a8a29e";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6, -6 + Math.sin(a) * 3);
    ctx.lineTo(Math.cos(a) * 13, -6 + Math.sin(a) * 6);
    ctx.stroke();
  }

  ctx.fillStyle = armed ? `rgba(239,68,68,${blink})` : "rgba(250,204,21,0.8)";
  ctx.beginPath();
  ctx.arc(0, -10, 2.5, 0, Math.PI * 2);
  ctx.fill();

  if (!armed) {
    ctx.strokeStyle = "rgba(250,204,21,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -6, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, time: number) {
  ctx.save();
  ctx.translate(o.x, o.y);

  switch (o.kind) {
    case "tree": {
      const trunkW = 14;
      ctx.fillStyle = "#3f2d1a";
      ctx.fillRect(-trunkW / 2, -o.h, trunkW, o.h);
      ctx.fillStyle = "#2a1d10";
      ctx.fillRect(-trunkW / 2, -o.h, trunkW / 3, o.h);
      const crownY = -o.h;
      ctx.fillStyle = "#1f3a1f";
      ctx.beginPath();
      ctx.arc(0, crownY - 10, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#274a27";
      ctx.beginPath();
      ctx.arc(-22, crownY - 26, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(24, crownY - 22, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f5a2f";
      ctx.beginPath();
      ctx.arc(0, crownY - 44, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-14, crownY - 56, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(16, crownY - 52, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(120,180,120,0.18)";
      ctx.beginPath();
      ctx.arc(-10, crownY - 50, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, 40, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rock": {
      ctx.fillStyle = "#57534e";
      ctx.beginPath();
      ctx.moveTo(-o.w / 2, 0);
      ctx.lineTo(-o.w / 3, -o.h);
      ctx.lineTo(o.w / 4, -o.h - 6);
      ctx.lineTo(o.w / 2, -o.h / 3);
      ctx.lineTo(o.w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#78716c";
      ctx.beginPath();
      ctx.moveTo(-o.w / 3, -o.h);
      ctx.lineTo(o.w / 4, -o.h - 6);
      ctx.lineTo(0, -o.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, o.w / 2 + 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "sandbag": {
      const rows = 3;
      const cols = 4;
      const bw = o.w / cols;
      const bh = o.h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ox = -o.w / 2 + c * bw + (r % 2 ? bw / 2 : 0);
          const oy = -r * bh - bh;
          ctx.fillStyle = r % 2 ? "#a8a29e" : "#78716c";
          ctx.beginPath();
          ctx.ellipse(ox + bw / 2, oy + bh / 2, bw / 2 - 1, bh / 2 - 1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, o.w / 2 + 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "barbedwire": {
      ctx.strokeStyle = "#a8a29e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-o.w / 2, -o.h);
      ctx.lineTo(o.w / 2, -o.h);
      ctx.moveTo(-o.w / 2, -o.h / 2);
      ctx.lineTo(o.w / 2, -o.h / 2);
      ctx.stroke();
      ctx.fillStyle = "#3f2d1a";
      ctx.fillRect(-o.w / 2 - 2, -o.h - 6, 4, o.h + 6);
      ctx.fillRect(o.w / 2 - 2, -o.h - 6, 4, o.h + 6);
      ctx.strokeStyle = "#d6d3d1";
      ctx.lineWidth = 1;
      for (let i = -o.w / 2; i < o.w / 2; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, -o.h);
        ctx.lineTo(i + 4, -o.h - 4);
        ctx.moveTo(i, -o.h / 2);
        ctx.lineTo(i + 4, -o.h / 2 - 4);
        ctx.stroke();
      }
      break;
    }
    case "banner": {
      ctx.fillStyle = "#3f2d1a";
      ctx.fillRect(-2, -o.h, 4, o.h);
      const wave = Math.sin(time * 3 + o.x) * 3;
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.moveTo(2, -o.h + 4);
      ctx.lineTo(40, -o.h + 8 + wave);
      ctx.lineTo(40, -o.h + 40 + wave);
      ctx.lineTo(2, -o.h + 44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      drawStar(ctx, 18, -o.h + 24, 6, 3, 5);
      if (o.label) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "10px serif";
        ctx.fillText(o.label, -20, -o.h - 8);
      }
      break;
    }
    case "snowpile": {
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(-o.w / 2, 0);
      ctx.quadraticCurveTo(-o.w / 4, -o.h - 10, 0, -o.h);
      ctx.quadraticCurveTo(o.w / 4, -o.h - 10, o.w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(-o.w / 2, 0);
      ctx.quadraticCurveTo(-o.w / 4, -o.h - 10, 0, -o.h);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "reed": {
      ctx.strokeStyle = "#4d7c0f";
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        const sway = Math.sin(time * 2 + i + o.x) * 3;
        ctx.beginPath();
        ctx.moveTo(i * 6, 0);
        ctx.quadraticCurveTo(i * 6 + sway, -o.h / 2, i * 6 + sway * 2, -o.h);
        ctx.stroke();
      }
      break;
    }
    case "trench": {
      ctx.fillStyle = "#292524";
      ctx.fillRect(-o.w / 2, -o.h, o.w, o.h);
      ctx.fillStyle = "#44403c";
      ctx.fillRect(-o.w / 2, -o.h, o.w, 4);
      ctx.fillStyle = "#78716c";
      for (let i = -o.w / 2; i < o.w / 2; i += 14) {
        ctx.beginPath();
        ctx.ellipse(i + 7, -o.h - 4, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "bridgepost": {
      ctx.fillStyle = "#44403c";
      ctx.fillRect(-o.w / 2, -o.h, o.w, o.h);
      ctx.fillStyle = "#57534e";
      ctx.fillRect(-o.w / 2, -o.h, o.w, 6);
      ctx.strokeStyle = "#a8a29e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -o.h);
      ctx.lineTo(0, -o.h - 16);
      ctx.stroke();
      break;
    }
    case "loesscliff": {
      ctx.fillStyle = "#a16207";
      ctx.beginPath();
      ctx.moveTo(-o.w / 2, 0);
      ctx.lineTo(-o.w / 2 + 6, -o.h);
      ctx.lineTo(o.w / 2 - 4, -o.h + 4);
      ctx.lineTo(o.w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(-o.w / 2 + 6, -o.h, o.w - 10, 6);
      break;
    }
  }

  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBackground(ctx: CanvasRenderingContext2D, chapter: Chapter, camX: number, time: number) {
  const env = chapter.environment;
  let skyTop = "#1c1917";
  let skyBot = "#44403c";
  if (env === "forest") {
    skyTop = "#1a2e1a";
    skyBot = "#3f4a3a";
  } else if (env === "river") {
    skyTop = "#1e293b";
    skyBot = "#475569";
  } else if (env === "valley") {
    skyTop = "#292524";
    skyBot = "#57534e";
  } else if (env === "bridge") {
    skyTop = "#1c1917";
    skyBot = "#3f3f46";
  } else if (env === "snow") {
    skyTop = "#334155";
    skyBot = "#94a3b8";
  } else if (env === "loess") {
    skyTop = "#78350f";
    skyBot = "#d97706";
  }
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, skyTop);
  g.addColorStop(1, skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(-camX * 0.15, 0);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 0; i < 12; i++) {
    const bx = i * 400;
    ctx.beginPath();
    ctx.moveTo(bx, 320);
    ctx.lineTo(bx + 200, 120 + (i % 3) * 40);
    ctx.lineTo(bx + 400, 320);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-camX * 0.35, 0);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let i = 0; i < 16; i++) {
    const bx = i * 300 + 100;
    ctx.beginPath();
    ctx.moveTo(bx, 340);
    ctx.lineTo(bx + 150, 200 + (i % 2) * 50);
    ctx.lineTo(bx + 300, 340);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(120,113,108,0.08)";
  for (let i = 0; i < 3; i++) {
    const fx = ((time * 14 + i * 300) % (VIEW_W + 400)) - 200;
    ctx.fillRect(fx, 200 + i * 40, 300, 60);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, chapter: Chapter, camX: number) {
  const env = chapter.environment;
  let groundColor = "#292524";
  let topColor = "#44403c";
  if (env === "forest") {
    groundColor = "#1c2e1c";
    topColor = "#365314";
  } else if (env === "river") {
    groundColor = "#1e3a5f";
    topColor = "#334155";
  } else if (env === "snow") {
    groundColor = "#475569";
    topColor = "#e2e8f0";
  } else if (env === "loess") {
    groundColor = "#78350f";
    topColor = "#a16207";
  } else if (env === "bridge") {
    groundColor = "#1c1917";
    topColor = "#57534e";
  }
  ctx.fillStyle = groundColor;
  ctx.fillRect(0, GROUND_Y, WORLD_W, VIEW_H - GROUND_Y + 200);
  ctx.fillStyle = topColor;
  ctx.fillRect(0, GROUND_Y, WORLD_W, 8);

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  for (let i = 0; i < WORLD_W; i += 60) {
    ctx.fillRect(i, GROUND_Y + 20 + (i % 3) * 10, 30, 4);
  }
}

function drawRifle(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  gunY: number,
  thrustExt: number,
  recoilKick: number,
  boltCycle: number,
  muzzleFlash: number,
  thrustActive: boolean
) {
  const gunBaseX = baseX + thrustExt - recoilKick;
  ctx.fillStyle = "#3f2d1a";
  ctx.fillRect(gunBaseX, gunY, 26, 3);
  ctx.fillStyle = "#1c1917";
  ctx.fillRect(gunBaseX + 22, gunY - 1, 8, 5);
  ctx.fillStyle = "#d6d3d1";
  ctx.beginPath();
  ctx.moveTo(gunBaseX + 30, gunY + 1);
  ctx.lineTo(gunBaseX + 44, gunY + 1.5);
  ctx.lineTo(gunBaseX + 30, gunY + 2);
  ctx.closePath();
  ctx.fill();

  if (boltCycle > 0) {
    ctx.fillStyle = "#a8a29e";
    ctx.fillRect(gunBaseX + 20 - boltCycle * 6, gunY - 2, 5, 4);
  }

  if (muzzleFlash > 0) {
    ctx.fillStyle = "rgba(253,224,71,0.95)";
    ctx.beginPath();
    ctx.moveTo(gunBaseX + 30, gunY + 1);
    ctx.lineTo(gunBaseX + 46, gunY - 3);
    ctx.lineTo(gunBaseX + 52, gunY + 1);
    ctx.lineTo(gunBaseX + 46, gunY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(gunBaseX + 34, gunY + 1, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (thrustActive) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gunBaseX + 30, gunY + 1);
    ctx.lineTo(gunBaseX + 50, gunY + 1);
    ctx.stroke();
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: {
    x: number;
    y: number;
    facing: number;
    hitFlash: number;
    walkPhase: number;
    thrustT: number;
    recoil: number;
    shootT: number;
    boltT: number;
    throwT: number;
  },
  crouch: boolean,
  stamina: number
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing, 1);
  const h = crouch ? 34 : 56;
  const yOff = crouch ? 22 : 0;
  const bob = Math.sin(p.walkPhase) * 1.5;

  let thrustExt = 0;
  let lean = 0;
  if (p.thrustT >= 0) {
    if (p.thrustT < THRUST_WINDUP) {
      const k = p.thrustT / THRUST_WINDUP;
      thrustExt = -10 * k;
      lean = -3 * k;
    } else if (p.thrustT < THRUST_WINDUP + THRUST_ACTIVE) {
      const k = (p.thrustT - THRUST_WINDUP) / THRUST_ACTIVE;
      thrustExt = -10 + 42 * k;
      lean = -3 + 10 * k;
    } else {
      const k = (p.thrustT - THRUST_WINDUP - THRUST_ACTIVE) / THRUST_RECOVER;
      thrustExt = 32 * (1 - k);
      lean = 7 * (1 - k);
    }
  }

  let aimLift = 0;
  let boltCycle = 0;
  let muzzleFlash = 0;
  if (p.shootT >= 0) {
    if (p.shootT < AIM_TIME) {
      const k = p.shootT / AIM_TIME;
      aimLift = -6 * k;
      lean = -2 * k;
    } else if (p.shootT < AIM_TIME + FIRE_TIME) {
      aimLift = -6;
      lean = -2;
      muzzleFlash = 1;
    } else {
      aimLift = -6;
      lean = -2;
      const k = Math.min(1, (p.shootT - AIM_TIME - FIRE_TIME) / BOLT_TIME);
      boltCycle = Math.sin(k * Math.PI);
    }
  }

  let throwLift = 0;
  if (p.throwT >= 0) {
    const k = Math.min(1, p.throwT / 0.35);
    throwLift = -Math.sin(k * Math.PI) * 14;
  }

  const recoilKick = p.recoil * 5;

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const frontLegX = 2 + lean * 0.6;
  const backLegX = -8 - lean * 0.4;
  ctx.fillStyle = "#57534e";
  ctx.fillRect(backLegX, -h + yOff + 30 + bob, 6, 26);
  ctx.fillRect(frontLegX, -h + yOff + 30 - bob, 6, 26);
  ctx.fillStyle = "#78716c";
  ctx.fillRect(backLegX, -h + yOff + 44, 6, 12);
  ctx.fillRect(frontLegX, -h + yOff + 44, 6, 12);

  ctx.save();
  ctx.translate(lean * 0.5, aimLift * 0.3);
  ctx.rotate(((lean * Math.PI) / 180) * 0.5);
  ctx.fillStyle = p.hitFlash > 0 ? "#fca5a5" : "#6b7280";
  ctx.fillRect(-10, -h + yOff + 10, 20, 24);
  ctx.fillStyle = "#44403c";
  ctx.fillRect(-10, -h + yOff + 26, 20, 4);
  ctx.fillStyle = "#57534e";
  ctx.fillRect(-16, -h + yOff + 12, 8, 18);
  ctx.restore();

  ctx.fillStyle = "#d6b48a";
  ctx.beginPath();
  ctx.arc(lean * 0.4, -h + yOff + 2 + aimLift * 0.3, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4b5563";
  ctx.beginPath();
  ctx.arc(lean * 0.4, -h + yOff - 2 + aimLift * 0.3, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(lean * 0.4 - 9, -h + yOff - 2 + aimLift * 0.3, 18, 3);
  ctx.fillStyle = "#b91c1c";
  ctx.beginPath();
  ctx.arc(lean * 0.4, -h + yOff - 4 + aimLift * 0.3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  if (p.throwT >= 0) {
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(6, -h + yOff + 4 + throwLift, 8, 16);
    ctx.fillStyle = "#365314";
    ctx.beginPath();
    ctx.arc(12, -h + yOff + 2 + throwLift, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const gunY = -h + yOff + 18 + aimLift;
  const thrustActive = p.thrustT >= THRUST_WINDUP && p.thrustT < THRUST_WINDUP + THRUST_ACTIVE;
  drawRifle(ctx, 6, gunY, thrustExt, recoilKick, boltCycle, muzzleFlash, thrustActive);

  if (stamina < 30) {
    ctx.fillStyle = "rgba(239,68,68,0.8)";
    ctx.fillRect(-12, -h + yOff - 16, 24, 3);
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Entity) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.facing, 1);

  const staggerLean = e.stagger > 0 ? -6 : 0;

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (e.type === "bunker") {
    ctx.fillStyle = "#57534e";
    ctx.fillRect(-30, -40, 60, 40);
    ctx.fillStyle = "#44403c";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-30, -40 + i * 13, 60, 10);
    }
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(20, -30, 24, 4);
    ctx.fillStyle = "#d6b48a";
    ctx.beginPath();
    ctx.arc(0, -46, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f3f46";
    ctx.beginPath();
    ctx.arc(0, -48, 8, Math.PI, 0);
    ctx.fill();
  } else {
    const h = 52;
    ctx.save();
    ctx.translate(staggerLean, 0);
    ctx.rotate(((staggerLean * Math.PI) / 180) * 0.6);
    ctx.fillStyle = e.type === "militia" ? "#44403c" : "#3f3f46";
    ctx.fillRect(-7, -h + 30, 6, 24);
    ctx.fillRect(1, -h + 30, 6, 24);
    ctx.fillStyle = e.hitFlash > 0 ? "#fca5a5" : e.type === "militia" ? "#57534e" : "#52525b";
    ctx.fillRect(-9, -h + 10, 18, 22);
    ctx.fillStyle = "#d6b48a";
    ctx.beginPath();
    ctx.arc(0, -h + 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f3f46";
    ctx.beginPath();
    ctx.arc(0, -h, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#3f2d1a";
    ctx.fillRect(5, -h + 18, 22, 3);
    ctx.restore();
  }

  const hpPct = e.hp / e.maxHp;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(-20, -70, 40, 4);
  ctx.fillStyle = hpPct > 0.5 ? "#dc2626" : "#f59e0b";
  ctx.fillRect(-20, -70, 40 * hpPct, 4);

  ctx.restore();
}

function drawAlly(ctx: CanvasRenderingContext2D, a: Ally) {
  if (a.down) return;
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.scale(a.facing, 1);

  const h = 52;
  const bob = Math.sin(a.walkPhase) * 1.5;

  let thrustExt = 0;
  let lean = 0;
  if (a.thrustT >= 0) {
    if (a.thrustT < THRUST_WINDUP) {
      const k = a.thrustT / THRUST_WINDUP;
      thrustExt = -10 * k;
      lean = -3 * k;
    } else if (a.thrustT < THRUST_WINDUP + THRUST_ACTIVE) {
      const k = (a.thrustT - THRUST_WINDUP) / THRUST_ACTIVE;
      thrustExt = -10 + 42 * k;
      lean = -3 + 10 * k;
    } else {
      const k = (a.thrustT - THRUST_WINDUP - THRUST_ACTIVE) / THRUST_RECOVER;
      thrustExt = 32 * (1 - k);
      lean = 7 * (1 - k);
    }
  }

  let aimLift = 0;
  let boltCycle = 0;
  let muzzleFlash = 0;
  if (a.shootT >= 0) {
    if (a.shootT < AIM_TIME) {
      const k = a.shootT / AIM_TIME;
      aimLift = -6 * k;
      lean = -2 * k;
    } else if (a.shootT < AIM_TIME + FIRE_TIME) {
      aimLift = -6;
      lean = -2;
      muzzleFlash = 1;
    } else {
      aimLift = -6;
      lean = -2;
      const k = Math.min(1, (a.shootT - AIM_TIME - FIRE_TIME) / BOLT_TIME);
      boltCycle = Math.sin(k * Math.PI);
    }
  }

  const recoilKick = a.recoil * 5;

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const frontLegX = 2 + lean * 0.6;
  const backLegX = -8 - lean * 0.4;
  ctx.fillStyle = "#57534e";
  ctx.fillRect(backLegX, -h + 30 + bob, 6, 24);
  ctx.fillRect(frontLegX, -h + 30 - bob, 6, 24);

  ctx.save();
  ctx.translate(lean * 0.5, aimLift * 0.3);
  ctx.rotate(((lean * Math.PI) / 180) * 0.5);
  ctx.fillStyle = "#6b7280";
  ctx.fillRect(-9, -h + 10, 18, 22);
  ctx.fillStyle = "#44403c";
  ctx.fillRect(-9, -h + 24, 18, 4);
  ctx.restore();

  ctx.fillStyle = "#d6b48a";
  ctx.beginPath();
  ctx.arc(lean * 0.4, -h + 2 + aimLift * 0.3, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4b5563";
  ctx.beginPath();
  ctx.arc(lean * 0.4, -h + aimLift * 0.3, 8, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#b91c1c";
  ctx.beginPath();
  ctx.arc(lean * 0.4, -h - 2 + aimLift * 0.3, 2, 0, Math.PI * 2);
  ctx.fill();

  const gunY = -h + 18 + aimLift;
  const thrustActive = a.thrustT >= THRUST_WINDUP && a.thrustT < THRUST_WINDUP + THRUST_ACTIVE;
  drawRifle(ctx, 5, gunY, thrustExt, recoilKick, boltCycle, muzzleFlash, thrustActive);

  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, pk: Pickup) {
  ctx.save();
  ctx.translate(pk.x, pk.y);
  const bob = Math.sin(Date.now() / 400 + pk.x) * 3;
  ctx.translate(0, bob);
  if (pk.kind === "ammo") {
    ctx.fillStyle = "#a16207";
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(-6, -6, 12, 12);
  } else if (pk.kind === "grenade") {
    ctx.fillStyle = "#365314";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#84cc16";
    ctx.fillRect(-2, -12, 4, 5);
  } else if (pk.kind === "mine") {
    ctx.fillStyle = "#3f3f46";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a8a29e";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI / 2.5) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 3);
      ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 5);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#991b1b";
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = "#fca5a5";
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillRect(-6, -2, 12, 4);
  }
  ctx.restore();
}