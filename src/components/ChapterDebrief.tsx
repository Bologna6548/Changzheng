import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Chapter } from "@/data/chapters";

export default function ChapterDebrief({
  chapter,
  isLast,
  onNext,
  onMenu,
}: {
  chapter: Chapter;
  isLast: boolean;
  onNext: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-br from-red-950 via-stone-900 to-stone-900 p-8 text-center shadow-xl">
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-red-800/20 blur-3xl" />
        <div className="relative">
          <Badge className="mb-3 bg-red-900/60 text-red-200 hover:bg-red-900/60">突围成功</Badge>
          <h1 className="font-serif text-3xl font-bold text-stone-50 md:text-4xl">{chapter.title}</h1>
          <p className="mt-2 text-sm text-stone-400">
            {chapter.date} · {chapter.location}
          </p>
        </div>
      </header>

      <Card className="border-stone-700 bg-stone-900/60">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-stone-100">党史学习 · 战役复盘</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-stone-300">{chapter.historyDetail}</p>
          <Separator className="bg-stone-700" />
          <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-4">
            <p className="text-xs leading-relaxed text-red-200/80">
              红军将士以凡人之躯，在装备落后、物资匮乏、敌强我弱的绝境中，
              凭借坚定的革命信念、灵活的战略战术与不怕牺牲的英雄气概，
              完成了人类历史上伟大的远征。谨记历史，致敬先烈。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          className="border-stone-600 bg-transparent text-stone-200 hover:bg-stone-800"
          onClick={onMenu}
        >
          返回主菜单
        </Button>
        <Button size="lg" className="bg-red-800 px-10 text-stone-50 hover:bg-red-700" onClick={onNext}>
          {isLast ? "完成长征" : "进入下一章 →"}
        </Button>
      </div>
    </div>
  );
}