export interface EnemySpec {
  type: "pursuer" | "bunker" | "militia";
  count: number;
  hp: number;
  damage: number;
  speed: number;
  ranged: boolean;
}

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  location: string;
  difficulty: number;
  objective: string;
  background: string;
  history: string;
  historyDetail: string;
  playerHp: number;
  ammo: number;
  grenades: number;
  mines: number;
  distance: number;
  environment: "forest" | "river" | "valley" | "bridge" | "snow" | "loess";
  enemies: EnemySpec[];
  staminaDrain: number;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "苏区突围",
    subtitle: "第五次反围剿失败，红军战略转移",
    date: "1934年10月",
    location: "江西 · 赣南山林",
    difficulty: 1,
    objective: "突破地方保安团封锁线，跟随大部队撤离苏区",
    background:
      "第五次反围剿失利，中央红军被迫实行战略转移。你所在的连队担任后卫，掩护主力撤离。",
    history: "1934年10月，中央红军8.6万余人从江西于都出发，开始长征。",
    historyDetail:
      "1934年10月，由于第五次反围剿失败，中央红军主力8.6万余人从江西于都等地出发，踏上战略转移之路。这是长征的起点，也是中国革命生死攸关的转折。",
    playerHp: 100,
    ammo: 24,
    grenades: 2,
    mines: 1,
    distance: 1600,
    environment: "forest",
    staminaDrain: 0.6,
    enemies: [
      { type: "militia", count: 4, hp: 30, damage: 6, speed: 0.9, ranged: false },
      { type: "pursuer", count: 2, hp: 40, damage: 8, speed: 1.0, ranged: true },
    ],
  },
  {
    id: 2,
    title: "浴血湘江",
    subtitle: "长征最惨烈的阻击战",
    date: "1934年11月",
    location: "广西 · 湘江沿岸",
    difficulty: 3,
    objective: "阻击多路追兵，掩护物资与战友渡过湘江",
    background:
      "湘江两岸，敌军重兵封锁。红军将士以血肉之躯死守渡口，为中央纵队争取渡江时间。",
    history: "1934年11月，湘江战役爆发，中央红军由8.6万人锐减至3万余人。",
    historyDetail:
      "1934年11月底至12月初，湘江战役是长征中最惨烈的战役。红军在湘江沿岸与国民党军血战，中央红军由出发时的8.6万余人锐减至3万余人，但成功掩护中央纵队渡过湘江，保存了革命火种。",
    playerHp: 100,
    ammo: 30,
    grenades: 3,
    mines: 2,
    distance: 2200,
    environment: "river",
    staminaDrain: 0.8,
    enemies: [
      { type: "pursuer", count: 6, hp: 40, damage: 9, speed: 1.1, ranged: true },
      { type: "bunker", count: 2, hp: 80, damage: 12, speed: 0, ranged: true },
    ],
  },
  {
    id: 3,
    title: "四渡赤水",
    subtitle: "运动战摆脱敌军包围",
    date: "1935年1月—3月",
    location: "川黔滇 · 赤水河谷",
    difficulty: 3,
    objective: "穿插迂回，避开敌军主力，摆脱包围圈",
    background:
      "敌军重兵合围，红军以高度机动的运动战四渡赤水，在敌军缝隙中穿插突围。",
    history: "1935年1月至3月，毛泽东指挥红军四渡赤水，摆脱数十万敌军围追堵截。",
    historyDetail:
      "1935年1月至3月，红军在毛泽东指挥下四渡赤水河，采取高度机动的运动战方针，纵横驰骋于川黔滇边界，彻底粉碎了国民党数十万大军围歼红军于川黔滇边境的计划，是长征中军事指挥的得意之笔。",
    playerHp: 100,
    ammo: 28,
    grenades: 2,
    mines: 2,
    distance: 2400,
    environment: "valley",
    staminaDrain: 0.9,
    enemies: [
      { type: "pursuer", count: 5, hp: 45, damage: 10, speed: 1.2, ranged: true },
      { type: "militia", count: 4, hp: 35, damage: 8, speed: 1.0, ranged: false },
    ],
  },
  {
    id: 4,
    title: "飞夺泸定桥",
    subtitle: "强渡大渡河，突破天险",
    date: "1935年5月",
    location: "四川 · 大渡河泸定桥",
    difficulty: 4,
    objective: "攻坚桥头碉堡，夺占泸定桥，掩护主力过河",
    background:
      "大渡河天险横亘，泸定桥铁索悬空，桥头碉堡火力封锁。22名勇士冒死夺桥。",
    history: "1935年5月29日，红军22名勇士冒着枪林弹雨夺占泸定桥。",
    historyDetail:
      "1935年5月29日，红四团22名突击队员冒着敌军密集火力，攀踏悬空铁索，夺占泸定桥，为红军主力北上打开了通道。这一壮举粉碎了蒋介石让红军成为'石达开第二'的企图。",
    playerHp: 100,
    ammo: 26,
    grenades: 3,
    mines: 2,
    distance: 1800,
    environment: "bridge",
    staminaDrain: 1.0,
    enemies: [
      { type: "bunker", count: 3, hp: 90, damage: 14, speed: 0, ranged: true },
      { type: "pursuer", count: 4, hp: 45, damage: 10, speed: 1.1, ranged: true },
    ],
  },
  {
    id: 5,
    title: "雪山草地",
    subtitle: "绝境遭遇战",
    date: "1935年6月—8月",
    location: "四川 · 夹金山 · 松潘草地",
    difficulty: 4,
    objective: "穿越雪山草地，抵御残余追兵与匪兵偷袭",
    background:
      "翻越夹金山，穿越松潘草地。严寒、缺氧、沼泽，环境比敌人更致命。",
    history: "1935年6月至8月，红军翻越夹金山，穿越松潘草地，减员严重。",
    historyDetail:
      "1935年6月，红军翻越海拔4000多米的夹金山，这是长征中翻越的第一座大雪山。8月，红军进入茫茫松潘草地，沼泽遍布、气候恶劣，许多战士牺牲在雪山草地上。环境造成的减员远超战斗损失。",
    playerHp: 100,
    ammo: 20,
    grenades: 1,
    mines: 1,
    distance: 2600,
    environment: "snow",
    staminaDrain: 1.6,
    enemies: [
      { type: "militia", count: 5, hp: 35, damage: 9, speed: 0.9, ranged: false },
      { type: "pursuer", count: 3, hp: 40, damage: 10, speed: 1.0, ranged: true },
    ],
  },
  {
    id: 6,
    title: "陕北会师",
    subtitle: "长征胜利，三大主力会师",
    date: "1936年10月",
    location: "甘肃 · 会宁 · 陕北黄土高原",
    difficulty: 2,
    objective: "清理最后残余反动武装，抵达陕北根据地",
    background:
      "历经二万五千里，红军抵达陕北。清理最后残余武装，迎接三大主力会师。",
    history: "1936年10月，红一、红二、红四方面军在甘肃会宁、将台堡会师，长征胜利结束。",
    historyDetail:
      "1936年10月，红一方面军、红二方面军、红四方面军在甘肃会宁、宁夏将台堡胜利会师，宣告红军长征胜利结束。长征的胜利，是中国革命转危为安的关键，铸就了伟大的长征精神。",
    playerHp: 100,
    ammo: 30,
    grenades: 2,
    mines: 2,
    distance: 1400,
    environment: "loess",
    staminaDrain: 0.5,
    enemies: [
      { type: "militia", count: 4, hp: 30, damage: 7, speed: 0.9, ranged: false },
    ],
  },
];