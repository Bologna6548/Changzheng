import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Chapter } from "@/data/chapters";

export default function ChapterBriefing({
  chapter,
  onBegin,
  onBack,
}: {
  chapter: Chapter;
  onBegin: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="text-stone-400 hover:bg-stone-800 hover:text-stone-100"
          onClick={onBack}
        >
          ← 返回主菜单
        </Button>
        <Badge className="bg-red-900/60 text-red-200 hover:bg-red-900/60">
          第 {chapter.id} 章 · {chapter.date}
        </Badge>
      </div>

      <header className="relative overflow-hidden rounded-2xl border border-stone-700 bg-gradient-to-br from-stone-900 via-stone-900 to-red-950/40 p-8 shadow-xl">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-800/20 blur-3xl" />
        <div className="relative">
          <h1 className="font-serif text-3xl font-bold text-stone-50 md:text-4xl">{chapter.title}</h1>
          <p className="mt-2 text-sm text-stone-400">{chapter.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-400">
            <span className="rounded-md bg-stone-800 px-3 py-1">📍 {chapter.location}</span>
            <span className="rounded-md bg-stone-800 px-3 py-1">敌军强度 {"★".repeat(chapter.difficulty)}</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-stone-700 bg-stone-900/60 md:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-stone-100">战前简报</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-stone-300">{chapter.background}</p>
            <Separator className="bg-stone-700" />
            <div>
              <div className="mb-1 text-xs font-semibold text-red-400">突围目标</div>
              <p className="text-sm text-stone-200">{chapter.objective}</p>
            </div>
            <Separator className="bg-stone-700" />
            <div>
              <div className="mb-1 text-xs font-semibold text-amber-400">史实背景</div>
              <p className="text-sm leading-relaxed text-stone-300">{chapter.history}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-700 bg-stone-900/60">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-stone-100">战前配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="体力" value={`${chapter.playerHp}`} />
            <Row label="子弹" value={`${chapter.ammo} 发`} />
            <Row label="土制手雷" value={`${chapter.grenades} 枚`} />
            <Row label="突围距离" value={`${chapter.distance} 米`} />
            <Row label="环境消耗" value={chapter.staminaDrain > 1 ? "严酷" : "正常"} />
            <Separator className="bg-stone-700" />
            <div className="text-xs text-stone-500">
              敌军配置：
              {chapter.enemies
                .map((e) => {
                  const name =
                    e.type === "pursuer" ? "国民党追兵" : e.type === "bunker" ? "碉堡守军" : "地方民团";
                  return `${name}×${e.count}`;
                })
                .join("、")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button size="lg" className="bg-red-800 px-12 text-stone-50 hover:bg-red-700" onClick={onBegin}>
          开始突围
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-400">{label}</span>
      <span className="font-semibold text-stone-100">{value}</span>
    </div>
  );
}