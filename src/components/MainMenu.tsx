import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Play, Star } from "lucide-react";
import type { Chapter } from "@/data/chapters";

interface MainMenuProps {
  chapters: Chapter[];
  unlocked: number;
  onStart: () => void;
}

export function MainMenu({ chapters, unlocked, onStart }: MainMenuProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-950 to-black text-stone-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10 border-b border-stone-800 pb-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-800 text-2xl shadow-md">
              ★
            </span>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-wide text-stone-50">
                长征 · 突围
              </h1>
              <p className="text-sm text-stone-400">
                2D 写实横版闯关 · 战术突围对抗
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-stone-400">
            以中央红军普通战士的视角，重走二万五千里征途。弹药有限、体力有限，
            依靠意志、战术与勇气完成突围。战斗目的永远是突围、掩护、破封锁。
          </p>
        </header>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-stone-200">
            战役章节
          </h2>
          <Badge className="bg-red-900 text-red-100 hover:bg-red-900">
            已解锁 {unlocked} / {chapters.length}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {chapters.map((ch, i) => {
            const isUnlocked = i < unlocked;
            return (
              <Card
                key={ch.id}
                className={`border-stone-800 bg-stone-900/60 transition ${
                  isUnlocked
                    ? "hover:border-red-800 hover:bg-stone-900"
                    : "opacity-60"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-mono text-stone-500">
                          第 {ch.id} 章
                        </span>
                        {isUnlocked ? (
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-stone-600" />
                        )}
                      </div>
                      <h3 className="font-serif text-lg font-bold text-stone-100">
                        {ch.title}
                      </h3>
                      <p className="mt-1 text-xs text-stone-500">
                        {ch.date} · {ch.place}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-stone-400">
                        {ch.summary}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-stone-800 pt-3">
                    <span className="text-xs text-stone-500">
                      敌军：{ch.enemyType}
                    </span>
                    {isUnlocked ? (
                      <Button
                        size="sm"
                        onClick={onStart}
                        className="bg-red-800 text-stone-50 hover:bg-red-700"
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        进入战场
                      </Button>
                    ) : (
                      <span className="text-xs text-stone-600">未解锁</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-stone-800 bg-stone-900/40 p-6">
          <h3 className="mb-2 font-serif text-base font-semibold text-stone-200">
            操作说明
          </h3>
          <div className="grid gap-2 text-sm text-stone-400 sm:grid-cols-2">
            <p>
              <span className="font-mono text-stone-200">A / D</span> 左右移动
            </p>
            <p>
              <span className="font-mono text-stone-200">W / 空格</span> 跳跃
            </p>
            <p>
              <span className="font-mono text-stone-200">J</span> 步枪点射
            </p>
            <p>
              <span className="font-mono text-stone-200">K</span> 近身拼刺
            </p>
            <p>
              <span className="font-mono text-stone-200">S</span> 匍匐隐蔽
            </p>
            <p>
              <span className="font-mono text-stone-200">G</span> 投掷手雷
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}