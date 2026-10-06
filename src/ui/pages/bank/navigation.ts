/**
 * URL state, focus restoration and announcements for the question-bank browser.
 *
 * The page keeps everything that identifies a view in the URL
 * (`#/bank?subject=<id>&chapter=<id>&t=<template id>&seed=<seed>`) and updates it
 * with `navigate(..., { replace: true })`. The app shell re-mounts the page on every
 * hash change, so anything that must survive a URL update (where focus should go,
 * search filters, screen-reader announcements) lives here at module level.
 */
import { type MouseEvent as ReactMouseEvent, type RefObject, useEffect } from 'react';
import { SYLLABUS } from '@/config/syllabus';
import { SUBJECT_IDS, type SubjectId } from '@/engine/types';
import { navigate } from '@/ui/router';
import { EMPTY_FILTER, parseSeed, splitTemplateId, type TemplateFilter } from './model';

/** Subjects shown as tabs: every subject that has a syllabus, in syllabus order. */
export const BANK_SUBJECTS: readonly SubjectId[] = SUBJECT_IDS.filter((id) =>
  Boolean(SYLLABUS[id]),
);

const SHORT_NAMES: Partial<Record<SubjectId, string>> = {
  quantitative: 'Quantitative Maths',
  intelligence: 'Intelligence',
};

/** Compact subject name for tabs. */
export const subjectLabel = (subject: SubjectId): string =>
  SHORT_NAMES[subject] ?? SYLLABUS[subject].name;

export function isBankSubject(value: string | null | undefined): value is SubjectId {
  return Boolean(value) && (BANK_SUBJECTS as readonly string[]).includes(value as string);
}

export interface BankLocation {
  subject: SubjectId;
  chapter?: string;
  /** Full template id. */
  template?: string;
  /** Variant seed for parametric templates. */
  seed?: string;
}

export interface ParsedBankQuery extends BankLocation {
  /** A `subject` parameter that names no known subject. */
  unknownSubject?: string;
}

const MAX_PARAM = 200;

function param(query: URLSearchParams, name: string): string | undefined {
  const value = query.get(name)?.trim();
  return value ? value.slice(0, MAX_PARAM) : undefined;
}

/**
 * Reads the bank location from the route query. A template id (`t`) wins over the
 * `subject` / `chapter` parameters, so `#/bank?t=physics/work-energy/kinetic-energy`
 * is a complete deep link.
 */
export function parseBankQuery(query: URLSearchParams): ParsedBankQuery {
  const template = param(query, 't');
  const fromId = template ? splitTemplateId(template) : {};
  const subjectParam = param(query, 'subject')?.toLowerCase();
  const idSubject = isBankSubject(fromId.subject) ? fromId.subject : undefined;
  const subject: SubjectId =
    idSubject ?? (isBankSubject(subjectParam) ? subjectParam : BANK_SUBJECTS[0]!);
  const chapter = idSubject && fromId.chapter ? fromId.chapter : param(query, 'chapter');
  const seed = parseSeed(param(query, 'seed'));
  return {
    subject,
    ...(chapter ? { chapter } : {}),
    ...(template ? { template } : {}),
    ...(seed ? { seed } : {}),
    ...(subjectParam && !idSubject && !isBankSubject(subjectParam)
      ? { unknownSubject: subjectParam }
      : {}),
  };
}

/** App path of a bank location (`/bank?subject=physics&chapter=work-energy`). */
export function bankPath(location: BankLocation): string {
  const params = new URLSearchParams();
  params.set('subject', location.subject);
  if (location.chapter) params.set('chapter', location.chapter);
  if (location.template) params.set('t', location.template);
  if (location.seed) params.set('seed', location.seed);
  // Slashes are legal in a query string; keeping them makes template links readable.
  return `/bank?${params.toString().replace(/%2F/gi, '/')}`;
}

// ---------------------------------------------------------------------------
// Focus restoration across re-mounts

let pendingFocus: { key: string; at: number } | null = null;
const FOCUS_TTL_MS = 5000;

/** Asks the next render of the bank page to focus the element with `data-focus-key={key}`. */
export function requestFocus(key: string | undefined): void {
  pendingFocus = key ? { key, at: Date.now() } : null;
}

function pendingFocusKey(): string | null {
  if (pendingFocus && Date.now() - pendingFocus.at > FOCUS_TTL_MS) pendingFocus = null;
  return pendingFocus?.key ?? null;
}

/**
 * Moves focus to the element requested with `requestFocus` once it has rendered.
 * `settled` means the page has finished loading: a target that is still missing
 * then will never appear, so the request is dropped.
 */
export function useRestoreFocus(root: RefObject<HTMLElement | null>, settled: boolean): void {
  useEffect(() => {
    const key = pendingFocusKey();
    if (!key || !root.current) return;
    const target = [...root.current.querySelectorAll<HTMLElement>('[data-focus-key]')].find(
      (el) => el.dataset.focusKey === key,
    );
    if (target) {
      target.focus();
      pendingFocus = null;
    } else if (settled) {
      pendingFocus = null;
    }
  });
}

/** Navigates within the bank (replacing the history entry) and optionally moves focus afterwards. */
export function goBank(location: BankLocation, focusKey?: string): void {
  const path = bankPath(location);
  if (typeof window !== 'undefined' && window.location.hash === `#${path}`) {
    requestFocus(undefined);
    return;
  }
  requestFocus(focusKey);
  navigate(path, { replace: true });
}

/** True for an unmodified primary click (anything else should keep the browser's default). */
export function isPlainLeftClick(event: ReactMouseEvent | MouseEvent): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

// ---------------------------------------------------------------------------
// Screen-reader announcements

let region: HTMLElement | null = null;
let announceTimer: ReturnType<typeof setTimeout> | undefined;
/** How long a message stays in the region (so it is not left behind on other pages). */
const ANNOUNCE_CLEAR_MS = 7000;

/**
 * Speaks `message` through a polite live region attached to <body>. Living outside
 * React, it survives the page re-mounting after a URL update. The text is removed
 * again after a few seconds; clearing a polite region is not announced.
 */
export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  if (!region || !region.isConnected) {
    region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-bank-announcer', '');
    region.className = 'visually-hidden';
    document.body.appendChild(region);
  }
  const target = region;
  target.textContent = '';
  clearTimeout(announceTimer);
  // A short delay makes screen readers notice the change even right after a re-mount.
  announceTimer = setTimeout(() => {
    target.textContent = message;
    announceTimer = setTimeout(() => {
      target.textContent = '';
    }, ANNOUNCE_CLEAR_MS);
  }, 60);
}

// ---------------------------------------------------------------------------
// Clipboard

/** Copies text to the clipboard; resolves to false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path (e.g. permissions or insecure context)
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Per-view memory (survives re-mounts for the rest of the visit)

const filters = new Map<string, TemplateFilter>();
const listLimits = new Map<string, number>();
let showAnswers = true;

export const rememberedFilter = (scope: string): TemplateFilter =>
  filters.get(scope) ?? EMPTY_FILTER;

export function rememberFilter(scope: string, filter: TemplateFilter): void {
  filters.set(scope, filter);
}

export const rememberedLimit = (scope: string, fallback: number): number =>
  listLimits.get(scope) ?? fallback;

export function rememberLimit(scope: string, limit: number): void {
  listLimits.set(scope, limit);
}

export const showAnswersPreference = (): boolean => showAnswers;

export function setShowAnswersPreference(value: boolean): void {
  showAnswers = value;
}

/** Clears remembered view state (tests). */
export function resetBankMemory(): void {
  filters.clear();
  listLimits.clear();
  showAnswers = true;
  pendingFocus = null;
  clearTimeout(announceTimer);
}
