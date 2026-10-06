import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Segmented } from './ui';

type Size = 'small' | 'medium' | 'large' | 'huge';

const OPTIONS: ReadonlyArray<{ value: Size; label: string; disabled?: boolean }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large', disabled: true },
  { value: 'huge', label: 'Huge' },
];

function Harness({
  initial,
  onChange,
  options = OPTIONS,
}: {
  initial: Size;
  onChange?: (value: Size) => void;
  options?: typeof OPTIONS;
}) {
  const [value, setValue] = useState<Size>(initial);
  return (
    <>
      <button type="button">Before</button>
      <Segmented
        label="Size"
        value={value}
        options={options}
        onChange={(next) => {
          onChange?.(next);
          setValue(next);
        }}
      />
      <button type="button">After</button>
    </>
  );
}

const radio = (name: string) => screen.getByRole('radio', { name });

describe('Segmented', () => {
  it('keeps only the checked option in the tab order', async () => {
    const user = userEvent.setup();
    render(<Harness initial="medium" />);
    expect(radio('Small')).toHaveAttribute('tabindex', '-1');
    expect(radio('Medium')).toHaveAttribute('tabindex', '0');
    expect(radio('Huge')).toHaveAttribute('tabindex', '-1');

    await user.click(screen.getByRole('button', { name: 'Before' }));
    await user.tab();
    expect(radio('Medium')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('makes the first enabled option tabbable when none is checked', () => {
    const options = [
      { value: 'small' as const, label: 'Small', disabled: true },
      { value: 'medium' as const, label: 'Medium' },
    ];
    render(<Segmented label="Size" value={'huge' as Size} options={options} onChange={() => {}} />);
    expect(radio('Small')).toHaveAttribute('tabindex', '-1');
    expect(radio('Medium')).toHaveAttribute('tabindex', '0');
  });

  it('moves and selects with the arrow keys, skipping disabled options and wrapping', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="medium" onChange={onChange} />);
    await user.click(radio('Medium'));
    onChange.mockClear();

    await user.keyboard('{ArrowRight}');
    expect(radio('Huge')).toHaveFocus();
    expect(radio('Huge')).toBeChecked();
    expect(radio('Huge')).toHaveAttribute('tabindex', '0');
    expect(radio('Medium')).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{ArrowDown}');
    expect(radio('Small')).toHaveFocus();
    expect(radio('Small')).toBeChecked();

    await user.keyboard('{ArrowLeft}');
    expect(radio('Huge')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(radio('Medium')).toHaveFocus();
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([
      'huge',
      'small',
      'huge',
      'medium',
    ]);
  });

  it('jumps to the first and last enabled options with Home and End', async () => {
    const user = userEvent.setup();
    const options = [
      ...OPTIONS.slice(0, 3),
      { value: 'huge' as const, label: 'Huge', disabled: true },
    ];
    render(<Harness initial="medium" options={options} />);
    await user.click(radio('Medium'));

    await user.keyboard('{End}');
    expect(radio('Medium')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(radio('Small')).toHaveFocus();
    expect(radio('Small')).toBeChecked();
    await user.keyboard('{End}');
    expect(radio('Medium')).toHaveFocus();
    expect(radio('Medium')).toBeChecked();
  });

  it('still selects on click', async () => {
    const user = userEvent.setup();
    render(<Harness initial="small" />);
    await user.click(radio('Huge'));
    expect(radio('Huge')).toBeChecked();
    expect(radio('Small')).not.toBeChecked();
  });
});
