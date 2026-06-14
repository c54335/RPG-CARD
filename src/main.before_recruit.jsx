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
const makeSpecials = () => SPECIALS.map((s, i) => ({ ...s, uid: `sp-${i}-${Math.random().toString(36).slice(2)}`, cd: 0 }));
const cardText = c => c ? `${CARD_TYPES[c.type].icon}${c.rank}` : '未出牌';
const investCount = move => (move?.white || 0) + (move?.special ? 1 : 0);
const investPower = move => (move?.white || 0) * 5 + (move?.special ? 10 : 0);
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
function newSide(name) {
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
    specials: makeSpecials(),
    selectedCard: null,
    selectedWhite: 0,
    selectedSpecial: null,
  };
}
function initial() {
  return {
    player: newSide('冒險者團'),
    monster: newSide('深淵怪物'),
    round: 0,
    event: null,
    phase: 'start',
    reveal: null,
    nextEventBans: [],
    gameOver: null,
    finalAfterPending: false,
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
  const special = move.special;
  return {
    ...side,
    white: { ready: Math.max(0, side.white.ready - white), cd: [...side.white.cd, ...Array.from({ length: white }, () => 2)] },
    specials: side.specials.map(s => s.uid === special?.uid ? { ...s, cd: 3 } : s),
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
  let white = 0;
  if (event.type === 'clash') white = monster.hp < 35 ? 1 : event.max;
  else if (monster.hp < 30 && event.type === 'attack') white = 0;
  else if (mBase >= pBest + 2) white = event.max;
  else if (close) white = Math.ceil(event.max / 2);
  else white = Math.min(1, event.max);
  white = Math.min(white, monster.white.ready);
  let special = null;
  const specs = availableSpecials(monster);
  if (specs.length && event.max > 0) {
    if (behind && close) special = specs.find(s => s.kind === 'scorePlus' || s.kind === 'oppMinus') || null;
    if (!special && event.type === 'attack' && mBase >= pBest) special = specs.find(s => s.kind === 'damageBoost') || null;
    if (!special && event.type === 'control' && behind) special = specs.find(s => s.kind === 'loseControlAdjust') || null;
    if (!special && event.type === 'foresee' && behind) special = specs.find(s => s.kind === 'loseForeseeRedraw') || null;
    if (!special && monster.hp < 45) special = specs.find(s => s.kind === 'postHeal') || null;
    if (!special && mBase >= pBest) special = specs.find(s => s.kind === 'postDraw') || null;
  }
  if (special && white + 1 > event.max) white = Math.max(0, event.max - 1);
  return { card, white, special };
}
function scoreValue(move, oppMove) {
  let v = move.card?.rank || 0;
  if (move.special?.kind === 'scorePlus') v += 3;
  if (oppMove.special?.kind === 'oppMinus') v -= 2;
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
  if (!move.special) return { side, lines, pendingChoice };
  if (move.special.kind === 'loseAttackHeal' && event.type === 'attack') {
    if (side.hp > 0) {
      side = { ...side, hp: clamp(side.hp + 20, 0, 100) };
      lines.push(`${side.name} 守衛者在受傷後觸發：輸掉攻擊事件，回復 20 HP。`);
    } else {
      lines.push(`${side.name} 已被攻擊擊倒，守衛者未能復活。`);
    }
  }
  if (move.special.kind === 'loseForeseeRedraw' && event.type === 'foresee') {
    const discarded = side.hand.slice(0, 2);
    side = { ...side, hand: side.hand.slice(2), discard: [...side.discard, ...discarded] };
    const allowed = CARD_TYPE_KEYS.filter(t => !nextBans.includes(t));
    const res = drawCards(side, 2, allowed.length ? allowed : null);
    side = res.side;
    lines.push(`${side.name} 預言家觸發：棄 ${discarded.length} 張，抽 ${res.drawn.length} 張可用類型牌。`);
  }
  if (move.special.kind === 'loseControlAdjust' && event.type === 'control') {
    if (side.name === '冒險者團') {
      pendingChoice = {
        type: 'adjustCard',
        title: '魔術師觸發：選擇要增減的牌',
        text: '你輸掉操控事件，魔術師可選擇場上一張已打出的牌 +1 或 -1。',
        amount: 1,
        allowBothSides: true,
        source: 'magician'
      };
      lines.push(`${side.name} 魔術師觸發：請選擇場上一張牌增減 1 點。`);
    } else {
      const adj = adjustPlayed(side, 1, true);
      side = adj.side;
      lines.push(`${side.name} 魔術師觸發：${adj.text}`);
    }
  }
  return { side, lines, pendingChoice };
}
function postSpecials(side, move) {
  let lines = [];
  if (!move.special) return { side, lines };
  // 比較牌型後效果固定在事件傷害與輸掉事件處理之後。
  // 若角色已經被打到 0 HP，回血不會復活。
  if (side.hp <= 0) {
    if (move.special.kind === 'postHeal' || move.special.kind === 'postDraw') {
      lines.push(`${side.name} 已倒下，${move.special.name} 未能生效。`);
    }
    return { side, lines };
  }
  if (move.special.kind === 'postHeal') {
    side = { ...side, hp: clamp(side.hp + 10, 0, 100) };
    lines.push(`${side.name} 支援者最後觸發：受到本回合傷害後，回復 10 HP。`);
  }
  if (move.special.kind === 'postDraw') {
    const res = drawCards(side, 2);
    side = res.side;
    lines.push(`${side.name} 拾荒者最後觸發：抽 ${res.drawn.length} 張牌。`);
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
  if (pMove.special) lines.push(`玩家特殊冒險者：${pMove.special.icon} ${pMove.special.name} — ${pMove.special.desc}`);
  if (mMove.special) lines.push(`怪物特殊冒險者：${mMove.special.icon} ${mMove.special.name} — ${mMove.special.desc}`);
  if (pMove.special?.kind === 'scorePlus') lines.push('D 玩家賭徒・增幅：點數 +3。');
  if (mMove.special?.kind === 'scorePlus') lines.push('D 怪物賭徒・增幅：點數 +3。');
  if (pMove.special?.kind === 'oppMinus') lines.push('D 玩家詐術師：怪物點數 -2。');
  if (mMove.special?.kind === 'oppMinus') lines.push('D 怪物詐術師：玩家點數 -2。');
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
    let dmg = Math.round(investPower(move) * multiplier * (move.special?.kind === 'damageBoost' ? 1.5 : 1));
    if (dmg <= 0) return;
    if (who === 'player') monster = { ...monster, hp: clamp(monster.hp - dmg, 0, 100) };
    else player = { ...player, hp: clamp(player.hp - dmg, 0, 100) };
    lines.push(`${who === 'player' ? '玩家' : '怪物'}造成 ${dmg} 傷害${move.special?.kind === 'damageBoost' ? '（戰士 +50%）' : ''}。`);
  };

  if (event.type === 'clash') {
    executeDamage('player', 1);
    executeDamage('monster', 1);
    lines.push('相殺事件：雙方同時造成傷害。');
  } else if (winner !== 'tie') {
    const who = winner;
    const move = who === 'player' ? pMove : mMove;
    const count = investCount(move);
    if (event.id === 'bigAttack') executeDamage(who, 2);
    if (event.id === 'smallAttack') executeDamage(who, 1);
    if (event.id === 'control') {
      if (who === 'player') {
        if (count > 0 && (player.played.length || monster.played.length)) {
          pendingChoice = {
            type: 'adjustCard',
            title: '操控事件成功：選擇增減牌點數',
            text: `你可選擇場上一張已打出的牌，將其點數 +${count} 或 -${count}。`,
            amount: count,
            allowBothSides: true,
            source: 'control'
          };
          lines.push(`玩家操控成功：請選擇要增減的牌（幅度 ${count}）。`);
        } else {
          lines.push('玩家操控成功，但沒有可操控牌或沒有投入冒險者。');
        }
      } else {
        const targetSelf = monster.played.length && (!player.played.length || Math.random() > 0.35);
        if (targetSelf) { const adj = adjustPlayed(monster, count, true); monster = adj.side; lines.push(`怪物操控自己牌：${adj.text}`); }
        else { const adj = adjustPlayed(player, count, false); player = adj.side; lines.push(`怪物操控玩家牌：${adj.text}`); }
      }
    }
    if (event.id === 'foresee') {
      if (who === 'player') {
        if (count > 0) {
          pendingChoice = {
            type: 'banEvents',
            title: '預知事件成功：選擇封鎖事件類型',
            text: `請選擇最多 ${count} 種事件類型，下回合不會出現。`,
            count,
            selected: []
          };
          lines.push(`玩家預知成功：請選擇最多 ${count} 種下回合不會出現的事件。`);
        } else {
          lines.push('玩家預知成功，但沒有投入冒險者，因此不封鎖事件。');
        }
      } else {
        nextBans = chooseBansForSide(monster, count);
        lines.push(`怪物預知成功：下回合不會出現 ${nextBans.map(t => EVENT_TYPES[t].name).join('、') || '無'}。`);
      }
    }
  }

  // F：處理「若輸掉事件」特殊冒險者。
  if (winner === 'player') {
    const res = loseSpecials(monster, mMove, event, nextBans); monster = res.side; lines.push(...res.lines); if (res.pendingChoice) pendingChoice = res.pendingChoice;
  } else if (winner === 'monster') {
    const res = loseSpecials(player, pMove, event, nextBans); player = res.side; lines.push(...res.lines); if (res.pendingChoice) pendingChoice = res.pendingChoice;
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
  const ns = initial();
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


function App() {
  const [s, setS] = useState(initial());
  const playerLegal = useMemo(() => s.event ? legalCards(s.player.hand, s.event) : [], [s.player.hand, s.event]);
  const mustPlay = s.event?.requiredCardType && playerLegal.length > 0;
  const totalInvest = s.player.selectedWhite + (s.player.selectedSpecial ? 1 : 0);
  const maxWhite = Math.max(0, Math.min(s.event?.max || 0, s.player.white.ready) - (s.player.selectedSpecial ? 1 : 0));
  function start() { setS(st => nextRound({ ...initial(), phase: 'round' })); }
  function nextRound(st = s) {
    let player = tickCd(st.player);
    let monster = tickCd(st.monster);
    if (st.round > 0) {
      player = drawCards(player, 2).side;
      monster = drawCards(monster, 2).side;
    }
    const round = st.round + 1;
    if (round > 5) return finalResolve({ ...st, player, monster });
    const event = getEvent(st.nextEventBans || []);
    return { ...st, player: { ...player, selectedCard: null, selectedWhite: 0, selectedSpecial: null }, monster, round, event, phase: 'select', reveal: null, nextEventBans: [], log: [`第 ${round}/5 回合：${event.name}`, ...st.log].slice(0, 18) };
  }
  function chooseCard(card) {
    if (s.phase !== 'select') return;
    if (s.event.requiredCardType && playerLegal.length && card.type !== s.event.requiredCardType) return;
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
    setS(st => ({ ...st, player: { ...st.player, selectedSpecial: st.player.selectedSpecial?.uid === sp.uid ? null : sp, selectedWhite: Math.min(st.player.selectedWhite, Math.max(0, st.event.max - (st.player.selectedSpecial?.uid === sp.uid ? 0 : 1))) } }));
  }
  function confirm() {
    setS(st => {
      const legal = legalCards(st.player.hand, st.event);
      if (st.event.requiredCardType && legal.length && !st.player.selectedCard) return { ...st, log: ['你有本事件指定類型的牌，必須出一張。', ...st.log].slice(0, 18) };
      const pMove = { card: st.player.selectedCard, white: st.player.selectedWhite, special: st.player.selectedSpecial };
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
      const updated = { ...st, nextEventBans: bans, pendingChoice: null, finalAfterPending: false, log: [line, ...st.log].slice(0, 18) };
      if (st.finalAfterPending || st.round >= 5) {
        return finalResolve({ ...updated, log: ['預知選擇完成，進入最終牌型比較。', ...updated.log].slice(0, 18) });
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
    {s.phase === 'start' && <div className="startScreen">
      <div className="start card">
        <h1>事件牌局戰</h1>
        <p>16:9 三欄式暗黑牌局介面。左怪物、右玩家，中間只呈現事件與本回合揭曉。</p>
        <button className="primaryBtn" onClick={start}>開始戰鬥</button>
      </div>
    </div>}
    {s.phase !== 'start' && <>
      <button className="restartMini" onClick={start}>重新開始</button>
      <div className="gameFrame">
        <aside className="sideCol monsterCol">
          <CombatantPanel side={s.monster} enemy />
        </aside>

        <main className="centerCol">
          <section className="eventStage">
            <div className="roundBadge">第 {s.round}/5 回合</div>
            {s.event && <EventCard event={s.event} bans={s.nextEventBans} reveal={s.reveal} />}
            {s.pendingChoice && <ChoicePanel choice={s.pendingChoice} player={s.player} monster={s.monster} onAdjust={applyAdjustChoice} onBan={applyBanChoice} />}
          </section>

          <section className="duelStage">
            <BattleDuelArea
              side="monster"
              label="怪物"
              move={s.reveal?.mMove}
              score={s.reveal?.mScore}
              hidden={!s.reveal}
              damage={damageTo(s.reveal, 'monster')}
              result={s.reveal?.winner === 'player' ? 'hit' : s.reveal?.winner === 'monster' ? 'win' : ''}
            />
            <BattleDuelArea
              side="player"
              label="玩家"
              move={s.reveal?.pMove || { card: s.player.selectedCard, white: s.player.selectedWhite, special: s.player.selectedSpecial }}
              score={s.reveal?.pScore}
              hidden={false}
              damage={damageTo(s.reveal, 'player')}
              result={s.reveal?.winner === 'monster' ? 'hit' : s.reveal?.winner === 'player' ? 'win' : ''}
            />
          </section>

          <div className="centerControls">
            {(s.phase === 'after' || s.phase === 'finalPending' || s.phase === 'final' || s.phase === 'result') && <Result reveal={s.reveal} phase={s.phase} gameOver={s.gameOver} pendingChoice={s.pendingChoice} onNext={() => setS(st => nextRound(st))} onFinal={() => setS(st => finalResolve(st))} onNextGame={() => setS(st => nextRound(makeNewGame(st)))} onRestart={start} />}
          </div>
        </main>

        <aside className="sideCol playerCol">
          <CombatantPanel
            side={s.player}
            selectedSpecial={s.player.selectedSpecial}
            selectedWhite={s.player.selectedWhite}
            onSpecial={chooseSpecial}
            onWhite={cycleWhite}
            selectable={s.phase === 'select'}
            maxWhite={maxWhite}
          />
          <section className="handZone">
            <div className="zoneTitle"><b>玩家手牌</b><span>{s.player.hand.length}/10</span></div>
            <div className="handSlots">{Array.from({ length: 10 }).map((_, i) => {
              const c = s.player.hand[i];
              if (!c) return <div key={i} className="handSlot emptySlot">空</div>;
              const legal = !s.event?.requiredCardType || !playerLegal.length || c.type === s.event.requiredCardType;
              return <button key={c.id} onClick={() => chooseCard(c)} disabled={s.phase !== 'select'} className={(s.player.selectedCard?.id === c.id ? 'sel ' : '') + (legal ? 'legal ' : 'dim ') + 'handSlot'}><Card c={c} /></button>;
            })}</div>
          </section>
          <section className="actionBar">
            <button className="primaryBtn" onClick={confirm} disabled={s.phase !== 'select'}>確認出擊</button>
            <div className="hintLine">{s.phase === 'select' ? (s.player.selectedCard ? '選擇冒險者後確認' : '先選一張可用手牌') : '等待結算'}</div>
          </section>
        </aside>
      </div>
      {(s.phase === 'final' || s.reveal?.final) && <FinalOverlay reveal={s.reveal} gameOver={s.gameOver} onNextGame={() => setS(st => nextRound(makeNewGame(st)))} onRestart={start} />}
      {s.phase === 'after' && s.round >= 5 && !s.pendingChoice && !s.reveal?.final && <div className="finalOverlay finalSafety"><div className="finalModal card"><div className="finalBanner">正在進入最終牌型比較…</div><button className="primaryBtn" onClick={() => setS(st => finalResolve(st))}>立即顯示最終牌型比較</button></div></div>}
    </>}
  </div>;
}
function CombatantPanel({ side, enemy, selectedSpecial, selectedWhite = 0, onSpecial, onWhite, selectable, maxWhite = 0 }) {
  return <section className="combatantPanel card">
    <div className="combatantTop">
      <div className="portrait">{enemy ? '👹' : '🧙'}</div>
      <div className="identityText"><h2>{enemy ? side.name : '冒險者團'}</h2><small>手牌 {side.hand.length}｜牌庫 {side.deck.length}｜棄牌 {side.discard.length}</small></div>
    </div>
    <div className={enemy ? 'hpBar monsterHp' : 'hpBar playerHp'}><span style={{ width: `${side.hp}%` }}></span><b>{side.hp}/100</b></div>
    <AdventurerBlock side={side} enemy={enemy} selectedSpecial={selectedSpecial} selectedWhite={selectedWhite} onSpecial={onSpecial} onWhite={onWhite} selectable={selectable} maxWhite={maxWhite} />
    <PlayedCardsBlock title="本局已打出" cards={side.played} />
    {enemy && <EnemyHandBacks count={side.hand.length} />}
  </section>;
}

function AdventurerBlock({ side, enemy, selectedSpecial, selectedWhite = 0, onSpecial, onWhite, selectable, maxWhite = 0 }) {
  return <section className="adventurerBlock">
    <div className="zoneTitle"><b>冒險者</b><span>{enemy ? '狀態' : '點擊投入 / 再點取消'}</span></div>
    <div className="adventurerButtons">
      {enemy
        ? <button className="meepleButton whiteBtn" disabled title="怪物白板冒險者"><b>👹</b><span>白板</span><em>{side.white.ready}</em></button>
        : <button className={(selectedWhite > 0 ? 'sel ' : '') + 'meepleButton whiteBtn'} onClick={onWhite} disabled={!selectable || maxWhite <= 0} title={`白板冒險者：攻擊力 5。可投入上限 ${maxWhite}。`}><b>👤</b><span>白板</span><em>{selectedWhite > 0 ? `投入 ${selectedWhite}` : side.white.ready}</em></button>}
      <div className="specialGrid">{side.specials.map(sp => enemy
        ? <span key={sp.uid} className={(sp.cd > 0 ? 'off ' : '') + 'specialButton'} title="怪物特殊冒險者"><b>👺</b>{sp.cd > 0 && <em>{sp.cd}</em>}</span>
        : <button key={sp.uid} onClick={() => onSpecial?.(sp)} disabled={!selectable || sp.cd > 0} className={(selectedSpecial?.uid === sp.uid ? 'sel ' : '') + (sp.cd > 0 ? 'off ' : '') + 'specialButton'} title={sp.desc}><b>{sp.icon}</b>{sp.cd > 0 && <em>{sp.cd}</em>}</button>
      )}</div>
    </div>
    <div className="cdLane"><MeepleLine ready={0} cd={side.white.cd} icon={enemy ? '👹' : '👤'} /></div>
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

function EnemyHandBacks({ count }) {
  return <section className="enemyHandBlock">
    <div className="zoneTitle"><b>怪物手牌</b><span>{count}/10</span></div>
    <div className="enemyHandSlots">{Array.from({ length: 10 }).map((_, i) => <div key={i} className={(i < count ? 'filled ' : '') + 'enemyHandSlot'}>{i < count ? <div className="cardBack miniBack">?</div> : <span>空</span>}</div>)}</div>
  </section>;
}

function BattleDuelArea({ side, label, move, score, hidden, damage, result }) {
  const white = move?.white || 0;
  const special = move?.special;
  const isMonster = side === 'monster';
  return <div className={`battleSide ${side} ${result || ''}`}>
    <div className="battleCardHalf">
      <div className="battleLabel">{label} 出牌</div>
      <div className={(hidden ? '' : 'flipIn ') + 'battleCardSlot'}>{hidden ? <div className="cardBack">?</div> : <Card c={move?.card} />}</div>
      {!hidden && <div className="scorePill">點數 {score ?? '-'}</div>}
      {damage > 0 && <div className="damageFloat">HP -{damage}</div>}
    </div>
    <div className="battleInvestHalf">
      <div className="specialFrame">
        <div className="battleLabel">特殊冒險者</div>
        {hidden ? <div className="mysteryBox">?</div> : special ? <div className="specialReveal flipIn" title={special.desc}><b>{isMonster ? '👺' : special.icon} {special.name}</b>{special.kind === 'scorePlus' && <em className="floatPlus">+3</em>}{special.kind === 'oppMinus' && <em className="floatMinus">-2</em>}</div> : <div className="emptyHint">未投入</div>}
      </div>
      <div className="normalFrame">
        <div className="battleLabel">一般冒險者</div>
        {hidden ? <div className="mysteryBox">神秘</div> : <div className="investMeeples">{white ? Array.from({ length: white }).map((_, i) => <span key={i}>{isMonster ? '👹' : '👤'}</span>) : <span className="emptyHint">0</span>}</div>}
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
    {!hidden && move?.special && <div className="specialReveal" title={move.special.desc}><b>{move.special.icon} {move.special.name}</b>{move.special.kind === 'scorePlus' && <em className="floatPlus">+3</em>}{move.special.kind === 'oppMinus' && <em className="floatMinus">-2</em>}</div>}
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

function ChoicePanel({ choice, player, monster, onAdjust, onBan }) {
  const [selected, setSelected] = useState(choice?.selected || []);
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
