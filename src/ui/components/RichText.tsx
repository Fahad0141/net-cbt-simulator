import katex from 'katex';
import 'katex/contrib/mhchem';
import { memo, useMemo } from 'react';
import { type Block, type Inline, parseRich } from '@/engine/rich';
import styles from './RichText.module.css';

const MAX_CACHE = 4000;
const mathCache = new Map<string, string>();

/** KaTeX HTML for a fragment (cached). KaTeX escapes its input, so the output is safe. */
// eslint-disable-next-line react-refresh/only-export-components -- small shared helper kept next to its component
export function renderMath(tex: string, display: boolean): string {
  const key = `${display ? 'D' : 'I'}${tex}`;
  let html = mathCache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'htmlAndMathml',
    });
    if (mathCache.size >= MAX_CACHE) mathCache.clear();
    mathCache.set(key, html);
  }
  return html;
}

function InlineNodes({ nodes }: { nodes: readonly Inline[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'text':
            return node.value;
          case 'math':
            return (
              <span
                key={i}
                className={styles.math}
                dangerouslySetInnerHTML={{ __html: renderMath(node.value, false) }}
              />
            );
          case 'code':
            return (
              <code key={i} className={styles.code}>
                {node.value}
              </code>
            );
          case 'strong':
            return (
              <strong key={i}>
                <InlineNodes nodes={node.children} />
              </strong>
            );
          case 'underline':
            return (
              <u key={i} className={styles.underline}>
                <InlineNodes nodes={node.children} />
              </u>
            );
          case 'break':
            return <br key={i} />;
        }
      })}
    </>
  );
}

function BlockNode({ block }: { block: Block }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className={styles.paragraph}>
          <InlineNodes nodes={block.children} />
        </p>
      );
    case 'math':
      return (
        <div
          className={styles.displayMath}
          dangerouslySetInnerHTML={{ __html: renderMath(block.value, true) }}
        />
      );
    case 'code':
      return (
        <pre className={styles.pre} data-lang={block.lang || undefined}>
          <code>{block.value}</code>
        </pre>
      );
    case 'table':
      return (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i}>
                    <InlineNodes nodes={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      <InlineNodes nodes={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export interface RichTextProps {
  text: string;
  /** Render a single paragraph as a `<span>` (for option labels, table cells, titles). */
  inline?: boolean;
  className?: string;
}

/**
 * Renders the project's rich-text format (see `src/engine/rich.ts`) with KaTeX math.
 * Never injects author-supplied HTML: only KaTeX output is set as HTML.
 */
export const RichText = memo(function RichText({ text, inline = false, className }: RichTextProps) {
  const doc = useMemo(() => parseRich(text), [text]);
  const only = doc.blocks[0];
  if (inline && doc.blocks.length === 1 && only?.type === 'paragraph') {
    return (
      <span className={className}>
        <InlineNodes nodes={only.children} />
      </span>
    );
  }
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {doc.blocks.map((block, i) => (
        <BlockNode key={i} block={block} />
      ))}
    </div>
  );
});
