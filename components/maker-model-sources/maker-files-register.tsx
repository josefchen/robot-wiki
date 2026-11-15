import type { ReactNode } from 'react';
import { TableScroll } from '@/components/ui/table-scroll';
import type { MakerModelSource } from '@/data/maker-model-sources';
import { formatShortDate } from '@/lib/market-map';
import {
  hostedLink,
  licenceLink,
  pagesReadLinks,
  registerShortCommit,
  registerTableHeading,
  repositoryLink,
  type RegisterLink,
  type RegisterTable,
} from '@/lib/robots-in-3d-page';
import { cx } from '@/lib/utils';

const ROW = 'border-b border-border last:border-b-0';
const HEAD = 'text-left text-[13px] font-semibold';
const DIM = 'text-[13px] leading-[1.45] text-text-dim';
const MONO = 'font-mono text-[13px] tabular-nums';
const WRAP = '[overflow-wrap:break-word]';
const SUBHEAD = 'mt-12 font-sans text-[16px] font-semibold leading-6 text-text';
/** On a phone the maker leaves its column for a line above the robots. */
const WIDE_ONLY = 'hidden sm:table-cell';

/** An address or repository name, breakable after each slash, underscore and dot. */
function Breakable({ text }: { text: string }) {
  const parts = text.split(/(?<=[/_.])/);
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 ? <wbr /> : null}
        </span>
      ))}
    </>
  );
}

function Link({ link, className, breakable }: { link: RegisterLink; className?: string; breakable?: boolean }) {
  const external = link.href.startsWith('http');
  return (
    <a
      href={link.href}
      data-brand-control-id="control:link-focus"
      className={cx('ink-link', WRAP, className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {breakable ? <Breakable text={link.text} /> : link.text}
    </a>
  );
}

function DateText({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="whitespace-nowrap">
      {formatShortDate(iso)}
    </time>
  );
}

function Robots({ row }: { row: MakerModelSource }) {
  const hosted = hostedLink(row);
  return (
    <>
      <span data-phone-maker="" className="mb-1 block font-semibold sm:hidden">
        {row.maker}
      </span>
      {row.robots.join(', ')}
      {hosted ? (
        <span className={cx(DIM, 'mt-1 block')}>
          Drawn above: <Link link={hosted} />
        </span>
      ) : null}
    </>
  );
}

function Repository({ row }: { row: MakerModelSource }) {
  const link = repositoryLink(row);
  if (!link) return null;
  const commit = registerShortCommit(row);
  return (
    <>
      <Link link={link} className={MONO} breakable />
      <span className={cx(DIM, 'mt-1 block')}>
        {commit && row.commit ? (
          <>
            <span className={MONO}>{commit}</span>, <DateText iso={row.commit.date} />
          </>
        ) : (
          'no commit'
        )}
      </span>
    </>
  );
}

type Column = {
  key: string;
  header: string;
  className?: string;
  cell: (row: MakerModelSource) => ReactNode;
};

const maker: Column = { key: 'maker', header: 'Maker', className: cx(WIDE_ONLY, 'w-[8rem]'), cell: (row) => row.maker };
const robots: Column = { key: 'robots', header: 'Robots', className: 'min-w-[10rem]', cell: (row) => <Robots row={row} /> };
const formats: Column = {
  key: 'formats',
  header: 'Formats',
  className: 'whitespace-nowrap',
  cell: (row) => <span className={MONO}>{row.formats.join(', ')}</span>,
};
const repository: Column = {
  key: 'repository',
  header: 'Repository',
  className: 'min-w-[10rem]',
  cell: (row) => <Repository row={row} />,
};
const licence: Column = {
  key: 'licence',
  header: 'Licence',
  className: 'min-w-[8rem]',
  cell: (row) => {
    const link = licenceLink(row);
    return link ? <Link link={link} /> : null;
  },
};
const clause: Column = {
  key: 'clause',
  header: 'Limiting clause',
  className: 'min-w-[15rem]',
  cell: (row) => <span className={DIM}>“{row.clause}”</span>,
};
const note: Column = {
  key: 'note',
  header: 'What was read',
  className: 'min-w-[16rem]',
  cell: (row) => <span className={DIM}>{row.note}</span>,
};
const pageRead: Column = {
  key: 'page',
  header: 'Page read',
  className: 'min-w-[12rem]',
  cell: (row) => (
    <>
      {pagesReadLinks(row).map((link) => (
        <span key={link.href} className="block">
          <Link link={link} className={MONO} breakable />
        </span>
      ))}
    </>
  ),
};
const checked: Column = {
  key: 'checked',
  header: 'Checked',
  className: 'whitespace-nowrap',
  cell: (row) => (
    <span className={MONO}>
      <DateText iso={row.checked} />
    </span>
  ),
};

const COLUMNS: Record<RegisterTable['status'], Column[]> = {
  official: [maker, robots, formats, repository, licence],
  restricted: [maker, robots, formats, repository, licence, clause],
  'no-licence': [maker, robots, repository, note],
  'none-found': [maker, robots, pageRead, checked],
};

/** One status's rows as a booktabs table in its own scroll region, under a heading with its count. */
function RegisterStatusTable({ table }: { table: RegisterTable }) {
  const columns = COLUMNS[table.status];
  return (
    <div data-register-table={table.status}>
      <h3 id={table.id} className={SUBHEAD}>
        {registerTableHeading(table)}
      </h3>
      <TableScroll labelledBy={table.id} className="relative mt-4">
        <table className="booktabs min-w-full" aria-labelledby={table.id}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cx(HEAD, column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.id} data-register-row={row.id} className={ROW}>
                {columns.map((column) => (
                  <td key={column.key} className={cx('text-[14px]', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
}

/** The register's four tables, in the order registerTables() gives them. */
export function MakerFilesRegister({ tables }: { tables: readonly RegisterTable[] }) {
  return (
    <>
      {tables.map((table) => (
        <RegisterStatusTable key={table.status} table={table} />
      ))}
    </>
  );
}
