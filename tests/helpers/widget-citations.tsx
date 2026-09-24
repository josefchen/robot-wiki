import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { widgetCitationRecords, type CitingWidget } from '@/lib/widget-citations';

/**
 * RTL `render` for widgets that link to primary sources.
 *
 * In production those widgets receive their citation records from the
 * server (components/mdx/article-mounts.tsx); rendered bare they have none,
 * and useCitationLookup throws. This wraps the tree in the provider with
 * exactly the records production resolves for the named widgets, so a
 * state that shows a source the widget's entry in lib/widget-citations.ts
 * does not supply fails the test instead of silently dropping the link.
 */
export function renderWithCitations(...widgets: CitingWidget[]) {
  const records = widgetCitationRecords(...widgets);
  function Wrapper({ children }: { children: ReactNode }) {
    return <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>;
  }
  return (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
    render(ui, { ...options, wrapper: Wrapper });
}
