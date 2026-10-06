import { useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Paper } from '@/engine/types';
import { paperShareText, publicAppUrl } from '@/platform/links';
import { isDesktopApp } from '@/platform/desktop';
import { isNativeApp, printPage, shareContent } from '@/platform/native';
import { PageHeader } from '@/ui/components/ui';
import { href, navigate } from '@/ui/router';
import { footerText, paperComposition, paperHeading, plural } from './layout';
import { PaperDocument } from './PaperDocument';
import { PaperToolbar } from './PaperToolbar';
import { installPrintStyles } from './printStyles';
import { anotherPaperPath, cbtPath, type ResolvedPaper } from './request';
import { type PrintSettings, replaceHashQuery, settingsToQuery } from './settings';
import { useIncrementalCount } from './useIncrementalCount';
import css from '../PaperPage.module.css';

export interface PaperViewProps {
  resolved: ResolvedPaper;
  paper: Paper;
  generatedAt: number;
  initialSettings: PrintSettings;
}

/** Waits (briefly) for web fonts such as KaTeX's, so maths never prints in a fallback font. */
function whenFontsReady(callback: () => void, timeoutMs = 1200): void {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts || fonts.status === 'loaded') {
    callback();
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    callback();
  };
  fonts.ready.then(run, run);
  window.setTimeout(run, timeoutMs);
}

/** A generated paper: the options panel and the printable document. */
export function PaperView({ resolved, paper, generatedAt, initialSettings }: PaperViewProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [renderAll, setRenderAll] = useState(false);
  const [status, setStatus] = useState('');
  const heading = useMemo(() => paperHeading(paper), [paper]);
  const composition = useMemo(() => paperComposition(paper), [paper]);
  const sectionCount = paper.sections.filter((s) => s.count > 0).length;
  const total = paper.questions.length;
  const rendered = useIncrementalCount(total, { all: renderAll });
  const native = isNativeApp();
  const desktop = isDesktopApp();

  // Keep the address bar in step with the options, so the link reproduces this printout.
  useEffect(() => {
    replaceHashQuery((query) => settingsToQuery(settings, query));
  }, [settings]);

  // A4 page rules, hidden app chrome and a running footer while this page is shown.
  useEffect(() => installPrintStyles(footerText(paper.code)), [paper.code]);

  // Ctrl+P or the browser menu: lay out every remaining page before printing starts.
  useEffect(() => {
    const beforePrint = () => flushSync(() => setRenderAll(true));
    window.addEventListener('beforeprint', beforePrint);
    return () => window.removeEventListener('beforeprint', beforePrint);
  }, []);

  const update = useCallback(
    (patch: Partial<PrintSettings>) => setSettings((s) => ({ ...s, ...patch })),
    [],
  );

  const print = () => {
    flushSync(() => setRenderAll(true));
    // Lay out the new content now so the fonts it needs start loading before printing.
    document.body.getBoundingClientRect();
    setStatus('Opening the print dialog…');
    whenFontsReady(() => {
      setStatus('');
      // window.print() does nothing in the Android app's WebView: use Android's print dialog.
      if (!native) window.print();
      else
        printPage(`${paper.code} · ${heading.title}`).catch(() =>
          setStatus('Printing is not available on this device.'),
        );
    });
  };

  // The link reopens this exact paper with these print options. The app has no address
  // bar: it shares a link to the website, or the paper code when it knows no website.
  const shareLink = async () => {
    const url = publicAppUrl();
    if (native) {
      try {
        await shareContent(
          url
            ? { title: heading.title, text: `${heading.title} · ${paper.code}`, url }
            : {
                title: heading.title,
                text: paperShareText(paper.code, window.location.hash.slice(1)),
              },
        );
      } catch {
        setStatus('Could not open the share sheet.');
      }
      return;
    }
    // The desktop app (app://bundle/) copies the website link, or the paper code without one.
    const codeOnly = !url && desktop;
    try {
      await navigator.clipboard.writeText(
        codeOnly
          ? paperShareText(paper.code, window.location.hash.slice(1))
          : (url ?? window.location.href),
      );
      setStatus(
        codeOnly
          ? 'Share message copied. Pasted into "Open a paper code" on the dashboard, it opens this exact paper.'
          : 'Link copied. It opens this exact paper with these print options.',
      );
    } catch {
      setStatus(
        desktop
          ? `Could not copy automatically. The paper code is ${paper.code}.`
          : 'Could not copy automatically. Copy the address from the address bar instead.',
      );
    }
  };

  const anotherPaper = () =>
    navigate(anotherPaperPath(resolved, settingsToQuery(settings, new URLSearchParams())));

  return (
    <div className={css.root}>
      <div className={css.screenOnly}>
        <PageHeader
          title={heading.title}
          subtitle={
            <>
              Paper code <strong>{paper.code}</strong> · {plural(total, 'MCQ')} ·{' '}
              {paper.durationMinutes} minutes. Print it or save it as a PDF, then mark it with the
              answer key.
            </>
          }
        />
      </div>
      <div className={css.layout}>
        <PaperToolbar
          settings={settings}
          onChange={update}
          composition={composition}
          sectionCount={sectionCount}
          bankVersion={paper.bankVersion}
          rendered={renderAll ? total : rendered}
          status={status}
          cbtHref={href(cbtPath(resolved))}
          onPrint={print}
          shareLabel={
            native
              ? publicAppUrl()
                ? 'Share link'
                : 'Share paper code'
              : desktop && !publicAppUrl()
                ? 'Copy share message'
                : null
          }
          onCopyLink={() => void shareLink()}
          onAnotherPaper={anotherPaper}
        />
        <div className={css.doc}>
          <PaperDocument
            paper={paper}
            heading={heading}
            settings={settings}
            generatedAt={generatedAt}
            renderedCount={rendered}
            renderAll={renderAll}
          />
        </div>
      </div>
    </div>
  );
}
