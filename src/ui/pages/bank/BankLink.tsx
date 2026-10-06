import type { AnchorHTMLAttributes } from 'react';
import { href } from '@/ui/router';
import { type BankLocation, bankPath, goBank, isPlainLeftClick } from './navigation';

export interface BankLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: BankLocation;
  /** `data-focus-key` of the element to focus once the new view has rendered. */
  focus?: string;
}

/**
 * A real link (open-in-new-tab, copy link address and middle-click all work) that,
 * on a plain click, moves within the bank by replacing the current history entry.
 */
export function BankLink({ to, focus, onClick, ...rest }: BankLinkProps) {
  return (
    <a
      {...rest}
      href={href(bankPath(to))}
      onClick={(event) => {
        onClick?.(event);
        if (!isPlainLeftClick(event)) return;
        event.preventDefault();
        goBank(to, focus);
      }}
    />
  );
}
