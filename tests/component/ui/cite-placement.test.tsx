import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitationNumbersProvider } from '@/components/article/citation-numbers';
import { Cite } from '@/components/ui/cite';

/*
 * Owner-approved successor (Josef, 2026-10-10, the Pantheon standard). The
 * floating citation tooltip, and with it every placement rule this file used
 * to pin (above or below, viewport clamping, sticky-header avoidance, scroll
 * and resize listeners, the scrollable overflow box), is retired. A citation
 * inside an article is now a superscript number whose note stands in the
 * right margin from 1200px and opens inline under its line everywhere else.
 * Placement is CSS (app/globals.css, `.sidenote`); what script still decides
 * is pinned here: the shared number, the description wiring, and when the
 * number opens the note in place versus jumping to the References entry.
 */
const props = {
  citeId: 'example',
  label: 'Example 2026',
  title: 'A complete reference.',
  meta: 'The full author list remains readable.',
  href: 'https://example.org/source',
  referenceHref: '#ref-example',
};

function mount(numbers: Record<string, number> = { example: 7 }) {
  return render(
    <CitationNumbersProvider numbers={numbers}>
      <p>
        A sentence that cites a source
        <Cite {...props} />.
      </p>
    </CitationNumbersProvider>,
  );
}

const mark = () => screen.getByRole('link', { name: /^source\s*7$/i });
const noteOf = (link: HTMLElement) =>
  document.getElementById(link.getAttribute('aria-describedby') ?? '')!;

/** Pretends the stylesheet floated the note into the right margin. */
function floatNotes(float: string) {
  const real = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = real(element, pseudo);
    if (!(element as HTMLElement).hasAttribute?.('data-sidenote')) return style;
    return new Proxy(style, {
      get: (target, key) => (key === 'float' ? float : Reflect.get(target, key)),
    });
  });
}

afterEach(() => vi.restoreAllMocks());

describe('Cite sidenote', () => {
  it('renders a superscript number that names its References entry', () => {
    mount();
    const link = mark();
    expect(link.closest('sup')).not.toBeNull();
    expect(link).toHaveAttribute('href', '#ref-example');
    expect(link).not.toHaveAttribute('target');
    expect(link.textContent).toBe('Source 7');
    expect(link).toHaveAttribute('data-brand-control-id', 'control:link-focus');
  });

  it('describes the number with its note: number, linked label and title', () => {
    mount();
    const note = noteOf(mark());
    expect(note).toHaveAttribute('data-sidenote');
    expect(within(note).getByText('7')).toHaveClass('sidenote-index');
    const source = within(note).getByRole('link', { name: props.label });
    expect(source).toHaveAttribute('href', props.href);
    expect(source).toHaveAttribute('target', '_blank');
    expect(source).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(note).toHaveTextContent(props.title);
    expect(note).toHaveTextContent(props.meta);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens the note in place when there is no margin, and closes it again', () => {
    floatNotes('none');
    mount();
    const link = mark();
    const note = noteOf(link);
    expect(note).toHaveAttribute('data-open', 'false');
    expect(fireEvent.click(link)).toBe(false);
    expect(note).toHaveAttribute('data-open', 'true');
    expect(fireEvent.click(link)).toBe(false);
    expect(note).toHaveAttribute('data-open', 'false');
  });

  it('treats an unresolved float as no margin', () => {
    floatNotes('');
    mount();
    const link = mark();
    expect(fireEvent.click(link)).toBe(false);
    expect(noteOf(link)).toHaveAttribute('data-open', 'true');
  });

  it('lets the number jump to the References entry when the note is in the margin', () => {
    floatNotes('right');
    mount();
    const link = mark();
    expect(fireEvent.click(link)).toBe(true);
    expect(noteOf(link)).toHaveAttribute('data-open', 'false');
  });

  it('keeps only the author-year label in the search index', () => {
    mount();
    const link = mark();
    const note = noteOf(link);
    // The number would fuse onto the cited word in excerpts ("late7"); the
    // title and venue would fuse onto the prose. The label stays indexed,
    // so an author name still finds the article.
    expect(link.closest('sup')).toHaveAttribute('data-pagefind-ignore');
    expect(note).not.toHaveAttribute('data-pagefind-ignore');
    expect(within(note).getByRole('link', { name: props.label }).closest('[data-pagefind-ignore]')).toBeNull();
    expect(within(note).getByText('7')).toHaveAttribute('data-pagefind-ignore');
    expect(within(note).getByText(`, ${props.title}`)).toHaveAttribute('data-pagefind-ignore');
    expect(within(note).getByText(`. ${props.meta}`)).toHaveAttribute('data-pagefind-ignore');
  });

  it('gives every citation of one source the same number', () => {
    render(
      <CitationNumbersProvider numbers={{ example: 3, other: 4 }}>
        <p>
          First
          <Cite {...props} />
          , second
          <Cite {...props} citeId="other" referenceHref="#ref-other" />
          , again
          <Cite {...props} />.
        </p>
      </CitationNumbersProvider>,
    );
    const numbers = [...document.querySelectorAll('.cite-mark a')].map((a) =>
      a.textContent?.replace('Source ', ''),
    );
    expect(numbers).toEqual(['3', '4', '3']);
  });

  it('falls back to the author-year label for a source the article does not number', () => {
    mount({});
    expect(screen.queryByRole('link', { name: /source/i })).toBeNull();
    const label = screen.getByRole('link', { name: props.label });
    expect(label).toHaveAttribute('href', props.href);
    expect(noteOf(label)).toHaveTextContent(`${props.title}. ${props.meta}.`);
  });
});
