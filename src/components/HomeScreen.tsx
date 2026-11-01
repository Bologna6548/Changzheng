import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Chapter } from "@/data/chapters";

interface HomeScreenProps {
  chapters: Chapter[];
  onSelect: (chapter: Chapter) => void;
}

export function HomeScreen({ chapters, onSelect }: HomeScreenProps) {
  const list = chapters ?? [];

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-gradient-to-r from-red-900 via-red-800 to-stone-800 px-8 py-10 text-stone-50 shadow-md">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-widest text-red-200">
            1934 — 1936 · 中国工农红军
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">
            长征 · 突围
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-200">
            2D 横版写实闯关对战。以凡人之躯，凭意志、战术与勇气，突破封锁、掩护主力、奋勇突围。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-stone-800">
            六大史实关卡
          </h2>
          <span className="text-sm text-stone-500">
            共 {list.length} 章
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {list.map((c) => (
            <Card
              key={c.id}
              className="border-stone-300 bg-white shadow-sm transition hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-red-800 text-stone-50 hover:bg-red-800">
                    第{c.id}章
                  </Badge>
                  <span className="text-xs text-stone-500">{c.date}</span>
                </div>
                <CardTitle className="mt-2 font-serif text-xl text-stone-800">
                  {c.title}
                </CardTitle>
                <p className="text-xs text-stone-500">{c.place}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-stone-600">
                  {c.summary}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                  <span className="rounded bg-stone-100 px-2 py-1">
                    子弹 {c.ammo}
                  </span>
                  <span className="rounded bg-stone-100 px-2 py-1">
                    手雷 {c.grenades}
                  </span>
                  <span className="rounded bg-stone-100 px-2 py-1">
                    战友 {c.allies}
                  </span>
                </div>
                <Button
                  className="w-full bg-red-800 text-stone-50 hover:bg-red-900"
                  onClick={() => onSelect(c)}
                >
                  进入关卡
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}