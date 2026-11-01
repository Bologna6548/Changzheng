import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/data/chapters";
import type { EngineApi } from "@/game/useBattleEngine";

export default function HUD({ engine, chapter }: { engine: EngineApi; chapter: Chapter }) {
  const s = engine.state;
  const hpPct = (s.hp / s.maxHp) * 100;
  const stamPct = (s.stamina / s.maxStamina) * 100;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-stone-400">
          <span>体力（意志）</span>
          <span className="tabular-nums text-stone-200">
            {Math.round(s.hp)} / {s.maxHp}
          </span>
        </div>
        <Progress value={hpPct} className={cn("h-3 bg-stone-700", hpPct < 30 && "animate-pulse")} />
        <div className="mt-3 mb-2 flex items-center justify-between text-xs text-stone-400">
          <span>耐力</span>
          <span className="tabular-nums text-stone-200">{Math.round(s.stamina)}%</span>
        </div>
        <Progress value={stamPct} className="h-2 bg-stone-700" />
        {stamPct < 30 && <p className="mt-2 text-xs text-amber-400">体力透支，移速与攻击速度下降</p>}
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4">
        <div className="mb-3 text-xs text-stone-400">物资（匮乏）</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔫</span>
            <div>
              <div className="text-xs text-stone-500">子弹</div>
              <div className="text-lg font-bold tabular-nums text-stone-100">{s.ammo}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💣</span>
            <div>
              <div className="text-xs text-stone-500">手雷</div>
              <div className="text-lg font-bold tabular-nums text-stone-100">{s.grenades}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <Badge variant="outline" className="border-stone-600 text-stone-400">
            点射冷却 {s.reloadCooldown > 0 ? s.reloadCooldown.toFixed(1) : "就绪"}
          </Badge>
          <Badge variant="outline" className="border-stone-600 text-stone-400">
            拼刺 {s.meleeCooldown > 0 ? s.meleeCooldown.toFixed(1) : "就绪"}
          </Badge>
        </div>
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4">
        <div className="mb-3 text-xs text-stone-400">战场态势</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-400">剩余敌军</span>
            <span className="font-bold tabular-nums text-red-400">{s.enemiesRemaining}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">战友</span>
            <span className="font-bold tabular-nums text-stone-200">{s.alliesAlive} 人</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">状态</span>
            <span className="text-stone-200">{s.crouching ? "匍匐隐蔽" : "站立"}</span>
          </div>
        </div>
        {s.messageTimer > 0 && (
          <div className="mt-3 rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-200">{s.message}</div>
        )}
      </div>
    </div>
  );
}