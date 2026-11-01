import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CHAPTERS, type Chapter } from "@/data/chapters";
import { useBattleEngine, type GameState } from "@/game/useBattleEngine";
import BattleCanvas from "@/components/BattleCanvas";
import HUD from "@/components/HUD";
import ChapterBriefing from "@/components/ChapterBriefing";
import ChapterDebrief from "@/components/ChapterDebrief";

export default function App() {
  const [phase, setPhase] = useState<"menu" | "briefing" | "battle" | "debrief" | "victory" | "defeat">("menu");
  const [chapterIndex, setChapterIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const engine = useBattleEngine();

  const chapter = CHAPTERS[chapterIndex];

  const startChapter = useCallback((idx: number) => {
    setChapterIndex(idx);
    setPhase("briefing");
  }, []);

  const beginBattle = useCallback(() => {
    engine.init(chapter);
    setPhase("battle");
  }, [chapter, engine]);

  const handleEnd = useCallback(
    (result: "victory" | "defeat") => {
      if (result === "victory") {
        setCompleted((c) => (c.includes(chapterIndex) ? c : [...c, chapterIndex]));
        setPhase("debrief");
      } else {
        setPhase("defeat");
      }
    },
    [chapterIndex]
  );

  useEffect(() => {
    if (phase !== "battle") return;
    const unsub = engine.onEnd(handleEnd);
    return unsub;
  }, [phase, engine, handleEnd]);

  const nextChapter = useCallback(() => {
    if (chapterIndex + 1 < CHAPTERS.length) {
      startChapter(chapterIndex + 1);
    } else {
      setPhase("victory");
    }
  }, [chapterIndex, startChapter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {phase === "menu" && <MainMenu completed={completed} onStart={startChapter} />}

        {phase === "briefing" && (
          <ChapterBriefing chapter={chapter} onBegin={beginBattle} onBack={() => setPhase("menu")} />
        )}

        {phase === "battle" && (
          <div className="space-y-4">
            <BattleHeader chapter={chapter} state={engine.state} />
            <BattleCanvas engine={engine} chapter={chapter} onExit={() => setPhase("menu")} />
            <HUD engine={engine} chapter={chapter} />
          </div>
        )}

        {phase === "debrief" && (
          <ChapterDebrief
            chapter={chapter}
            isLast={chapterIndex + 1 >= CHAPTERS.length}
            onNext={nextChapter}
            onMenu={() => setPhase("menu")}
          />
        )}

        {phase === "defeat" && (
          <DefeatScreen chapter={chapter} onRetry={beginBattle} onMenu={() => setPhase("menu")} />
        )}

        {phase === "victory" && <VictoryScreen onMenu={() => setPhase("menu")} />}
      </div>
    </div>
  );
}

function MainMenu({ completed, onStart }: { completed: number[]; onStart: (idx: number) => void }) {
  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-br from-red-950 via-stone-900 to-stone-900 p-8 shadow-xl md:p-12">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-800/20 blur-3xl" />
        <div className="relative">
          <Badge className="mb-4 border-red-700/50 bg-red-900/40 text-red-200 hover:bg-red-900/40">
            1934 — 1936 · 中国工农红军
          </Badge>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-50 md:text-5xl">
            长征 · 突围之路
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-300 md:text-base">
            二万五千里，凡人之躯，比肩神明。你是一名中央红军普通步兵战士，
            没有超能力，只有意志、战术与勇气。突破封锁、掩护主力、奋勇突围。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="bg-red-800 text-stone-50 hover:bg-red-700" onClick={() => onStart(0)}>
              开始长征
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
              onClick={() => onStart(completed.length > 0 ? completed[completed.length - 1] : 0)}
            >
              继续上次
            </Button>
          </div>
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-serif text-2xl font-bold text-stone-100">六大史实关卡</h2>
          <Separator className="flex-1 bg-stone-700" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map((ch, i) => {
            const done = completed.includes(i);
            return (
              <Card
                key={ch.id}
                className={cn(
                  "cursor-pointer border-stone-700 bg-stone-900/60 transition hover:border-red-800/60 hover:bg-stone-800/60",
                  done && "border-red-800/60"
                )}
                onClick={() => onStart(i)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-stone-600 text-stone-300">
                      第 {i + 1} 章
                    </Badge>
                    {done && (
                      <Badge className="bg-red-900/60 text-red-200 hover:bg-red-900/60">已完成</Badge>
                    )}
                  </div>
                  <CardTitle className="font-serif text-lg text-stone-100">{ch.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-stone-400">{ch.subtitle}</p>
                  <div className="mt-3 flex gap-2 text-xs text-stone-500">
                    <span>敌军强度 {"★".repeat(ch.difficulty)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-stone-700 bg-stone-900/40 p-6">
        <h3 className="font-serif text-lg font-bold text-stone-200">操作说明</h3>
        <div className="mt-3 grid gap-3 text-sm text-stone-400 md:grid-cols-2">
          <p><span className="text-stone-200">A / D</span> — 左右移动</p>
          <p><span className="text-stone-200">W</span> — 跳跃</p>
          <p><span className="text-stone-200">S</span> — 匍匐隐蔽（降低被瞄准概率）</p>
          <p><span className="text-stone-200">J</span> — 步枪点射（消耗子弹）</p>
          <p><span className="text-stone-200">K</span> — 近身拼刺 / 枪托格挡</p>
          <p><span className="text-stone-200">L</span> — 投掷土制手雷（限量）</p>
        </div>
      </section>
    </div>
  );
}

function BattleHeader({ chapter, state }: { chapter: Chapter; state: GameState }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-700 bg-stone-900/60 px-5 py-3">
      <div className="flex items-center gap-3">
        <Badge className="bg-red-900/60 text-red-200 hover:bg-red-900/60">第 {chapter.id} 章</Badge>
        <h2 className="font-serif text-lg font-bold text-stone-100">{chapter.title}</h2>
      </div>
      <div className="flex items-center gap-4 text-xs text-stone-400">
        <span>突围进度</span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-stone-700">
          <div
            className="h-full rounded-full bg-red-700 transition-all duration-500"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <span className="tabular-nums text-stone-200">{Math.round(state.progress)}%</span>
      </div>
    </div>
  );
}

function DefeatScreen({
  chapter,
  onRetry,
  onMenu,
}: {
  chapter: Chapter;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6 text-center">
      <Badge className="border-stone-600 bg-stone-800 text-stone-300 hover:bg-stone-800">
        突围受挫
      </Badge>
      <h1 className="font-serif text-4xl font-bold text-stone-50 md:text-5xl">体力透支</h1>
      <p className="max-w-xl text-sm leading-relaxed text-stone-300">
        战士体力耗尽，被迫原地休整。红军不怕远征难，稍作调整，再度突围。
      </p>
      <p className="text-xs text-stone-500">
        第 {chapter.id} 章 · {chapter.title} · {chapter.location}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
          onClick={onMenu}
        >
          返回主菜单
        </Button>
        <Button size="lg" className="bg-red-800 px-10 text-stone-50 hover:bg-red-700" onClick={onRetry}>
          休整重试
        </Button>
      </div>
    </div>
  );
}

function VictoryScreen({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6 text-center">
      <Badge className="border-red-700/50 bg-red-900/40 text-red-200 hover:bg-red-900/40">
        1936 · 陕北会师
      </Badge>
      <h1 className="font-serif text-4xl font-bold text-stone-50 md:text-5xl">长征胜利</h1>
      <p className="max-w-xl text-sm leading-relaxed text-stone-300">
        红军三大主力胜利会师，二万五千里长征宣告结束。
        谨以此作，致敬每一位以凡人之躯走完绝境的红军战士。
      </p>
      <Button size="lg" className="bg-red-800 text-stone-50 hover:bg-red-700" onClick={onMenu}>
        返回主菜单
      </Button>
    </div>
  );
}