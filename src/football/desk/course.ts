// The coaching course (desk spec §8, decision 12.7 a with the owner's note): five questions, 3 right to pass, and a
// pass levels up the manager's eye for a player, which adds a card choice after cup wins. Pure.
// Also the private import of the owner's own question file (JSON or CSV). Imported questions live only on the
// phone (the `deskQuestions` table), never in the repo.
import { shuffle } from '../rng';
import type { Question } from './content';

export const COURSE_SIZE = 5;
export const PASS_AT = 3;

/** Five questions: ones never answered in a course first, in a seeded order; then the rest. */
export function drawCourse(ids: string[], answered: string[], r: () => number): string[] {
  const seen = new Set(answered);
  const fresh = shuffle(r, ids.filter((i) => !seen.has(i)));
  const old = shuffle(r, ids.filter((i) => seen.has(i)));
  return [...fresh, ...old].slice(0, COURSE_SIZE);
}

/** "1,000" and "1000" and " 1000.0 " are the same typed answer; words compare without case or spaces. */
export function sameAnswer(given: string, answer: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const num = (s: string) => { const t = s.replace(/[,\s]/g, ''); return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN; };
  const a = num(given), b = num(answer);
  if (!Number.isNaN(a) && !Number.isNaN(b)) return Math.abs(a - b) < 1e-9;
  return norm(given) === norm(answer) && norm(given) !== '';
}
export const isRight = (q: Question, given: string | null) => given != null && sameAnswer(given, q.answer);

export function grade(qs: Question[], answers: (string | null)[]): { right: number; passed: boolean } {
  const right = qs.reduce((t, q, i) => t + (isRight(q, answers[i] ?? null) ? 1 : 0), 0);
  return { right, passed: right >= PASS_AT };
}

/** The lifeline: two wrong options struck out, picked by the seed (a typed answer has none). */
export function lifelineStrikes(q: Question, r: () => number): string[] {
  if (!q.options) return [];
  return shuffle(r, q.options.filter((o) => !sameAnswer(o, q.answer))).slice(0, 2);
}

// ---------- the manager's eye: the skill a pass levels up ----------
/** Passes needed for each level of the eye. */
export const EYE_LEVELS = [1, 3, 6] as const;
/** Extra card choices after a cup win, by level. */
export const EYE_CHOICES = [0, 1, 1, 2] as const;
export const eyeLevel = (passes: number) => EYE_LEVELS.filter((n) => passes >= n).length;
export const eyeChoices = (passes: number) => EYE_CHOICES[eyeLevel(passes)];
/** Passes still needed for the next level, or undefined at the top. */
export const toNextEye = (passes: number) => { const n = EYE_LEVELS.find((x) => passes < x); return n === undefined ? undefined : n - passes; };

// ---------- the owner's question file ----------
export interface ImportResult { questions: Question[]; errors: string[] }

const KEY: Record<string, keyof Row> = {
  question: 'prompt', prompt: 'prompt', q: 'prompt', text: 'prompt',
  options: 'options', choices: 'options',
  answer: 'answer', correct: 'answer', key: 'answer',
  explanation: 'explanation', solution: 'explanation', why: 'explanation',
  year: 'year', section: 'section', topic: 'section', passage: 'passage', id: 'id',
};
interface Row { id?: string; prompt?: string; options?: string[]; answer?: string; explanation?: string; year?: string; section?: string; passage?: string }

/** Reads one record, whatever the column names: "question", options as a list, "a|b|c|d", or option1… / a… columns. */
function rowOf(rec: Record<string, unknown>): Row {
  const row: Row = {};
  const opts: [string, string][] = [];
  for (const [k0, v] of Object.entries(rec)) {
    if (v == null || v === '') continue;
    const k = k0.trim().toLowerCase().replace(/[\s_-]+/g, '');
    const m = /^(?:option|opt|choice)?([1-5a-e])$/.exec(k);
    if (m && k !== 'q') { opts.push([m[1], String(v)]); continue; }
    const f = KEY[k];
    if (!f) continue;
    if (f === 'options') row.options = Array.isArray(v) ? v.map(String) : String(v).split('|');
    else (row as Record<string, string>)[f] = String(v);
  }
  if (!row.options && opts.length) row.options = opts.sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  if (row.options) row.options = row.options.map((o) => o.trim()).filter(Boolean);
  return row;
}

/** The right option's text from "B", "2" or the text itself. */
function answerText(row: Row): string | undefined {
  const a = row.answer?.trim();
  if (!a) return undefined;
  if (!row.options?.length) return a;
  const hit = row.options.find((o) => sameAnswer(o, a));
  if (hit) return hit;
  const letter = /^\(?([a-e])\)?\.?$/i.exec(a);
  if (letter) return row.options['abcde'.indexOf(letter[1].toLowerCase())];
  if (/^[1-5]$/.test(a)) return row.options[Number(a) - 1];
  return undefined;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Splits CSV text into records (quotes, doubled quotes and line breaks inside quotes handled). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

/** Reads the owner's file. Every question needs a prompt, an answer and an explanation; options are optional (TITA). */
export function importQuestions(text: string, name = ''): ImportResult {
  let recs: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const trimmed = text.trim();
  if (/\.json$/i.test(name) || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const j = JSON.parse(trimmed) as unknown;
      const list = Array.isArray(j) ? j : (j as { questions?: unknown }).questions;
      if (!Array.isArray(list)) return { questions: [], errors: ['The file has no list of questions.'] };
      recs = list.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);
    } catch {
      return { questions: [], errors: ['The file is not valid JSON.'] };
    }
  } else {
    const rows = parseCsv(text);
    if (rows.length < 2) return { questions: [], errors: ['The file needs a header row and at least one question.'] };
    const head = rows[0];
    recs = rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  }
  const out: Question[] = [];
  const ids = new Set<string>();
  recs.forEach((rec, i) => {
    const row = rowOf(rec);
    const n = i + 1;
    if (!row.prompt?.trim()) { errors.push(`Question ${n}: no question text.`); return; }
    if (row.options && row.options.length === 1) { errors.push(`Question ${n}: only one option.`); return; }
    const answer = answerText(row);
    if (!answer) { errors.push(`Question ${n}: the answer doesn't match an option.`); return; }
    if (!row.explanation?.trim()) { errors.push(`Question ${n}: no explanation.`); return; }
    const id = `mine-${hash(`${row.prompt}|${answer}`)}`;
    if (ids.has(id)) { errors.push(`Question ${n}: a repeat, skipped.`); return; }
    ids.add(id);
    out.push({
      id, source: 'mine', prompt: row.prompt.trim(), answer, explanation: row.explanation.trim(),
      ...(row.options?.length ? { options: row.options } : {}),
      ...(row.section ? { section: row.section.trim() } : {}),
      ...(row.year ? { year: row.year.trim() } : {}),
      ...(row.passage ? { passage: row.passage.trim() } : {}),
    });
  });
  return { questions: out, errors };
}
