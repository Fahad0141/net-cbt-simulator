import { render, screen, within } from '@testing-library/react';
import { BarChart, Donut, LineChart, Sparkline } from './charts';

describe('charts', () => {
  it('LineChart renders an accessible SVG, legend and data table', () => {
    const { container } = render(
      <LineChart
        title="Score trend"
        description="Scores went up."
        xLabel="Attempt"
        yLabel="Score"
        series={[
          {
            id: 'eng',
            label: 'Engineering',
            points: [
              { x: 1, y: 40 },
              { x: 3, y: 70 },
            ],
          },
          { id: 'bus', label: 'Business', points: [{ x: 2, y: 55, label: 'Second attempt' }] },
        ]}
      />,
    );
    const svg = screen.getByRole('img', { name: /score trend/i });
    // Short name from <title>; the sentence in <desc> is the description, not part of the name.
    expect(svg).toHaveAccessibleName('Score trend');
    expect(svg).toHaveAccessibleDescription('Scores went up.');
    expect(svg.querySelector('title')).toHaveTextContent('Score trend');
    expect(svg.querySelector('desc')).toHaveTextContent('Scores went up.');
    expect(container.querySelectorAll('path')).toHaveLength(1); // single-point series draws no line
    expect(
      within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    const table = screen.getByRole('table', { hidden: true });
    expect(within(table).getByText('Second attempt')).toBeInTheDocument();
    expect(within(table).getByText('70%')).toBeInTheDocument();
    // Rows read chronologically across series, with point labels in their own column.
    const cells = (row: HTMLElement) =>
      within(row)
        .getAllByRole('cell', { hidden: true })
        .map((c) => c.textContent);
    const [head, ...body] = within(table).getAllByRole('row', { hidden: true });
    expect(
      within(head as HTMLElement)
        .getAllByRole('columnheader', { hidden: true })
        .map((c) => c.textContent),
    ).toEqual(['Series', 'Attempt', 'Score', 'Details']);
    expect(body.map((row) => cells(row))).toEqual([
      ['Engineering', '1', '40%', ''],
      ['Business', '2', '55%', 'Second attempt'],
      ['Engineering', '3', '70%', ''],
    ]);
    // Point tooltips carry the series, x, detail and value.
    expect([...svg.querySelectorAll('g[data-series] title')].map((t) => t.textContent)).toContain(
      'Business · 2 · Second attempt: 55%',
    );
    // figcaption must be the figure's first or last child; the data table sits outside the figure.
    const figure = svg.closest('figure') as HTMLElement;
    expect(figure.lastElementChild?.tagName).toBe('FIGCAPTION');
    expect(figure.contains(table)).toBe(false);
  });

  it('LineChart shows a message without data', () => {
    render(<LineChart title="Empty" description="Nothing." series={[]} />);
    expect(screen.getByText('No data to plot yet.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('BarChart lists labels and values, tolerating missing values', () => {
    render(
      <BarChart
        title="Accuracy"
        marker={{ value: 50, label: 'Target' }}
        data={[
          { key: 'a', label: 'Maths', text: 'Maths', value: 80, display: '80%', hint: '8 of 10' },
          { key: 'b', label: 'Physics', text: 'Physics', value: null, display: '—' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Accuracy' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  it('BarChart shows empty text without data', () => {
    render(<BarChart title="Nothing" data={[]} emptyText="Nothing yet" />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('Donut describes its slices', () => {
    render(
      <Donut
        title="Outcomes"
        centre="75%"
        slices={[
          { key: 'c', label: 'Correct', value: 3, color: 'var(--success)' },
          { key: 'w', label: 'Wrong', value: 1, color: 'var(--danger)' },
        ]}
      />,
    );
    const svg = screen.getByRole('img', { name: /outcomes/i });
    expect(svg.querySelector('desc')).toHaveTextContent('Correct 3 (75%), Wrong 1 (25%)');
  });

  it('Sparkline needs at least two values', () => {
    const { container, rerender } = render(<Sparkline values={[50]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Sparkline values={[50, 70]} label="Improving" />);
    expect(screen.getByRole('img', { name: 'Improving' })).toBeInTheDocument();
  });
});
