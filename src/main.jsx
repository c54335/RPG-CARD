import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const CARD_TYPES = {
  attack: { name: '攻擊', icon: '⚔', color: '#dc5656' },
  control: { name: '操控', icon: '✦', color: '#a978ff' },
  foresee: { name: '預知', icon: '◈', color: '#62d6ff' },
};
const CARD_TYPE_KEYS = Object.keys(CARD_TYPES);
const EVENT_TYPES = {
  attack: { name: '攻擊', icon: '⚔', color: '#dc5656' },
  control: { name: '操控', icon: '✦', color: '#a978ff' },
  foresee: { name: '預知', icon: '◈', color: '#62d6ff' },
  clash: { name: '相殺', icon: '☠', color: '#f2b84b' },
};
const EVENT_TYPE_KEYS = Object.keys(EVENT_TYPES);
const HAND_DAMAGE = { high: 5, pair: 10, twoPair: 15, trips: 20, straight: 25, flush: 30, fullHouse: 35, quads: 40, straightFlush: 50 };
const SPECIALS = [
  { id: 'gamblerPlus', name: '賭徒・增幅', icon: '🎲+', kind: 'scorePlus', timing: 'compare', desc: '比較點數時，自己本回合點數 +3。' },
  { id: 'trickster', name: '詐術師', icon: '🎭', kind: 'oppMinus', timing: 'compare', desc: '比較點數時，對手本回合點數 -2。' },
  { id: 'supporter', name: '支援者', icon: '💚', kind: 'postHeal', timing: 'post', desc: '比較點數後，不論輸贏，回復自己 10 HP。' },
  { id: 'scavenger', name: '拾荒者', icon: '👜', kind: 'postDraw', timing: 'post', desc: '比較點數後，不論輸贏，抽 2 張牌。' },
  { id: 'guardian', name: '守衛者', icon: '🛡', kind: 'loseAttackHeal', timing: 'lose', desc: '若輸掉攻擊事件，回復自己 20 HP。' },
  { id: 'warrior', name: '戰士', icon: '🗡', kind: 'damageBoost', timing: 'event', desc: '造成傷害時，總傷害提高 50%。' },
  { id: 'prophet', name: '預言家', icon: '🔮', kind: 'loseForeseeRedraw', timing: 'lose', desc: '若輸掉預知事件，可棄 2 張手牌並抽 2 張下回合可能事件類型的牌。' },
  { id: 'magician', name: '魔術師', icon: '🪄', kind: 'loseControlAdjust', timing: 'lose', desc: '若輸掉操控事件，可選擇場上一張已打出的牌任意增減 1 點。' },
];

const QUALITY = {
  low: { name: '低', weight: 60 },
  mid: { name: '中', weight: 30 },
  high: { name: '高', weight: 10 },
};
const ATTACK_ROLLS = [
  { value: 0, weight: 25 },
  { value: 5, weight: 45 },
  { value: 10, weight: 22 },
  { value: 15, weight: 8 },
];
const TITLE_POOL = ['無畏的','狡猾的','古老的','血腥的','沉默的','瘋狂的','堅毅的','神秘的','黑暗的','閃耀的','破碎的','永恆的','憤怒的','孤獨的','傳說中的','被遺忘的','復仇的','烈焰的','冰冷的','殘酷的','榮耀的','詭異的','龐大的','靈巧的','鋒利的','貪婪的','虔誠的','墮落的','無敵的','命運的'];
const NAME_POOL = ['阿卡','薩爾','葛雷','托爾','賽勒斯','瑪格','柯林','德文','烏格','索拉','芬里','卡妮','鐵木','葛洛','席格','奈爾','卓克','薇拉','班納','歐丁','莉卡','塔格','克里','賽拉','杜爾','芙蕾','岡薩','蕾娜','提坦','魔藍','艾格','基洛','薩加','托比','伊森','尼克','歐拉','德里','哈克','費倫','賽格','烏娜','柯帝','亞倫','費克','莫格','比爾','塔拉','賽利','卓格'];
const RECRUIT_ATTR_POOL = [
  { job: '賭徒', type: 'scorePlus', icon: '🎲+', values: { low: 1, mid: 2, high: 3 }, text: v => `比較時自己點數 +${v}` },
  { job: '賭徒', type: 'oppMinus', icon: '🎭', values: { low: 1, mid: 2, high: 3 }, text: v => `比較時對手點數 -${v}` },
  { job: '支援者', type: 'postDraw', icon: '👜', values: { low: 1, mid: 2, high: 3 }, text: v => `不論輸贏抽牌 ${v} 張` },
  { job: '支援者', type: 'postHeal', icon: '💚', values: { low: 10, mid: 15, high: 20 }, text: v => `不論輸贏回血 ${v}` },
  { job: '戰士', type: 'damageBoost', icon: '🗡', values: { low: 10, mid: 20, high: 30 }, text: v => `贏攻擊事件，傷害 +${v}%` },
  { job: '戰士', type: 'loseAttackDamage', icon: '🩸', values: { low: 0.2, mid: 0.4, high: 0.6 }, text: v => `輸攻擊事件，仍造成總攻擊力 ×${v} 傷害` },
  { job: '守衛', type: 'clashWinReduce', icon: '🛡', values: { low: 20, mid: 30, high: 40 }, text: v => `相殺事件獲勝，對手傷害 -${v}%` },
  { job: '守衛', type: 'clashLoseHeal', icon: '🛡+', values: { low: 15, mid: 20, high: 25 }, text: v => `相殺事件落敗，回血 ${v}` },
  { job: '魔術師', type: 'controlWinAdjust', icon: '🪄+', values: { low: 2, mid: 3, high: 4 }, text: v => `贏操控事件，額外增/減場上一張牌 ${v} 點` },
  { job: '魔術師', type: 'loseControlAdjust', icon: '🪄', values: { low: 1, mid: 2, high: 3 }, text: v => `輸操控事件，增/減場上一張牌 ${v} 點` },
  { job: '預言家', type: 'foreseeWinPeek', icon: '🔮+', values: { low: 3, mid: 4, high: 5 }, text: v => `贏預知事件，查看對手 ${v} 張手牌` },
  { job: '預言家', type: 'foreseeLosePeek', icon: '🔮', values: { low: 1, mid: 2, high: 4 }, text: v => `輸預知事件，查看對手 ${v} 張手牌` },
];
const RARITY_INFO = {
  green: { name: '綠色・普通', short: '普通', icon: '🟢' },
  blue: { name: '藍色・罕見', short: '罕見', icon: '🔵' },
  purple: { name: '紫色・稀有', short: '稀有', icon: '🟣' },
  gold: { name: '金色・史詩', short: '史詩', icon: '🟡' },
  rainbow: { name: '彩虹・傳說', short: '傳說', icon: '🌈' },
};
const weightedPick = entries => {
  const sum = entries.reduce((a, e) => a + e.weight, 0);
  let roll = Math.random() * sum;
  for (const e of entries) { roll -= e.weight; if (roll <= 0) return e; }
  return entries[entries.length - 1];
};
function makeRecruitAttr(usedTypes = new Set()) {
  const pool = RECRUIT_ATTR_POOL.filter(a => !usedTypes.has(a.type));
  const base = rnd(pool.length ? pool : RECRUIT_ATTR_POOL);
  const q = weightedPick(Object.entries(QUALITY).map(([key, q]) => ({ key, ...q })));
  const value = base.values[q.key];
  return {
    id: `${base.type}-${q.key}-${Math.random().toString(36).slice(2)}`,
    type: base.type,
    job: base.job,
    icon: base.icon,
    quality: q.key,
    qualityName: q.name,
    value,
    text: base.text(value),
  };
}
function recruitRarity(attrs, attackPower = 0) {
  // v29 稀有度判定：機率不變，只更新條件。
  // 綠：無詞條 + 無攻擊力
  // 藍：低品質詞條；或只有攻擊力、無詞條
  // 紫：中品質詞條 + 無攻擊力
  // 金：中品質詞條 + 有攻擊力；或高品質詞條 + 無攻擊力
  // 彩虹：高品質詞條 + 有攻擊力
  const attr = attrs[0];
  const hasAttack = attackPower > 0;
  if (!attr) return hasAttack ? 'blue' : 'green';
  if (attr.quality === 'low') return 'blue';
  if (attr.quality === 'mid') return hasAttack ? 'gold' : 'purple';
  if (attr.quality === 'high') return hasAttack ? 'rainbow' : 'gold';
  return hasAttack ? 'blue' : 'green';
}
function generateRecruit() {
  const attackPower = weightedPick(ATTACK_ROLLS).value;
  const hasEffect = Math.random() >= 0.40;
  const attrs = hasEffect ? [makeRecruitAttr(new Set())] : [];
  const attrCount = attrs.length;
  const rarity = recruitRarity(attrs, attackPower);
  const training = Math.max(0, 4 - (attackPower > 0 ? 1 : 0) - (attrs.length ? 1 : 0));
  const jobs = attrs.map(a => a.job).filter((v, i, arr) => arr.indexOf(v) === i);
  const title = rnd(TITLE_POOL);
  const baseName = rnd(NAME_POOL);
  const icon = rarity === 'rainbow' ? '🌈' : rarity === 'gold' ? '🌟' : rarity === 'purple' ? '🟣' : rarity === 'blue' ? '🔹' : '👤';
  return {
    recruitId: `rec-${Math.random().toString(36).slice(2)}`,
    name: `${title} ${baseName}`,
    roleName: jobs.length ? jobs.join(' / ') : (attackPower ? '傭兵' : '白板冒險者'),
    icon,
    attrs,
    attrCount,
    attackPower,
    training,
    rarity,
    rarityName: RARITY_INFO[rarity].name,
    hasHigh: attrs.some(a => a.quality === 'high'),
  };
}
const makeRecruitGroup = () => Array.from({ length: 5 }, () => ({ card: generateRecruit(), revealed: false, opening: false }));
const makeRecruitState = (stage = 'tutorial') => ({ stage, pool: [], selected: [], groupIndex: 1, group: [], flash: null, locked: false, detailId: null, dealTick: 0 });
const recruitToSpecial = (r, i) => ({
  id: r.recruitId,
  uid: `rec-sp-${i}-${r.recruitId}`,
  name: r.name,
  icon: r.icon,
  kind: r.attrs[0]?.type || 'none',
  attrs: r.attrs,
  attackPower: r.attackPower || 0,
  training: r.training,
  rarity: r.rarity,
  cd: 0,
  desc: [
    r.attackPower ? `⚔ 攻擊力 ${r.attackPower}` : '無攻擊力',
    r.attrs.length ? r.attrs.map(a => `【${a.qualityName}】${a.text}`).join('；') : '無效果詞條',
    `訓練：${r.training}次`,
  ].join('｜'),
});
const moveSpecials = move => Array.isArray(move?.specials) ? move.specials : (move?.special ? [move.special] : []);
const baseSpecialAttrs = sp => sp?.attrs?.length ? sp.attrs : (sp ? [{ type: sp.kind, value: sp.kind === 'scorePlus' ? 3 : sp.kind === 'oppMinus' ? 2 : sp.kind === 'postHeal' ? 10 : sp.kind === 'postDraw' ? 2 : sp.kind === 'damageBoost' ? 50 : sp.kind === 'loseAttackHeal' ? 20 : sp.kind === 'loseControlAdjust' ? 1 : 0, text: sp.desc, job: sp.name, icon: sp.icon, qualityName: '固定' }] : []);
const specialAttrs = source => {
  if (!source) return [];
  if (Array.isArray(source)) return source.flatMap(baseSpecialAttrs);
  if (Array.isArray(source.specials) || source.special) return moveSpecials(source).flatMap(baseSpecialAttrs);
  return baseSpecialAttrs(source);
};
const hasAttr = (sp, type) => specialAttrs(sp).some(a => a.type === type);
const attrsOf = (sp, type) => specialAttrs(sp).filter(a => a.type === type);
const sumAttr = (sp, type) => attrsOf(sp, type).reduce((n, a) => n + Number(a.value || 0), 0);
const maxAttr = (sp, type) => Math.max(0, ...attrsOf(sp, type).map(a => Number(a.value || 0)));
const adventurePower = sp => sp?.attackPower ?? 10;
const moveSummary = move => moveSpecials(move).map(sp => `${sp.name} ${sp.attackPower ? `⚔${sp.attackPower}` : '無攻'} ${sp.attrs?.length ? sp.attrs.map(a => a.text).join('、') : ''}`.trim()).join('｜') || '未投入';

const EVENTS = [
  { id: 'bigAttack', type: 'attack', requiredCardType: 'attack', name: '大攻擊', icon: '⚔⚔', max: 2, text: '贏家造成「冒險者總攻擊力 × 2」傷害。最多投入 2 隻冒險者。' },
  { id: 'smallAttack', type: 'attack', requiredCardType: 'attack', name: '小攻擊', icon: '⚔', max: 4, text: '贏家造成「冒險者總攻擊力 × 1」傷害。最多投入 4 隻冒險者。' },
  { id: 'control', type: 'control', requiredCardType: 'control', name: '點數操控', icon: '✦±', max: 3, text: '贏家增減場上已打出的牌點數，幅度 = 投入冒險者數。最多投入 3 隻。' },
  { id: 'foresee', type: 'foresee', requiredCardType: 'foresee', name: '事件預知', icon: '◈×', max: 2, text: '贏家選擇「投入冒險者數」種事件類型，下一回合不會出現。最多投入 2 隻。' },
  { id: 'clash', type: 'clash', requiredCardType: null, name: '相殺', icon: '☠☠', max: 2, text: '雙方可任意出牌，且雙方都對對方造成「冒險者總攻擊力 × 1」傷害。最多投入 2 隻。' },
];

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const makeDeck = () => shuffle(CARD_TYPE_KEYS.flatMap(type => Array.from({ length: 10 }, (_, i) => ({
  id: `${type}-${i + 1}-${Math.random().toString(36).slice(2)}`,
  type,
  rank: i + 1,
}))));
const makeSpecials = (roster = null) => roster?.length ? roster.map(recruitToSpecial) : SPECIALS.map((s, i) => ({ ...s, uid: `sp-${i}-${Math.random().toString(36).slice(2)}`, cd: 0 }));
const cardText = c => c ? `${CARD_TYPES[c.type].icon}${c.rank}` : '未出牌';
const investCount = move => (move?.white || 0) + moveSpecials(move).length;
const investPower = move => (move?.white || 0) * 5 + moveSpecials(move).reduce((n, sp) => n + adventurePower(sp), 0);
const damageTo = (reveal, target) => {
  if (!reveal?.lines) return 0;
  let dmg = 0;
  reveal.lines.forEach(line => {
    const p = line.match(/玩家造成\s*(\d+)\s*傷害/);
    const m = line.match(/怪物造成\s*(\d+)\s*傷害/);
    if (target === 'monster' && p) dmg += Number(p[1]);
    if (target === 'player' && m) dmg += Number(m[1]);
  });
  return dmg;
};

function drawCards(side, n, allowedTypes = null) {
  let deck = [...side.deck];
  let discard = [...side.discard];
  const drawn = [];
  const drawOne = () => {
    if (!deck.length && discard.length) {
      deck = shuffle(discard);
      discard = [];
    }
    if (!deck.length) return null;
    if (!allowedTypes) return deck.shift();
    let idx = deck.findIndex(c => allowedTypes.includes(c.type));
    if (idx < 0 && discard.length) {
      deck = shuffle([...deck, ...discard]);
      discard = [];
      idx = deck.findIndex(c => allowedTypes.includes(c.type));
    }
    if (idx < 0) return deck.shift();
    const [card] = deck.splice(idx, 1);
    return card;
  };
  for (let i = 0; i < n; i++) {
    const card = drawOne();
    if (card) drawn.push(card);
  }
  return { side: { ...side, deck, discard, hand: [...side.hand, ...drawn] }, drawn };
}
function newSide(name, recruitedRoster = null) {
  const deck = makeDeck();
  const hand = deck.slice(0, 5);
  return {
    name,
    hp: 100,
    deck: deck.slice(5),
    hand,
    discard: [],
    played: [],
    white: { ready: 10, cd: [] },
    specials: makeSpecials(recruitedRoster),
    selectedCard: null,
    selectedWhite: 0,
    selectedSpecials: [],
  };
}
function initial(recruitedRoster = null) {
  return {
    player: newSide('冒險者團', recruitedRoster),
    monster: newSide('深淵怪物'),
    round: 0,
    event: null,
    phase: 'start',
    reveal: null,
    nextEventBans: [],
    gameOver: null,
    finalAfterPending: false,
    monsterHandReveal: null,
    roster: recruitedRoster,
    log: ['按「開始戰鬥」進入事件牌局。'],
  };
}
function tickCd(side) {
  const newWhiteCd = [];
  let readyGain = 0;
  side.white.cd.forEach(c => {
    const n = c - 1;
    if (n <= 0) readyGain += 1;
    else newWhiteCd.push(n);
  });
  return {
    ...side,
    white: { ready: side.white.ready + readyGain, cd: newWhiteCd },
    specials: side.specials.map(s => ({ ...s, cd: Math.max(0, s.cd - 1) })),
  };
}
function applyInvestCd(side, move) {
  const white = move.white || 0;
  const selectedUids = new Set(moveSpecials(move).map(s => s.uid));
  return {
    ...side,
    white: { ready: Math.max(0, side.white.ready - white), cd: [...side.white.cd, ...Array.from({ length: white }, () => 2)] },
    specials: side.specials.map(s => selectedUids.has(s.uid) ? { ...s, cd: 3 } : s),
  };
}
function removePlayedCard(side, card) {
  if (!card) return side;
  return {
    ...side,
    hand: side.hand.filter(c => c.id !== card.id),
    played: [...side.played, { ...card, playedId: `${card.id}-${side.played.length}` }],
  };
}
function getEvent(bans = []) {
  const pool = EVENTS.filter(e => !bans.includes(e.type));
  return rnd(pool.length ? pool : EVENTS);
}
function legalCards(hand, event) {
  if (!event) return [];
  if (!event.requiredCardType) return hand;
  return hand.filter(c => c.type === event.requiredCardType);
}
function chooseMonsterCard(monster, event) {
  const legal = legalCards(monster.hand, event);
  if (!legal.length) return null;
  return [...legal].sort((a, b) => b.rank - a.rank)[0];
}
function availableSpecials(side) { return side.specials.filter(s => s.cd <= 0); }
function estimatePlayerBest(playerHand, event) {
  const legal = legalCards(playerHand, event);
  return legal.length ? Math.max(...legal.map(c => c.rank)) : 0;
}
function chooseMonsterMove(monster, playerHand, event) {
  const card = chooseMonsterCard(monster, event);
  const pBest = estimatePlayerBest(playerHand, event);
  const mBase = card?.rank || 0;
  const behind = mBase < pBest;
  const close = Math.abs(mBase - pBest) <= 3;
  const available = availableSpecials(monster);
  const selected = [];
  const add = (sp) => {
    if (!sp || selected.some(x => x.uid === sp.uid) || selected.length >= event.max) return;
    selected.push(sp);
  };
  if (available.length && event.max > 0) {
    if (behind && close) add(available.find(s => hasAttr(s, 'scorePlus') || hasAttr(s, 'oppMinus')));
    if (event.type === 'attack' && mBase >= pBest) add(available.find(s => hasAttr(s, 'damageBoost')));
    if (event.type === 'attack' && behind) add(available.find(s => hasAttr(s, 'loseAttackDamage') || hasAttr(s, 'loseAttackHeal')));
    if (event.type === 'clash') add(available.find(s => hasAttr(s, 'clashWinReduce') || hasAttr(s, 'clashLoseHeal')));
    if (event.type === 'control') add(available.find(s => hasAttr(s, behind ? 'loseControlAdjust' : 'controlWinAdjust')));
    if (event.type === 'foresee') add(available.find(s => hasAttr(s, behind ? 'foreseeLosePeek' : 'foreseeWinPeek') || s.kind === 'loseForeseeRedraw'));
    if (monster.hp < 45) add(available.find(s => hasAttr(s, 'postHeal')));
    if (mBase >= pBest) add(available.find(s => hasAttr(s, 'postDraw')));
    for (const sp of available) {
      if (selected.length >= event.max) break;
      if (!selected.some(x => x.uid === sp.uid)) selected.push(sp);
    }
  }
  return { card, white: 0, specials: selected, special: selected[0] || null };
}
function scoreValue(move, oppMove) {
  let v = move.card?.rank || 0;
  v += sumAttr(move, 'scorePlus');
  v -= sumAttr(oppMove, 'oppMinus');
  return Math.max(0, v);
}
function chooseBansForSide(side, count) {
  const typeScores = EVENT_TYPE_KEYS.map(t => {
    const has = t === 'clash' ? 99 : side.hand.filter(c => c.type === t).length;
    return [t, has];
  }).sort((a, b) => a[1] - b[1]);
  return typeScores.slice(0, count).map(x => x[0]);
}
function adjustPlayed(side, amount, preferSelf = true) {
  if (!side.played.length || amount <= 0) return { side, text: '沒有可操控的已打出牌。' };
  const played = [...side.played];
  const idx = preferSelf
    ? played.reduce((bi, c, i) => c.rank < played[bi].rank ? i : bi, 0)
    : played.reduce((bi, c, i) => c.rank > played[bi].rank ? i : bi, 0);
  const old = played[idx];
  const nextRank = clamp(old.rank + (preferSelf ? amount : -amount), 1, 10);
  played[idx] = { ...old, rank: nextRank, modified: true };
  return { side: { ...side, played }, text: `${cardText(old)} → ${cardText(played[idx])}` };
}
function loseSpecials(side, move, event, nextBans) {
  let lines = [];
  let pendingChoice = null;
  const specs = moveSpecials(move);
  if (!specs.length) return { side, lines, pendingChoice };
  const loseAttackHealValue = sumAttr(move, 'loseAttackHeal');
  if (loseAttackHealValue && event.type === 'attack') {
    if (side.hp > 0) {
      side = { ...side, hp: clamp(side.hp + loseAttackHealValue, 0, 100) };
      lines.push(`${side.name} 守衛效果觸發：輸掉攻擊事件，回復 ${loseAttackHealValue} HP。`);
    } else {
      lines.push(`${side.name} 已被攻擊擊倒，守衛效果未能復活。`);
    }
  }
  if (specs.some(sp => sp.kind === 'loseForeseeRedraw') && event.type === 'foresee') {
    const discarded = side.hand.slice(0, Math.min(2, side.hand.length));
    side = { ...side, hand: side.hand.slice(discarded.length), discard: [...side.discard, ...discarded] };
    const allowed = CARD_TYPE_KEYS.filter(t => !nextBans.includes(t));
    const res = drawCards(side, 2, allowed.length ? allowed : null);
    side = res.side;
    lines.push(`${side.name} 舊預言家效果觸發：棄 ${discarded.length} 張，抽 ${res.drawn.length} 張可用類型牌。`);
  }
  if (hasAttr(move, 'foreseeLosePeek') && event.type === 'foresee') {
    const peekCount = sumAttr(move, 'foreseeLosePeek');
    if (side.name === '冒險者團') {
      pendingChoice = chainChoice(pendingChoice, makePeekChoice(peekCount, '預知落敗效果'));
      lines.push(`${side.name} 預言家觸發：可查看怪物 ${peekCount} 張手牌。`);
    } else {
      lines.push(`${side.name} 預言家觸發：查看玩家手牌情報。`);
    }
  }
  if (hasAttr(move, 'loseControlAdjust') && event.type === 'control') {
    const amount = maxAttr(move, 'loseControlAdjust') || 1;
    if (side.name === '冒險者團') {
      pendingChoice = {
        type: 'adjustCard',
        title: '魔術師觸發：選擇要增減的牌',
        text: `你輸掉操控事件，可選擇場上一張已打出的牌 +${amount} 或 -${amount}。`,
        amount,
        allowBothSides: true,
        source: 'magician'
      };
      lines.push(`${side.name} 魔術師觸發：請選擇場上一張牌增減 ${amount} 點。`);
    } else {
      const adj = adjustPlayed(side, amount, true);
      side = adj.side;
      lines.push(`${side.name} 魔術師觸發：${adj.text}`);
    }
  }
  if (hasAttr(move, 'clashLoseHeal') && event.type === 'clash') {
    const heal = sumAttr(move, 'clashLoseHeal');
    if (side.hp > 0 && heal > 0) {
      side = { ...side, hp: clamp(side.hp + heal, 0, 100) };
      lines.push(`${side.name} 守衛效果觸發：相殺落敗，回復 ${heal} HP。`);
    }
  }
  return { side, lines, pendingChoice };
}
function postSpecials(side, move) {
  let lines = [];
  if (!moveSpecials(move).length) return { side, lines };
  // 比較牌型後效果固定在事件傷害與輸掉事件處理之後。
  // 若角色已經被打到 0 HP，回血不會復活。
  if (side.hp <= 0) {
    if (hasAttr(move, 'postHeal') || hasAttr(move, 'postDraw')) {
      lines.push(`${side.name} 已倒下，支援/抽牌效果未能生效。`);
    }
    return { side, lines };
  }
  if (hasAttr(move, 'postHeal')) {
    const heal = sumAttr(move, 'postHeal');
    side = { ...side, hp: clamp(side.hp + heal, 0, 100) };
    lines.push(`${side.name} 支援效果觸發：受到本回合傷害後，回復 ${heal} HP。`);
  }
  if (hasAttr(move, 'postDraw')) {
    const drawN = sumAttr(move, 'postDraw');
    const res = drawCards(side, drawN);
    side = res.side;
    lines.push(`${side.name} 抽牌效果觸發：抽 ${res.drawn.length} 張牌。`);
  }
  return { side, lines };
}
function resolveRound(state, pMove, mMove) {
  const event = state.event;
  let player = state.player;
  let monster = state.monster;
  let lines = [];
  let nextBans = [];
  let pendingChoice = null;
  const pScore = scoreValue(pMove, mMove);
  const mScore = scoreValue(mMove, pMove);
  lines.push(`B 揭露點數：玩家 ${cardText(pMove.card)} = ${pScore}；怪物 ${cardText(mMove.card)} = ${mScore}。`);
  lines.push(`C 揭露冒險者：玩家投入 ${investCount(pMove)} 隻 / 攻擊力 ${investPower(pMove)}；怪物投入 ${investCount(mMove)} 隻 / 攻擊力 ${investPower(mMove)}。`);
  if (moveSpecials(pMove).length) lines.push(`玩家投入冒險者：${moveSummary(pMove)}`);
  if (moveSpecials(mMove).length) lines.push(`怪物投入冒險者：${moveSummary(mMove)}`);
  const pPlus = sumAttr(pMove, 'scorePlus'), mPlus = sumAttr(mMove, 'scorePlus');
  const pMinus = sumAttr(pMove, 'oppMinus'), mMinus = sumAttr(mMove, 'oppMinus');
  if (pPlus) lines.push(`D 玩家賭徒效果：點數 +${pPlus}。`);
  if (mPlus) lines.push(`D 怪物賭徒效果：點數 +${mPlus}。`);
  if (pMinus) lines.push(`D 玩家詐術師效果：怪物點數 -${pMinus}。`);
  if (mMinus) lines.push(`D 怪物詐術師效果：玩家點數 -${mMinus}。`);
  player = removePlayedCard(player, pMove.card);
  monster = removePlayedCard(monster, mMove.card);
  player = applyInvestCd(player, pMove);
  monster = applyInvestCd(monster, mMove);

  let winner = 'tie';
  if (pScore > mScore) winner = 'player';
  if (mScore > pScore) winner = 'monster';
  lines.push(`E 比較結果：${winner === 'player' ? '玩家勝' : winner === 'monster' ? '怪物勝' : '平手'}。`);

  const executeDamage = (who, multiplier) => {
    const move = who === 'player' ? pMove : mMove;
    const boost = (event.type === 'attack' && winner === who) ? maxAttr(move, 'damageBoost') : 0;
    let dmg = Math.round(investPower(move) * multiplier * (1 + boost / 100));
    if (dmg <= 0) return;
    if (who === 'player') monster = { ...monster, hp: clamp(monster.hp - dmg, 0, 100) };
    else player = { ...player, hp: clamp(player.hp - dmg, 0, 100) };
    lines.push(`${who === 'player' ? '玩家' : '怪物'}造成 ${dmg} 傷害${boost ? `（戰士 +${boost}%）` : ''}。`);
  };

  if (event.type === 'clash') {
    const playerReduce = winner === 'player' ? maxAttr(pMove, 'clashWinReduce') : 0;
    const monsterReduce = winner === 'monster' ? maxAttr(mMove, 'clashWinReduce') : 0;
    executeDamage('player', Math.max(0, 1 - monsterReduce / 100));
    executeDamage('monster', Math.max(0, 1 - playerReduce / 100));
    lines.push(`相殺事件：雙方同時造成傷害${playerReduce || monsterReduce ? '，守衛減傷已套用' : ''}。`);
  } else if (winner !== 'tie') {
    const who = winner;
    const move = who === 'player' ? pMove : mMove;
    const count = investCount(move);
    if (event.id === 'bigAttack') executeDamage(who, 2);
    if (event.id === 'smallAttack') executeDamage(who, 1);
    if (event.id === 'control') {
      const controlExtra = maxAttr(move, 'controlWinAdjust');
      const controlAmount = count + controlExtra;
      if (who === 'player') {
        if (controlAmount > 0 && (player.played.length || monster.played.length)) {
          pendingChoice = {
            type: 'adjustCard',
            title: '操控事件成功：選擇增減牌點數',
            text: `你可選擇場上一張已打出的牌，將其點數 +${controlAmount} 或 -${controlAmount}。`,
            amount: controlAmount,
            allowBothSides: true,
            source: 'control'
          };
          lines.push(`玩家操控成功：請選擇要增減的牌（幅度 ${controlAmount}）。`);
        } else {
          lines.push('玩家操控成功，但沒有可操控牌或沒有投入冒險者。');
        }
      } else {
        const targetSelf = monster.played.length && (!player.played.length || Math.random() > 0.35);
        if (targetSelf) { const adj = adjustPlayed(monster, controlAmount, true); monster = adj.side; lines.push(`怪物操控自己牌：${adj.text}`); }
        else { const adj = adjustPlayed(player, controlAmount, false); player = adj.side; lines.push(`怪物操控玩家牌：${adj.text}`); }
      }
    }
    if (event.id === 'foresee') {
      if (who === 'player') {
        if (count > 0) {
          pendingChoice = chainChoice(pendingChoice, {
            type: 'banEvents',
            title: '預知事件成功：選擇封鎖事件類型',
            text: `請選擇最多 ${count} 種事件類型，下回合不會出現。`,
            count,
            selected: []
          });
          lines.push(`玩家預知成功：請選擇最多 ${count} 種下回合不會出現的事件。`);
        } else {
          lines.push('玩家預知成功，但沒有投入冒險者，因此不封鎖事件。');
        }
        const peekCount = sumAttr(pMove, 'foreseeWinPeek');
        if (peekCount > 0) {
          pendingChoice = chainChoice(pendingChoice, makePeekChoice(peekCount, '預知勝利效果'));
          lines.push(`玩家預言家觸發：可查看怪物 ${peekCount} 張手牌。`);
        }
      } else {
        nextBans = chooseBansForSide(monster, count);
        lines.push(`怪物預知成功：下回合不會出現 ${nextBans.map(t => EVENT_TYPES[t].name).join('、') || '無'}。`);
        const peekCount = sumAttr(mMove, 'foreseeWinPeek');
        if (peekCount > 0) lines.push(`怪物預言家觸發：查看玩家手牌情報。`);
      }
    }
  }

  // F：處理「若輸掉事件」特殊冒險者。
  if (winner === 'player') {
    const res = loseSpecials(monster, mMove, event, nextBans); monster = res.side; lines.push(...res.lines); if (res.pendingChoice) pendingChoice = res.pendingChoice;
  } else if (winner === 'monster') {
    const res = loseSpecials(player, pMove, event, nextBans); player = res.side; lines.push(...res.lines); if (res.pendingChoice) pendingChoice = res.pendingChoice;
  }

  // 輸攻擊事件但仍造成少量傷害的戰士屬性。
  if (winner === 'player' && event.type === 'attack') {
    const ratio = maxAttr(mMove, 'loseAttackDamage');
    if (ratio && monster.hp > 0) {
      const dmg = Math.round(investPower(mMove) * ratio);
      player = { ...player, hp: clamp(player.hp - dmg, 0, 100) };
      lines.push(`怪物戰士敗戰反擊：仍造成 ${dmg} 傷害。`);
    }
  } else if (winner === 'monster' && event.type === 'attack') {
    const ratio = maxAttr(pMove, 'loseAttackDamage');
    if (ratio && player.hp > 0) {
      const dmg = Math.round(investPower(pMove) * ratio);
      monster = { ...monster, hp: clamp(monster.hp - dmg, 0, 100) };
      lines.push(`玩家戰士敗戰反擊：仍造成 ${dmg} 傷害。`);
    }
  }

  // G：處理「比較牌型後」特殊冒險者。
  let pr = postSpecials(player, pMove); player = pr.side; lines.push(...pr.lines);
  let mr = postSpecials(monster, mMove); monster = mr.side; lines.push(...mr.lines);
  return { ...state, player, monster, reveal: { pMove, mMove, pScore, mScore, winner, lines }, nextEventBans: nextBans, pendingChoice, phase: 'after', log: [...lines, ...state.log].slice(0, 18) };
}
function handType(cards) {
  if (!cards.length) return { key: 'high', label: '無牌', rank: 0, score: [0] };
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const groups = Object.entries(counts).map(([r, c]) => ({ r: +r, c })).sort((a, b) => b.c - a.c || b.r - a.r);
  const flush = cards.length >= 5 && new Set(cards.map(c => c.type)).size === 1;
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (cards.length >= 5) {
    for (let h = 10; h >= 5; h--) {
      if ([h, h - 1, h - 2, h - 3, h - 4].every(x => unique.includes(x))) { straightHigh = h; break; }
    }
  }
  if (flush && straightHigh) return { key: 'straightFlush', label: '同花順', rank: 9, score: [straightHigh] };
  if (groups[0]?.c === 4) return { key: 'quads', label: '四條', rank: 8, score: [groups[0].r] };
  if (groups[0]?.c === 3 && groups[1]?.c >= 2) return { key: 'fullHouse', label: '葫蘆', rank: 7, score: [groups[0].r, groups[1].r] };
  if (flush) return { key: 'flush', label: '同花', rank: 6, score: ranks };
  if (straightHigh) return { key: 'straight', label: '順子', rank: 5, score: [straightHigh] };
  if (groups[0]?.c === 3) return { key: 'trips', label: '三條', rank: 4, score: [groups[0].r] };
  if (groups[0]?.c === 2 && groups[1]?.c === 2) return { key: 'twoPair', label: '兩對', rank: 3, score: [Math.max(groups[0].r, groups[1].r), Math.min(groups[0].r, groups[1].r)] };
  if (groups[0]?.c === 2) return { key: 'pair', label: '一對', rank: 2, score: [groups[0].r] };
  return { key: 'high', label: '高牌', rank: 1, score: ranks };
}
function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  const n = Math.max(a.score.length, b.score.length);
  for (let i = 0; i < n; i++) {
    const x = a.score[i] || 0, y = b.score[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}
function handPreview(cards) {
  if (!cards || !cards.length) return { label: '無牌', dmg: 0 };
  const h = handType(cards || []);
  const dmg = HAND_DAMAGE[h.key] || 0;
  return { label: h.label || '無牌', dmg };
}
function finalResolve(st) {
  const ph = handType(st.player.played);
  const mh = handType(st.monster.played);
  const cmp = compareHands(ph, mh);
  let player = st.player, monster = st.monster;
  const lines = [`玩家最終素材：${player.played.map(cardText).join('、') || '無牌'}`, `怪物最終素材：${monster.played.map(cardText).join('、') || '無牌'}`];
  if (cmp > 0) {
    const dmg = HAND_DAMAGE[ph.key] || 0;
    monster = { ...monster, hp: clamp(monster.hp - dmg, 0, 100) };
    lines.push(`最終牌型：玩家 ${ph.label} 勝，造成 ${dmg} 傷害。`);
  } else if (cmp < 0) {
    const dmg = HAND_DAMAGE[mh.key] || 0;
    player = { ...player, hp: clamp(player.hp - dmg, 0, 100) };
    lines.push(`最終牌型：怪物 ${mh.label} 勝，造成 ${dmg} 傷害。`);
  } else lines.push(`最終牌型平手：${ph.label}。`);
  const over = monster.hp <= 0 ? '勝利！怪物倒下。' : player.hp <= 0 ? '失敗，冒險者團潰敗。' : null;
  return { ...st, player, monster, phase: 'final', reveal: { final: true, ph, mh, lines, playerPlayed: player.played, monsterPlayed: monster.played }, gameOver: over, log: [...lines, ...st.log].slice(0, 18) };
}
function makeNewGame(st) {
  const ns = initial(st.roster || null);
  ns.player.hp = st.player.hp;
  ns.monster.hp = st.monster.hp;
  ns.phase = 'round';
  ns.log = [`新一局開始，保留 HP：玩家 ${ns.player.hp} / 怪物 ${ns.monster.hp}。`];
  return ns;
}


function adjustSpecificPlayed(side, playedId, delta) {
  let changed = false;
  const played = side.played.map(c => {
    if ((c.playedId || c.id) !== playedId) return c;
    changed = true;
    return { ...c, rank: clamp(c.rank + delta, 1, 10), modified: true };
  });
  return { side: { ...side, played }, changed };
}
function continueAfterPending(st) {
  return { ...st, pendingChoice: null };
}
function makePeekChoice(count, source = '預言家') {
  const c = Math.max(0, Math.floor(Number(count || 0)));
  if (c <= 0) return null;
  return {
    type: 'peekHand',
    title: `${source}：查看怪物手牌`,
    text: `選擇怪物 ${c} 張手牌翻開，會持續揭露到下個回合結束。`,
    count: c,
    selected: [],
  };
}
function chainChoice(first, next) {
  if (!next) return first || null;
  if (!first) return next;
  return { ...first, nextChoice: chainChoice(first.nextChoice || null, next) };
}


function App() {
  const [recruit, setRecruit] = useState(() => makeRecruitState('tutorial'));
  const [lineup, setLineup] = useState(null);
  const [s, setS] = useState(initial());
  const playerLegal = useMemo(() => s.event ? legalCards(s.player.hand, s.event) : [], [s.player.hand, s.event]);
  const mustPlay = s.event?.requiredCardType && playerLegal.length > 0;
  const totalInvest = (s.player.selectedSpecials?.length || 0);
  const maxWhite = 0;
  function enterRecruit() { setLineup(null); setS(initial()); setRecruit(makeRecruitState('idle')); }
  function start(roster = lineup) {
    const base = initial(roster);
    setLineup(roster);
    setS(st => nextRound({ ...base, phase: 'round' }));
  }
  function nextRound(st = s) {
    const keepMonsterHandReveal = st.monsterHandReveal && !(st.round >= st.monsterHandReveal.untilRound);
    let player = tickCd(st.player);
    let monster = tickCd(st.monster);
    if (st.round > 0) {
      player = drawCards(player, 2).side;
      monster = drawCards(monster, 2).side;
    }
    const round = st.round + 1;
    if (round > 5) return finalResolve({ ...st, player, monster });
    const event = getEvent(st.nextEventBans || []);
    return { ...st, player: { ...player, selectedCard: null, selectedWhite: 0, selectedSpecials: [] }, monster, round, event, phase: 'select', reveal: null, nextEventBans: [], monsterHandReveal: keepMonsterHandReveal ? st.monsterHandReveal : null, log: [`第 ${round}/5 回合：${event.name}`, ...st.log].slice(0, 18) };
  }
  function chooseCard(card) {
    if (s.phase !== 'select') return;
    // 有指定牌型的事件（例如大攻擊/小攻擊）只能出指定類型的牌。
    // 即使手上沒有指定類型，也不能拿其他類型牌頂替；此時應直接不出牌並確認。
    if (s.event?.requiredCardType && card.type !== s.event.requiredCardType) return;
    setS(st => ({ ...st, player: { ...st.player, selectedCard: st.player.selectedCard?.id === card.id ? null : card } }));
  }
  function setWhite(n) { setS(st => ({ ...st, player: { ...st.player, selectedWhite: clamp(n, 0, maxWhite) } })); }
  function cycleWhite() {
    if (s.phase !== 'select') return;
    setS(st => {
      const max = Math.max(0, Math.min(st.event?.max || 0, st.player.white.ready) - (st.player.selectedSpecial ? 1 : 0));
      const next = max <= 0 ? 0 : (st.player.selectedWhite >= max ? 0 : st.player.selectedWhite + 1);
      return { ...st, player: { ...st.player, selectedWhite: next } };
    });
  }
  function chooseSpecial(sp) {
    if (s.phase !== 'select' || sp.cd > 0) return;
    setS(st => {
      const current = st.player.selectedSpecials || [];
      const exists = current.some(x => x.uid === sp.uid);
      const next = exists ? current.filter(x => x.uid !== sp.uid) : (current.length >= st.event.max ? current : [...current, sp]);
      return { ...st, player: { ...st.player, selectedSpecials: next, selectedWhite: 0 } };
    });
  }
  function confirm() {
    setS(st => {
      const legal = legalCards(st.player.hand, st.event);
      if (st.event.requiredCardType && st.player.selectedCard && st.player.selectedCard.type !== st.event.requiredCardType) return { ...st, player: { ...st.player, selectedCard: null }, log: ['此事件只能出指定類型的牌，已取消錯誤出牌。', ...st.log].slice(0, 18) };
      if (st.event.requiredCardType && legal.length && !st.player.selectedCard) return { ...st, log: ['你有本事件指定類型的牌，必須出一張。', ...st.log].slice(0, 18) };
      const pMove = { card: st.player.selectedCard, white: 0, specials: st.player.selectedSpecials || [], special: (st.player.selectedSpecials || [])[0] || null };
      if (investCount(pMove) > st.event.max) return { ...st, log: [`本事件最多投入 ${st.event.max} 隻冒險者。`, ...st.log].slice(0, 18) };
      const mMove = chooseMonsterMove(st.monster, st.player.hand, st.event);
      let ns = resolveRound(st, pMove, mMove);
      if (ns.player.hp <= 0 || ns.monster.hp <= 0) return { ...ns, phase: 'result', gameOver: ns.monster.hp <= 0 ? '勝利！怪物倒下。' : '失敗，冒險者團潰敗。' };
      if (ns.round >= 5) {
        // 第五回合的事件效果已執行完畢；若沒有需要玩家選擇的後續效果，直接進入最終牌型動畫。
        // 若有操控/預知/魔術師等選擇，等玩家選完後由 applyAdjustChoice / applyBanChoice 自動進入最終牌型。
        if (ns.pendingChoice) {
          return {
            ...ns,
            phase: 'after',
            finalAfterPending: true,
            log: ['第五回合事件效果已執行，完成特殊選擇後自動進入最終牌型比較。', ...ns.log].slice(0, 18)
          };
        }
        return finalResolve({
          ...ns,
          log: ['第五回合事件效果已完整執行，進入最終牌型比較。', ...ns.log].slice(0, 18)
        });
      }
      return ns;
    });
  }

  function applyAdjustChoice(targetSide, playedId, direction) {
    setS(st => {
      const pc = st.pendingChoice;
      if (!pc || pc.type !== 'adjustCard') return st;
      const delta = (direction === 'plus' ? 1 : -1) * pc.amount;
      let player = st.player;
      let monster = st.monster;
      let changed = false;
      if (targetSide === 'player') {
        const res = adjustSpecificPlayed(player, playedId, delta);
        player = res.side; changed = res.changed;
      } else {
        const res = adjustSpecificPlayed(monster, playedId, delta);
        monster = res.side; changed = res.changed;
      }
      if (!changed) return st;
      const line = `${pc.source === 'control' ? '操控事件' : '魔術師'}：${targetSide === 'player' ? '玩家' : '怪物'}一張牌 ${delta > 0 ? '+' : ''}${delta} 點。`;
      if (pc.nextChoice) return { ...st, player, monster, pendingChoice: pc.nextChoice, log: [line, ...st.log].slice(0, 18) };
      const updated = { ...st, player, monster, pendingChoice: null, finalAfterPending: false, log: [line, ...st.log].slice(0, 18) };
      if (st.finalAfterPending || st.round >= 5) {
        return finalResolve({ ...updated, log: ['特殊選擇完成，進入最終牌型比較。', ...updated.log].slice(0, 18) });
      }
      return updated;
    });
  }
  function applyBanChoice(selected) {
    setS(st => {
      const pc = st.pendingChoice;
      if (!pc || pc.type !== 'banEvents') return st;
      const bans = selected.slice(0, pc.count);
      const line = `玩家預知選擇：下回合不會出現 ${bans.map(t => EVENT_TYPES[t].name).join('、') || '無'}。`;
      if (pc.nextChoice) return { ...st, nextEventBans: bans, pendingChoice: pc.nextChoice, log: [line, ...st.log].slice(0, 18) };
      const updated = { ...st, nextEventBans: bans, pendingChoice: null, finalAfterPending: false, log: [line, ...st.log].slice(0, 18) };
      if (st.finalAfterPending || st.round >= 5) {
        return finalResolve({ ...updated, log: ['預知選擇完成，進入最終牌型比較。', ...updated.log].slice(0, 18) });
      }
      return updated;
    });
  }
  function applyPeekChoice(selectedIds) {
    setS(st => {
      const pc = st.pendingChoice;
      if (!pc || pc.type !== 'peekHand') return st;
      const ids = (selectedIds || []).slice(0, pc.count);
      const line = `預言家查看：怪物 ${ids.length} 張手牌已揭露，持續到下個回合結束。`;
      if (pc.nextChoice) return { ...st, monsterHandReveal: { ids, untilRound: st.round + 1 }, pendingChoice: pc.nextChoice, log: [line, ...st.log].slice(0, 18) };
      const updated = { ...st, monsterHandReveal: { ids, untilRound: st.round + 1 }, pendingChoice: null, finalAfterPending: false, log: [line, ...st.log].slice(0, 18) };
      if (st.finalAfterPending || st.round >= 5) {
        return finalResolve({ ...updated, log: ['手牌查看完成，進入最終牌型比較。', ...updated.log].slice(0, 18) });
      }
      return updated;
    });
  }

  // 保險機制：第五回合事件結算完後，不依賴任何按鈕或區塊高度，
  // 直接自動切到最終牌型比較。這可避免 UI 改版後 centerControls 被遮住而看不到最終比較。
  useEffect(() => {
    if (s.phase === 'after' && s.round >= 5 && !s.pendingChoice && !s.reveal?.final) {
      const timer = window.setTimeout(() => {
        setS(st => {
          if (st.phase === 'after' && st.round >= 5 && !st.pendingChoice && !st.reveal?.final) {
            return finalResolve({ ...st, log: ['第五回合已結算，強制進入最終牌型比較。', ...st.log].slice(0, 18) });
          }
          return st;
        });
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [s.phase, s.round, s.pendingChoice, s.reveal?.final]);

  const stepText = s.pendingChoice ? '完成特殊選擇' : s.phase === 'select' ? (s.player.selectedCard ? '投入冒險者並確認' : '選擇手牌出牌') : s.phase === 'finalPending' ? '準備最終牌型' : s.phase === 'final' ? '進入下一局' : '觀看結算';
  const requiredName = s.event?.requiredCardType ? CARD_TYPES[s.event.requiredCardType].name : '任意';
  const centerHeadline = s.reveal?.final
    ? '最終牌型比較'
    : s.reveal?.winner === 'player'
      ? '玩家贏得事件'
      : s.reveal?.winner === 'monster'
        ? '怪物贏得事件'
        : s.reveal?.winner === 'tie'
          ? '本回合平手'
          : stepText;

  return <div className="app">
    {recruit.stage === 'tutorial' && <TutorialScreen onDone={() => setRecruit(makeRecruitState('idle'))} />}
    {recruit.stage !== 'battle' && recruit.stage !== 'tutorial' && <RecruitmentScreen recruit={recruit} setRecruit={setRecruit} onStart={(roster) => { setRecruit(r => ({ ...r, stage: 'battle' })); start(roster); }} />}
    {recruit.stage === 'battle' && s.phase === 'start' && <div className="startScreen">
      <div className="start card">
        <h1>事件牌局戰</h1>
        <p>16:9 三欄式暗黑牌局介面。左怪物、右玩家，中間只呈現事件與本回合揭曉。</p>
        <button className="primaryBtn" onClick={start}>開始戰鬥</button>
      </div>
    </div>}
    {s.phase !== 'start' && <>
      <button className="restartMini" onClick={enterRecruit}>重新招募</button>
      <div className="gameFrame">
        <aside className="sideCol monsterCol">
          <CombatantPanel side={s.monster} enemy revealedHandIds={s.monsterHandReveal?.ids || []} />
        </aside>

        <main className="centerCol">
          <section className="eventStage">
            <div className="roundBadge">第 {s.round}/5 回合</div>
            {s.event && <EventCard event={s.event} bans={s.nextEventBans} reveal={s.reveal} />}
            {s.pendingChoice && <ChoicePanel key={`${s.pendingChoice?.type || 'none'}-${s.pendingChoice?.title || ''}`} choice={s.pendingChoice} player={s.player} monster={s.monster} onAdjust={applyAdjustChoice} onBan={applyBanChoice} onPeek={applyPeekChoice} />}
          </section>

          <section className="duelStage">
            <BattleDuelArea
              side="monster"
              label="怪物"
              move={s.reveal?.mMove}
              score={s.reveal?.mScore}
              maxSlots={s.event?.max || 0}
              hidden={!s.reveal}
              damage={damageTo(s.reveal, 'monster')}
              result={s.reveal?.winner === 'player' ? 'hit' : s.reveal?.winner === 'monster' ? 'win' : ''}
            />
            <BattleDuelArea
              side="player"
              label="玩家"
              move={s.reveal?.pMove || { card: s.player.selectedCard, white: 0, specials: s.player.selectedSpecials || [], special: (s.player.selectedSpecials || [])[0] || null }}
              maxSlots={s.event?.max || 0}
              score={s.reveal?.pScore}
              hidden={false}
              damage={damageTo(s.reveal, 'player')}
              result={s.reveal?.winner === 'monster' ? 'hit' : s.reveal?.winner === 'player' ? 'win' : ''}
            />
          </section>

          <div className="centerControls">
            {(s.phase === 'after' || s.phase === 'finalPending' || s.phase === 'final' || s.phase === 'result') && <Result reveal={s.reveal} phase={s.phase} gameOver={s.gameOver} pendingChoice={s.pendingChoice} onNext={() => setS(st => nextRound(st))} onFinal={() => setS(st => finalResolve(st))} onNextGame={() => setS(st => nextRound(makeNewGame(st)))} onRestart={enterRecruit} />}
          </div>
        </main>

        <aside className="sideCol playerCol">
          <CombatantPanel
            side={s.player}
            selectedSpecials={s.player.selectedSpecials || []}
            selectedWhite={0}
            onSpecial={chooseSpecial}
            onWhite={null}
            selectable={s.phase === 'select'}
            maxWhite={0}
          />
          <section className="handZone">
            <div className="zoneTitle"><b>玩家手牌</b><span>{s.player.hand.length}/10</span></div>
            <div className="handSlots">{Array.from({ length: 10 }).map((_, i) => {
              const c = s.player.hand[i];
              if (!c) return <div key={i} className="handSlot emptySlot">空</div>;
              const legal = !s.event?.requiredCardType || c.type === s.event.requiredCardType;
              return <button key={c.id} onClick={() => chooseCard(c)} disabled={s.phase !== 'select' || !legal} className={(s.player.selectedCard?.id === c.id ? 'sel ' : '') + (legal ? 'legal ' : 'dim ') + 'handSlot'}><Card c={c} /></button>;
            })}</div>
          </section>
          <section className="actionBar">
            <button className="primaryBtn" onClick={confirm} disabled={s.phase !== 'select'}>確認出擊</button>
            <div className="hintLine">{s.phase === 'select' ? (s.player.selectedCard ? '選擇冒險者後確認' : '先選一張可用手牌') : '等待結算'}</div>
          </section>
        </aside>
      </div>
      {(s.phase === 'final' || s.reveal?.final) && <FinalOverlay reveal={s.reveal} gameOver={s.gameOver} onNextGame={() => setS(st => nextRound(makeNewGame(st)))} onRestart={enterRecruit} />}
      {s.phase === 'after' && s.round >= 5 && !s.pendingChoice && !s.reveal?.final && <div className="finalOverlay finalSafety"><div className="finalModal card"><div className="finalBanner">正在進入最終牌型比較…</div><button className="primaryBtn" onClick={() => setS(st => finalResolve(st))}>立即顯示最終牌型比較</button></div></div>}
    </>}
  </div>;

}

const TUTORIAL_EVENTS = {
  smallAttack: EVENTS.find(e => e.id === 'smallAttack'),
  control: EVENTS.find(e => e.id === 'control'),
  bigAttack: EVENTS.find(e => e.id === 'bigAttack'),
};
const TUTORIAL_CARDS = {
  pAttack1: { id: 'tut-p-atk-1', type: 'attack', rank: 7 },
  pAttack2: { id: 'tut-p-atk-2', type: 'attack', rank: 8 },
  pForesee: { id: 'tut-p-for-1', type: 'foresee', rank: 4 },
  pAttack3: { id: 'tut-p-atk-3', type: 'attack', rank: 6 },
  mAttack1: { id: 'tut-m-atk-1', type: 'attack', rank: 3 },
  mControl: { id: 'tut-m-ctrl-1', type: 'control', rank: 6 },
  mAttack2: { id: 'tut-m-atk-2', type: 'attack', rank: 2 },
};
const TUTORIAL_ADVENTURERS = [
  { id: 'tut-a-1', name: '訓練劍士', icon: '🧍', attackPower: 5, desc: '攻擊力 5' },
  { id: 'tut-a-2', name: '訓練槍兵', icon: '🧍', attackPower: 5, desc: '攻擊力 5' },
  { id: 'tut-a-3', name: '訓練斥候', icon: '🧍', attackPower: 5, desc: '攻擊力 5' },
];
const TUTORIAL_TOTAL_STEPS = 10;

function TutorialScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(1);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedAdv, setSelectedAdv] = useState([]);
  const [playerPlayed, setPlayerPlayed] = useState([]);
  const [dummyPlayed, setDummyPlayed] = useState([]);
  const [reveal, setReveal] = useState(null);
  const [msg, setMsg] = useState('');
  const [monsterHp, setMonsterHp] = useState(100);

  const event = round === 1 ? TUTORIAL_EVENTS.smallAttack : round === 2 ? TUTORIAL_EVENTS.control : TUTORIAL_EVENTS.bigAttack;
  const hand = round === 1
    ? [TUTORIAL_CARDS.pAttack1, TUTORIAL_CARDS.pForesee, { id: 'tut-p-ctrl-muted', type: 'control', rank: 2 }]
    : round === 2
      ? [{ id: 'tut-p-atk-r2', type: 'attack', rank: 5 }, { id: 'tut-p-for-r2', type: 'foresee', rank: 3 }, { id: 'tut-p-atk-r2b', type: 'attack', rank: 4 }]
      : [TUTORIAL_CARDS.pAttack2, TUTORIAL_CARDS.pAttack3, { id: 'tut-p-for-r3', type: 'foresee', rank: 5 }];

  const progress = Math.min(TUTORIAL_TOTAL_STEPS, step + 1);
  const selectedPower = selectedAdv.reduce((n, a) => n + a.attackPower, 0);

  const goRound2 = () => {
    setRound(2);
    setSelectedCard(null);
    setSelectedAdv([]);
    setReveal(null);
    setMsg('');
    setStep(4);
  };
  const goRound3 = () => {
    setRound(3);
    setSelectedCard(null);
    setSelectedAdv([]);
    setReveal(null);
    setMsg('');
    setStep(7);
  };
  const chooseTutorialCard = (card) => {
    setMsg('');
    if (round === 1 && step === 1) {
      if (card.type !== 'attack') { setMsg('這回合需要攻擊牌喔！'); return; }
      setSelectedCard(card);
      setStep(2);
      return;
    }
    if (round === 3 && step === 8) {
      if (card.type !== 'attack') { setMsg('最後一回合是攻擊事件，請出攻擊牌。'); return; }
      setSelectedCard(card);
      return;
    }
  };
  const toggleAdv = (adv) => {
    if (!((round === 1 && step === 2) || (round === 3 && step === 8))) return;
    setSelectedAdv(prev => prev.some(a => a.id === adv.id) ? prev.filter(a => a.id !== adv.id) : prev.length >= event.max ? prev : [...prev, adv]);
  };
  const finishRound1 = () => {
    if (!selectedCard || selectedAdv.length < 1) return;
    const dmg = Math.max(5, selectedPower);
    setPlayerPlayed([{ ...selectedCard, playedId: 'tut-player-r1' }]);
    setDummyPlayed([{ ...TUTORIAL_CARDS.mAttack1, playedId: 'tut-monster-r1' }]);
    setMonsterHp(h => Math.max(0, h - dmg));
    setReveal({ playerCard: selectedCard, monsterCard: TUTORIAL_CARDS.mAttack1, pScore: selectedCard.rank, mScore: TUTORIAL_CARDS.mAttack1.rank, winner: 'player', damage: dmg });
    setStep(3);
  };
  const noCardRound2 = () => {
    const changed = playerPlayed.map((c, i) => i === 0 ? { ...c, oldRank: c.rank, rank: Math.max(1, c.rank - 2), modified: true } : c);
    setPlayerPlayed(changed);
    setDummyPlayed(prev => [...prev, { ...TUTORIAL_CARDS.mControl, playedId: 'tut-monster-r2' }]);
    setSelectedCard(null);
    setReveal({ playerCard: null, monsterCard: TUTORIAL_CARDS.mControl, pScore: 0, mScore: TUTORIAL_CARDS.mControl.rank, winner: 'monster', controlText: '訓練假人將你的攻擊牌 -2 點' });
    setStep(6);
  };
  const finishRound3 = () => {
    if (!selectedCard || selectedAdv.length < 1) { setMsg('請先出攻擊牌並投入至少 1 隻冒險者。'); return; }
    const dmg = Math.max(5, selectedPower * 2);
    setPlayerPlayed(prev => [...prev, { ...selectedCard, playedId: 'tut-player-r3' }]);
    setDummyPlayed(prev => [...prev, { ...TUTORIAL_CARDS.mAttack2, playedId: 'tut-monster-r3' }]);
    setMonsterHp(h => Math.max(0, h - dmg));
    setReveal({ playerCard: selectedCard, monsterCard: TUTORIAL_CARDS.mAttack2, pScore: selectedCard.rank, mScore: TUTORIAL_CARDS.mAttack2.rank, winner: 'player', damage: dmg });
    setStep(9);
  };

  const highlightClass = (target) => {
    if ((target === 'event' && [0,4,7].includes(step)) ||
        (target === 'hand' && [1,5,8].includes(step)) ||
        (target === 'adventurer' && [2,8].includes(step)) ||
        (target === 'duel' && [3,6].includes(step)) ||
        (target === 'final' && step === 9)) return 'tutorialFocus';
    return '';
  };
  const bubble = (() => {
    if (step === 0) return { title: '第1回合：事件卡', text: '這是本回合的事件卡。事件類型是攻擊，你需要出一張攻擊牌。', action: () => setStep(1), actionText: '我知道了' };
    if (step === 1) return { title: '選擇手牌', text: '這些是你的手牌。紅色的是攻擊牌，符合本回合事件。點擊一張攻擊牌出牌。', actionText: '請點擊攻擊牌' };
    if (step === 2) return { title: '投入冒險者', text: '你可以投入冒險者來增加攻擊力。攻擊力越高，贏了之後造成的傷害越多。點擊 1～2 隻冒險者投入。', action: finishRound1, actionText: selectedAdv.length ? '確認出擊' : '先投入冒險者', disabled: !selectedAdv.length };
    if (step === 3) return { title: '你贏得本回合', text: '你的點數比對手高，你贏得了本回合！攻擊事件的勝者會對對手造成傷害。', action: goRound2, actionText: '我知道了' };
    if (step === 4) return { title: '第2回合：沒有對應牌', text: '這回合是操控事件，需要出操控牌（紫色）。如果你手上沒有，可以不出牌，但點數會是 0。', action: () => setStep(5), actionText: '我知道了' };
    if (step === 5) return { title: '選擇不出牌', text: '你沒有操控牌，可以選擇不出牌。點數視為 0，但仍然可以投入冒險者。', action: noCardRound2, actionText: '不出牌' };
    if (step === 6) return { title: '輸掉操控事件', text: '這回合你輸了。操控事件的勝者可以調整場上已打出的牌點數。這會影響最終牌型！', action: goRound3, actionText: '我知道了' };
    if (step === 7) return { title: '第3回合：投入策略', text: '這是最後一回合。你可以選擇多投入幾隻冒險者來提高攻擊力，但投入的冒險者會進入 CD，下一回合無法使用。', action: () => setStep(8), actionText: '我知道了' };
    if (step === 8) return { title: '實戰一次', text: '出一張攻擊牌，並自由投入冒險者。準備好後按確認出擊。', action: finishRound3, actionText: '確認出擊', disabled: !selectedCard || selectedAdv.length < 1 };
    return { title: '最終牌型結算', text: '5回合結束後（教學只有3回合），雙方用已打出的牌比較最終牌型。牌型越強，造成的額外傷害越大！', action: onDone, actionText: '開始招募' };
  })();

  return <div className="tutorialScreen">
    <div className="tutorialTopHud">
      <b>教學 第 {progress} 步 / 共 {TUTORIAL_TOTAL_STEPS} 步</b>
      <button className="secondaryBtn" onClick={onDone}>跳過教學</button>
    </div>
    <div className="tutorialDim" />
    <div className="tutorialLayout">
      <aside className="tutorialSide card">
        <div className="tutorialAvatar">🎯</div>
        <h2>訓練假人</h2>
        <div className="hpBar monsterHp"><span style={{ width: `${monsterHp}%` }}></span><b>{monsterHp}/100</b></div>
        <div className="tutorialMiniArea"><b>假人已打出</b><div>{dummyPlayed.map(c => <Card key={c.playedId || c.id} c={c} mini />)}</div></div>
      </aside>
      <main className="tutorialCenter">
        <section className={`tutorialEvent ${highlightClass('event')}`}>{event && <EventCard event={event} bans={[]} />}</section>
        <section className={`tutorialDuel card ${highlightClass('duel')}`}>
          <div><h3>假人</h3>{reveal ? <Card c={reveal.monsterCard} /> : <div className="cardBack">?</div>}<b>點數 {reveal?.mScore ?? '-'}</b></div>
          <strong className="tutorialVs">VS</strong>
          <div><h3>玩家</h3>{reveal ? <Card c={reveal.playerCard} /> : selectedCard ? <Card c={selectedCard} /> : <div className="blank">未出牌</div>}<b>點數 {reveal?.pScore ?? '-'}</b></div>
          {reveal?.damage && <em className="tutorialDamage">HP -{reveal.damage}</em>}
          {reveal?.controlText && <em className="tutorialControlText">{reveal.controlText}</em>}
        </section>
        {step === 9 && <section className={`tutorialFinal card ${highlightClass('final')}`}>
          <h2>最終牌型比較</h2>
          <div className="tutorialFinalBoard"><div><b>玩家</b><div>{playerPlayed.map(c => <Card key={c.playedId || c.id} c={c} />)}</div><strong>{handType(playerPlayed).label}</strong></div><div className="tutorialVs">VS</div><div><b>假人</b><div>{dummyPlayed.map(c => <Card key={c.playedId || c.id} c={c} />)}</div><strong>{handType(dummyPlayed).label}</strong></div></div>
          <p>訓練完成！你已經學會基本操作。現在開始招募你的冒險者吧！</p>
        </section>}
      </main>
      <aside className="tutorialSide playerTutorial card">
        <div className="tutorialAvatar">🧙</div>
        <h2>冒險者團</h2>
        <div className="hpBar playerHp"><span style={{ width: '100%' }}></span><b>100/100</b></div>
        <div className={`tutorialPlayed ${highlightClass('final')}`}><b>玩家已打出</b><div>{playerPlayed.map(c => <Card key={c.playedId || c.id} c={c} mini />)}</div></div>
        <div className={`tutorialAdventurers ${highlightClass('adventurer')}`}>{TUTORIAL_ADVENTURERS.map(a => {
          const sel = selectedAdv.some(x => x.id === a.id);
          return <button key={a.id} onClick={() => toggleAdv(a)} className={sel ? 'sel' : ''}><span>{a.icon}</span><b>{a.name}</b><em>⚔ {a.attackPower}</em></button>;
        })}</div>
        <div className={`tutorialHand ${highlightClass('hand')}`}>{hand.map(c => {
          const selected = selectedCard?.id === c.id;
          const illegal = (round === 1 || round === 3) ? c.type !== 'attack' : c.type !== 'control';
          return <button key={c.id} onClick={() => chooseTutorialCard(c)} className={(selected ? 'sel ' : '') + (illegal ? 'dim ' : '')}><Card c={c} /></button>;
        })}</div>
        {round === 2 && step === 5 && <button className="secondaryBtn noCardTutorial" onClick={noCardRound2}>不出牌</button>}
      </aside>
    </div>
    <div className="tutorialBubble card">
      <h2>{bubble.title}</h2>
      <p>{bubble.text}</p>
      {msg && <strong className="tutorialWarn">{msg}</strong>}
      {step === 2 || step === 8 ? <small>目前投入：{selectedAdv.length}/{event.max}，總攻擊力 {selectedPower}</small> : null}
      {bubble.action && <button className="primaryBtn" disabled={bubble.disabled} onClick={bubble.action}>{bubble.actionText}</button>}
      {!bubble.action && <span className="tutorialWait">{bubble.actionText}</span>}
    </div>
  </div>;
}

function recruitSummary(card) {
  const parts = [];
  if (card.attackPower) parts.push(`⚔${card.attackPower}`);
  else parts.push('無攻');
  if (card.attrs?.length) parts.push(...card.attrs.map(a => a.text));
  else parts.push(`訓練${card.training}次`);
  return parts.join('｜');
}
function recruitThumbLabel(card, expanded) {
  return expanded ? recruitSummary(card) : card.name;
}

function RecruitmentScreen({ recruit, setRecruit, onStart }) {
  const selectedIds = new Set(recruit.selected.map(r => r.recruitId));
  const allRevealed = recruit.group?.every(slot => slot.revealed);
  const openedCount = recruit.pool.length;
  const beginRecruit = () => setRecruit(r => ({
    ...r,
    stage: 'draw',
    groupIndex: 1,
    group: makeRecruitGroup(),
    pool: [],
    selected: [],
    detailId: null,
    flash: null,
    locked: false,
    dealTick: (r.dealTick || 0) + 1,
  }));
  const revealSlot = (idx) => {
    if (recruit.locked || recruit.stage !== 'draw') return;
    const slot = recruit.group[idx];
    if (!slot || slot.revealed) return;
    const rarity = slot.card.rarity;
    const pause = rarity === 'rainbow' ? 1000 : rarity === 'gold' ? 500 : 0;
    setRecruit(r => ({
      ...r,
      locked: true,
      flash: rarity === 'rainbow' ? 'rainbow' : rarity === 'gold' || slot.card.hasHigh ? 'gold' : null,
      group: r.group.map((g, i) => i === idx ? { ...g, opening: true } : g),
    }));
    window.setTimeout(() => {
      setRecruit(r => {
        const target = r.group[idx];
        if (!target || target.revealed) return { ...r, locked: false, flash: null };
        const newPool = [...r.pool, target.card];
        const newGroup = r.group.map((g, i) => i === idx ? { ...g, revealed: true, opening: false } : g);
        // 保留在抽卡畫面，讓最後一張翻開後玩家看得到結果，再手動進入候選者選擇。
        return { ...r, pool: newPool, group: newGroup, locked: false, flash: null, stage: 'draw' };
      });
    }, 540 + pause);
    if (pause) window.setTimeout(() => setRecruit(r => ({ ...r, flash: null })), 540 + pause + 120);
  };
  const skipCurrentGroup = () => {
    if (recruit.locked || recruit.stage !== 'draw') return;
    const hidden = recruit.group.filter(g => !g.revealed);
    if (!hidden.length) return;
    const hasRainbow = hidden.some(g => g.card.rarity === 'rainbow');
    const hasGold = hidden.some(g => g.card.rarity === 'gold' || g.card.hasHigh);
    setRecruit(r => {
      const unrevealed = r.group.filter(g => !g.revealed);
      const newPool = [...r.pool, ...unrevealed.map(g => g.card)];
      return {
        ...r,
        pool: newPool.slice(0, 20),
        group: r.group.map(g => ({ ...g, revealed: true, opening: false })),
        flash: hasRainbow ? 'rainbow' : hasGold ? 'gold' : null,
        locked: false,
        stage: 'draw',
      };
    });
    if (hasRainbow || hasGold) window.setTimeout(() => setRecruit(r => ({ ...r, flash: null })), hasRainbow ? 1100 : 650);
  };
  const nextGroup = () => {
    setRecruit(r => {
      if (r.pool.length >= 20) return { ...r, stage: 'select' };
      if (!r.group.every(g => g.revealed)) return r;
      return {
        ...r,
        groupIndex: Math.min(4, r.groupIndex + 1),
        group: makeRecruitGroup(),
        locked: false,
        flash: null,
        detailId: null,
        dealTick: (r.dealTick || 0) + 1,
      };
    });
  };
  const toggle = card => {
    if (recruit.stage !== 'select') return;
    setRecruit(r => {
      const exists = r.selected.some(x => x.recruitId === card.recruitId);
      if (exists) return { ...r, selected: r.selected.filter(x => x.recruitId !== card.recruitId) };
      if (r.selected.length >= 10) return r;
      return { ...r, selected: [...r.selected, card] };
    });
  };
  if (recruit.stage === 'idle') {
    return <div className="recruitScreen recruitStartMode">
      <div className="recruitStartCard card">
        <div className="recruitRune">✦</div>
        <h1>冒險者招募</h1>
        <p>先招募 20 名候選冒險者，再從中選擇 10 名組成本場陣容。</p>
        <p className="hintLine">每次會展開 5 張牌背。金色與彩虹卡背會有非常細微的邊緣光芒。</p>
        <button className="primaryBtn recruitStartBtn" onClick={beginRecruit}>招募冒險者 ×5</button>
      </div>
    </div>;
  }
  if (recruit.stage === 'select') {
    return <div className="recruitScreen selectMode">
      <div className="recruitHeader">
        <h1>選擇出戰陣容</h1>
        <p>20 名候選者已全部揭曉。點擊 10 名出戰，選中的卡會變暗並打勾。</p>
        <b>已選 {recruit.selected.length}/10</b>
      </div>
      <section className="selectionPanel card">
        <div className="selectionGrid">
          {recruit.pool.map(card => <button key={card.recruitId} className={(selectedIds.has(card.recruitId) ? 'chosen ' : '') + 'selectRecruitCard'} onClick={() => toggle(card)}><RecruitCard card={card} /></button>)}
        </div>
        <button className="primaryBtn confirmLineup" disabled={recruit.selected.length !== 10} onClick={() => onStart(recruit.selected)}>確認出戰 {recruit.selected.length}/10</button>
      </section>
    </div>;
  }
  return <div className="recruitScreen packMode">
    {recruit.flash === 'gold' && <div className="goldFlash" />}
    {recruit.flash === 'rainbow' && <div className="rainbowFlash" />}
    <div className="recruitHeader">
      <h1>五連招募</h1>
      <p>第 {recruit.groupIndex}/4 組：按下招募後發出 5 張牌背，再逐張點擊翻開。金色 / 彩虹會藏著淡淡邊緣光。</p>
      <b>已抽 {openedCount}/20</b>
    </div>
    <section className="packStage card cleanPackStage">
      <div className="packCards">
        {recruit.group.map((slot, i) => <button
          key={`${slot.card.recruitId}-${recruit.dealTick || 0}`}
          style={{ '--deal-i': i }}
          disabled={slot.revealed || recruit.locked}
          onClick={() => revealSlot(i)}
          className={(slot.revealed ? 'revealed ' : '') + (slot.opening ? 'opening ' : '') + 'dealing ' + `packSlot rarity-${slot.card.rarity}`}
        >
          {slot.revealed || slot.opening ? <RecruitCard card={slot.card} big /> : <RecruitBack rarity={slot.card.rarity} index={i + 1} />}
        </button>)}
      </div>
      <div className="packFooter">
        <span>本組已翻 {recruit.group.filter(g => g.revealed).length}/5</span>
        <span>已招募 {recruit.pool.length}/20</span>
        {!allRevealed && <button className="secondaryBtn skipPackBtn" disabled={recruit.locked} onClick={skipCurrentGroup}>跳過：五張全翻</button>}
        {allRevealed && recruit.pool.length < 20 && <button className="primaryBtn recruitNextPackBtn" onClick={nextGroup}>招募冒險者 ×5</button>}
        {allRevealed && recruit.pool.length >= 20 && <button className="primaryBtn" onClick={() => setRecruit(r => ({ ...r, stage: 'select' }))}>查看 20 名候選者</button>}
      </div>
    </section>
  </div>;
}
function RecruitBack({ rarity, index }) {
  return <div className={`recruitBack rarity-${rarity}`}>
    <div className="backSigil">✦</div>
    <span>第 {index} 張</span>
  </div>;
}
function RecruitCard({ card, big, flipKey }) {
  const rarity = card.rarity || (card.attrCount >= 2 ? 'gold' : card.attrCount === 1 ? 'blue' : 'green');
  return <div key={flipKey || card.recruitId} className={(big ? 'big ' : '') + `recruitCard rarity-${rarity}`}>
    <div className="rarityTag">{RARITY_INFO[rarity]?.icon} {RARITY_INFO[rarity]?.short}</div>
    <div className="recruitIcon">{card.icon}</div>
    <h3>{card.name}</h3>
    <div className="roleName">{card.roleName}</div>
    <div className="recruitStats">
      {card.attackPower ? <span className="atkLine">⚔ 攻擊力 {card.attackPower}</span> : <span className="noAtk">無攻擊力</span>}
      <span>訓練：{card.training ?? Math.max(0, 4 - (card.attrs?.length || 0))}次</span>
    </div>
    <div className="attrLines">
      {card.attrs?.length ? card.attrs.map(a => <p key={a.id} className={a.quality}><b>{a.job}</b><span>{a.text}</span></p>) : <p className="none"><b>白板</b><span>無效果詞條，訓練潛力高</span></p>}
    </div>
  </div>;
}

function CombatantPanel({ side, enemy, selectedSpecials = [], onSpecial, selectable, revealedHandIds = [] }) {
  return <section className="combatantPanel card">
    <div className="combatantTop">
      <div className="portrait">{enemy ? '👹' : '🧙'}</div>
      <div className="identityText"><h2>{enemy ? side.name : '冒險者團'}</h2><small>手牌 {side.hand.length}｜牌庫 {side.deck.length}｜棄牌 {side.discard.length}</small></div>
    </div>
    <div className={enemy ? 'hpBar monsterHp' : 'hpBar playerHp'}><span style={{ width: `${side.hp}%` }}></span><b>{side.hp}/100</b></div>
    <AdventurerBlock side={side} enemy={enemy} selectedSpecials={selectedSpecials} onSpecial={onSpecial} selectable={selectable} />
    <PlayedCardsBlock title="本局已打出" cards={side.played} />
    {enemy && <EnemyHandBacks cards={side.hand} revealIds={revealedHandIds} />}
  </section>;
}

function AdventurerBlock({ side, enemy, selectedSpecials = [], onSpecial, selectable }) {
  if (!enemy) {
    const selectedSet = new Set(selectedSpecials.map(s => s.uid));
    return <section className="adventurerBlock rosterAdventurerBlock">
      <div className="zoneTitle"><b>冒險者</b><span>點擊投入 / 再點取消</span></div>
      <div className="battleRosterGrid">
        {Array.from({ length: 10 }).map((_, i) => {
          const sp = side.specials[i];
          if (!sp) return <div key={i} className="battleRosterButton emptyRosterSlot">空</div>;
          const selected = selectedSet.has(sp.uid);
          const off = sp.cd > 0;
          return <button
            key={sp.uid}
            type="button"
            onClick={() => onSpecial?.(sp)}
            disabled={!selectable || off}
            className={(selected ? 'sel ' : '') + (off ? 'off ' : '') + `battleRosterButton rarity-${sp.rarity || 'green'}`}
            title={sp.desc}
          >
            <b>{sp.icon}</b>
            <strong>{sp.name}</strong>
            <span>{sp.attackPower ? `⚔ ${sp.attackPower}` : '無攻擊'}</span>
            {sp.attrs?.length ? <small>{sp.attrs.map(a => a.text).join('｜')}</small> : <small>訓練 {sp.training} 次</small>}
            {off && <em>{sp.cd}</em>}
          </button>;
        })}
      </div>
    </section>;
  }
  return <section className="adventurerBlock monsterAdventurerBlock">
    <div className="zoneTitle"><b>怪物冒險者</b><span>身分隱藏，只顯示 CD</span></div>
    <div className="battleRosterGrid monsterRosterGrid">
      {Array.from({ length: 10 }).map((_, i) => {
        const sp = side.specials[i];
        if (!sp) return <div key={i} className="battleRosterButton emptyRosterSlot">空</div>;
        const off = sp.cd > 0;
        return <span
          key={sp.uid}
          className={(off ? 'off ' : '') + 'battleRosterButton mysteryRosterSlot'}
          title={off ? `CD ${sp.cd}` : '怪物冒險者：詳細資訊未知'}
        >
          <b>?</b>
          <strong>未知</strong>
          <span>{off ? `CD ${sp.cd}` : '待命'}</span>
          {off && <em>{sp.cd}</em>}
        </span>;
      })}
    </div>
  </section>;
}

function PlayedCardsBlock({ title, cards }) {
  const preview = handPreview(cards);
  return <section className="playedBlock">
    <div className="zoneTitle"><b>{title}</b><span>{cards.length}</span></div>
    <div className="playedStrip enlargedPlayed">{cards.length ? cards.map(c => <Card key={c.playedId || c.id} c={c} mini />) : <span className="emptyHint">尚無</span>}</div>
    <div className="handForecast"><b>目前牌型：{preview.label}</b><span>最終傷害：{preview.dmg}</span></div>
  </section>;
}

function EnemyHandBacks({ cards = [], revealIds = [] }) {
  const revealSet = new Set(revealIds || []);
  return <section className="enemyHandBlock">
    <div className="zoneTitle"><b>怪物手牌</b><span>{cards.length}/10</span></div>
    <div className="enemyHandSlots">{Array.from({ length: 10 }).map((_, i) => {
      const c = cards[i];
      if (!c) return <div key={i} className="enemyHandSlot"><span>空</span></div>;
      const revealed = revealSet.has(c.id);
      return <div key={c.id} className={(revealed ? 'peekRevealed ' : 'filled ') + 'enemyHandSlot'}>{revealed ? <Card c={c} mini /> : <div className="cardBack miniBack">?</div>}</div>;
    })}</div>
  </section>;
}

function BattleDuelArea({ side, label, move, score, hidden, damage, result, maxSlots = 0 }) {
  const specials = moveSpecials(move);
  const slots = Math.max(maxSlots || specials.length || 0, 0);
  return <div className={`battleSide ${side} ${result || ''}`}>
    <div className="battleCardHalf">
      <div className="battleLabel">{label} 出牌</div>
      <div className={(hidden ? '' : 'flipIn ') + 'battleCardSlot'}>{hidden ? <div className="cardBack">?</div> : <Card c={move?.card} />}</div>
      {!hidden && <div className="scorePill">點數 {score ?? '-'}</div>}
      {damage > 0 && <div className="damageFloat">HP -{damage}</div>}
    </div>
    <div className="battleInvestHalf multiInvestHalf">
      <div className="battleLabel investTitle">投入冒險者 {hidden ? '' : `${specials.length}/${slots}`}</div>
      <div className="battleInvestSlots" style={{ gridTemplateRows: `repeat(${Math.max(slots,1)}, 1fr)` }}>
        {Array.from({ length: Math.max(slots, 1) }).map((_, i) => {
          const sp = specials[i];
          if (hidden) return <div key={i} className="investSlot mysteryBox">?</div>;
          if (!sp) return <div key={i} className="investSlot emptyInvestSlot">空</div>;
          return <div key={sp.uid || i} className={`investSlot filledInvestSlot rarity-${sp.rarity || 'green'}`} title={sp.desc}>
            <strong>{sp.name}</strong>
            <span>{sp.attackPower ? `⚔ ${sp.attackPower}` : '無攻擊'}</span>
            <small>{sp.attrs?.length ? sp.attrs.map(a => a.text).join('｜') : '無效果'}</small>
            {sumAttr(sp, 'scorePlus') > 0 && <em className="floatPlus">+{sumAttr(sp, 'scorePlus')}</em>}
            {sumAttr(sp, 'oppMinus') > 0 && <em className="floatMinus">-{sumAttr(sp, 'oppMinus')}</em>}
          </div>;
        })}
      </div>
    </div>
  </div>;
}

function CurrentMoveBlock({ title, move, score, hidden, enemy }) {
  return <BattleDuelArea side={enemy ? 'monster' : 'player'} label={title} move={move} score={score} hidden={hidden} />;
}
function EventCard({ event, bans, reveal }) {
  const t = EVENT_TYPES[event.type];
  const maxIcons = Array.from({ length: event.max || 0 }, (_, i) => <span key={i}>♟</span>);
  const banText = event.id === 'foresee' && reveal && bans?.length ? `下回合不會出現：${bans.map(x => EVENT_TYPES[x].name).join('、')}` : '';
  return <div className="eventCardHero" style={{ '--accent': t.color }}>
    <div className="eventHeaderLine"><span className="eventTypeIcon">{t.icon}</span><small>{t.name}</small></div>
    <div className="eventBody"><h2>{event.name}</h2><p>{event.text.replace('贏家', '勝者').split('。')[0]}。</p></div>
    <div className="eventRules"><div>{event.icon}</div><div className="limitIcons">{maxIcons}</div></div>
    {banText && <div className="banNotice">{banText}</div>}
  </div>;
}
function DuelBox({ title, move, score, hidden, side }) {
  const count = investCount(move);
  return <div className={`duelBox ${side || ''}`}>
    <h3>{title}</h3>
    <div className="currentCardSlot">{hidden ? <div className="cardBack">?</div> : <Card c={move?.card} />}</div>
    <div className="investMeeples">{hidden ? <span className="mystery">神秘數量</span> : Array.from({ length: count }).map((_, i) => <span key={i}>{side === 'monster' ? '👹' : '👤'}</span>)}</div>
    {!hidden && <div className="scorePill">點數 {score ?? '-'}</div>}
    {!hidden && move?.special && <div className="specialReveal" title={move.special.desc}><b>{move.special.icon} {move.special.name}</b>{sumAttr(move.special, 'scorePlus') > 0 && <em className="floatPlus">+{sumAttr(move.special, 'scorePlus')}</em>}{sumAttr(move.special, 'oppMinus') > 0 && <em className="floatMinus">-{sumAttr(move.special, 'oppMinus')}</em>}</div>}
  </div>;
}
function Side({ side, enemy }) {
  const readySpecials = side.specials.filter(s => s.cd <= 0).length;
  const cdSpecials = side.specials.filter(s => s.cd > 0).length;
  return <aside className={(enemy ? 'monsterBand ' : 'playerInfo ') + 'sidePanel card'}>
    <div className="identity"><div className="avatar">{enemy ? '👹' : '🧙'}</div><div><h2>{enemy ? side.name : '冒險者團'}</h2><small>{enemy ? `手牌 ${side.hand.length}｜牌庫 ${side.deck.length}` : `手牌 ${side.hand.length}｜牌庫 ${side.deck.length}`}</small></div></div>
    <div className={enemy ? 'hpBar monsterHp' : 'hpBar playerHp'}><span style={{ width: `${side.hp}%` }}></span><b>{side.hp}/100</b></div>
    <div className="sideStats">
      <div><small>白板</small><MeepleLine ready={side.white.ready} cd={side.white.cd} icon={enemy ? '👹' : '👤'} /></div>
      <div><small>特殊</small><div className="meepleLine specialLine">{side.specials.map((sp, i) => <span key={sp.uid} className={sp.cd > 0 ? 'off' : ''} title={enemy ? '怪物特殊冒險者' : sp.desc}>{enemy ? '👺' : '🌟'}{sp.cd > 0 && <em>{sp.cd}</em>}</span>)}</div></div>
    </div>
    {enemy && <div className="topPlayed"><span>本局已打出</span><div>{side.played.map(c => <Card key={c.playedId || c.id} c={c} mini />)}</div></div>}
  </aside>;
}
function MeepleLine({ ready, cd, icon }) {
  return <div className="meepleLine">{Array.from({ length: ready }).map((_, i) => <span key={'r' + i}>{icon}</span>)}{cd.map((c, i) => <span className="off" key={'c' + i}>{icon}<em>{c}</em></span>)}</div>;
}
function Card({ c, mini }) {
  if (!c) return <div className={mini ? 'blank mini' : 'blank'}>無</div>;
  const t = CARD_TYPES[c.type];
  return <div className={(mini ? 'gameCard mini ' : 'gameCard ') + c.type} style={{ '--accent': t.color }}>
    <span className="corner top">{t.icon}</span><strong>{c.rank}</strong><span className="corner bottom">{t.icon}</span><small>{t.name}</small>
  </div>;
}
function Pile({ title, cards, compact }) { return <div className={(compact ? 'pile compact' : 'pile')}><h4>{title} <em>{cards.length}</em></h4><div>{cards.map(c => <Card key={c.playedId || c.id} c={c} mini={compact} />)}</div></div>; }

function ChoicePanel({ choice, player, monster, onAdjust, onBan, onPeek }) {
  const [selected, setSelected] = useState(choice?.selected || []);
  useEffect(() => setSelected(choice?.selected || []), [choice?.type, choice?.title]);
  if (!choice) return null;
  if (choice.type === 'adjustCard') {
    const renderTargets = (sideName, cards) => <div className="choiceTargets">
      <h4>{sideName === 'player' ? '玩家已打出牌' : '怪物已打出牌'}</h4>
      {cards.length === 0 && <p className="muted">沒有牌可調整</p>}
      {cards.map(c => <div className="choiceCard" key={c.playedId || c.id}>
        <Card c={c} mini />
        <button onClick={() => onAdjust(sideName, c.playedId || c.id, 'plus')}>+{choice.amount}</button>
        <button onClick={() => onAdjust(sideName, c.playedId || c.id, 'minus')}>-{choice.amount}</button>
      </div>)}
    </div>;
    return <section className="choicePanel card">
      <h2>{choice.title}</h2><p>{choice.text}</p><div className="choiceGrid">{renderTargets('player', player.played)}{renderTargets('monster', monster.played)}</div>
    </section>;
  }
  if (choice.type === 'banEvents') {
    const toggle = type => setSelected(prev => prev.includes(type) ? prev.filter(x => x !== type) : prev.length < choice.count ? [...prev, type] : prev);
    return <section className="choicePanel card"><h2>{choice.title}</h2><p>{choice.text}</p><div className="banOptions">{EVENT_TYPE_KEYS.map(t => <button key={t} onClick={() => toggle(t)} className={selected.includes(t) ? 'sel' : ''}><span>{EVENT_TYPES[t].icon}</span><b>{EVENT_TYPES[t].name}</b></button>)}</div><button className="primaryBtn" onClick={() => onBan(selected)}>確認封鎖 {selected.length}/{choice.count}</button></section>;
  }
  if (choice.type === 'peekHand') {
    const limit = Math.min(choice.count || 0, monster.hand.length);
    const toggleCard = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < limit ? [...prev, id] : prev);
    return <section className="choicePanel card peekPanel">
      <h2>{choice.title}</h2><p>{choice.text}</p>
      <div className="peekGrid">{Array.from({ length: 10 }).map((_, i) => {
        const c = monster.hand[i];
        if (!c) return <div key={i} className="peekHandSlot emptyPeek">空</div>;
        const picked = selected.includes(c.id);
        return <button key={c.id} className={(picked ? 'picked ' : '') + 'peekHandSlot'} onClick={() => toggleCard(c.id)}>{picked ? <Card c={c} mini /> : <div className="cardBack miniBack">?</div>}</button>;
      })}</div>
      <button className="primaryBtn" disabled={selected.length < limit} onClick={() => onPeek(selected)}>確認揭露 {selected.length}/{limit}</button>
    </section>;
  }
  return null;
}


function FinalOverlay({ reveal, gameOver, onNextGame, onRestart }) {
  if (!reveal?.final) return null;
  const cmp = compareHands(reveal.ph, reveal.mh);
  const finalWinnerText = cmp > 0 ? '玩家最終牌型勝利' : cmp < 0 ? '怪物最終牌型勝利' : '最終牌型平手';
  const dmg = cmp > 0 ? (HAND_DAMAGE[reveal.ph.key] || 0) : cmp < 0 ? (HAND_DAMAGE[reveal.mh.key] || 0) : 0;
  return <div className="finalOverlay">
    <div className="finalModal card">
      <div className="finalBanner">最終牌型比較環節</div>
      <div className="finalOverlayBoard">
        <div className="finalSideBlock playerFinal">
          <h3>玩家牌型素材</h3>
          <div className="finalCardLine">{(reveal.playerPlayed || []).map((c, i) => <div className="finalCardWrap" style={{ animationDelay: `${i * .18}s` }} key={c.playedId || c.id}><Card c={c} /></div>)}</div>
          <h2>{reveal.ph.label}</h2>
        </div>
        <div className="finalVsBlock">
          <strong>VS</strong>
          <span>{finalWinnerText}</span>
          <em>{dmg > 0 ? `造成 ${dmg} 傷害` : '無傷害'}</em>
        </div>
        <div className="finalSideBlock monsterFinal">
          <h3>怪物牌型素材</h3>
          <div className="finalCardLine">{(reveal.monsterPlayed || []).map((c, i) => <div className="finalCardWrap" style={{ animationDelay: `${.45 + i * .18}s` }} key={c.playedId || c.id}><Card c={c} /></div>)}</div>
          <h2>{reveal.mh.label}</h2>
        </div>
      </div>
      <div className="resultLines">{reveal.lines?.slice(0, 4).map((l, i) => <p key={i}>{l}</p>)}</div>
      <div className="finalActions">
        {gameOver ? <><h2>{gameOver}</h2><button className="primaryBtn" onClick={onRestart}>重新開始</button></> : <button className="primaryBtn nextGameBtn" onClick={onNextGame}>進入下一局</button>}
      </div>
    </div>
  </div>;
}

function Result({ reveal, phase, gameOver, pendingChoice, onNext, onFinal, onNextGame, onRestart }) {
  if (!reveal) return null;
  if (reveal.final) {
    const finalWinnerText = compareHands(reveal.ph, reveal.mh) > 0 ? '玩家最終牌型勝利' : compareHands(reveal.ph, reveal.mh) < 0 ? '怪物最終牌型勝利' : '最終牌型平手';
    return <div className="result card finalResult">
      <div className="finalBanner">最終牌型比較環節</div>
      <div className="finalCompareBoard">
        <div className="finalSideBlock"><h3>玩家牌型素材</h3><div className="finalCardLine">{(reveal.playerPlayed || []).map((c, i) => <div className="finalCardWrap" style={{ animationDelay: `${i * .22}s` }} key={c.playedId || c.id}><Card c={c} /></div>)}</div><h2>{reveal.ph.label}</h2></div>
        <div className="finalVsBlock"><strong>VS</strong><span>{finalWinnerText}</span></div>
        <div className="finalSideBlock"><h3>怪物牌型素材</h3><div className="finalCardLine">{(reveal.monsterPlayed || []).map((c, i) => <div className="finalCardWrap" style={{ animationDelay: `${.6 + i * .22}s` }} key={c.playedId || c.id}><Card c={c} /></div>)}</div><h2>{reveal.mh.label}</h2></div>
      </div>
      <div className="resultLines">{reveal.lines?.slice(0, 4).map((l, i) => <p key={i}>{l}</p>)}</div>
      {gameOver ? <><h2>{gameOver}</h2><button className="primaryBtn" onClick={onRestart}>重新開始</button></> : <button className="primaryBtn" onClick={onNextGame}>進入下一局</button>}
    </div>;
  }
  return <div className="phaseControls">
    {pendingChoice ? <span className="waitingChoice">請完成上方選擇</span> : gameOver ? <button className="primaryBtn" onClick={onRestart}>{gameOver}｜重新開始</button> : phase === 'finalPending' ? <button className="primaryBtn" onClick={onFinal}>進入最終牌型比較</button> : <button className="primaryBtn" onClick={onNext}>進入下一回合</button>}
  </div>;
}
function Log({ lines }) { return <details className="log card"><summary>戰鬥紀錄</summary>{lines.map((l, i) => <p key={i}>{l}</p>)}</details>; }

createRoot(document.getElementById('root')).render(<App />);
