import { Fragment, type ReactNode } from 'react';
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
/**
 * On a phone each table shows two columns. The maker and formats move to
 * lines in the robots cell, an official row's licence under its repository,
 * the checked date under the page read, and a restricted row's licence and
 * clause or a no-licence row's note to a full-width row directly below, so
 * every table fits its frame and each value stays with its maker.
 */
const WIDE_ONLY = 'hidden sm:table-cell';
const PHONE_ONLY = 'sm:hidden';
/** The first and last cells a phone shows keep the table's edge padding. */
const PHONE_FIRST = 'max-sm:pl-1!';
const PHONE_LAST = 'max-sm:pr-1!';

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

function Robots({ row, formats }: { row: MakerModelSource; formats: boolean }) {
  const hosted = hostedLink(row);
  return (
    <>
      <span data-phone-maker="" data-phone-only="" className={cx('mb-1 block font-semibold', PHONE_ONLY)}>
        {row.maker}
      </span>
      {row.robots.map((name, index) => (
        <Fragment key={index}>
          {index > 0 ? ', ' : null}
          {/* A one-word model name such as G1-D or UR10g-1750 never breaks at its hyphen. */}
          <span className={/\s/.test(name) ? undefined : 'whitespace-nowrap'}>{name}</span>
        </Fragment>
      ))}
      {formats ? (
        <span data-phone-only="" className={cx(MONO, 'mt-1 block text-text-dim', PHONE_ONLY)}>
          {row.formats.join(', ')}
        </span>
      ) : null}
      {hosted ? (
        <span className={cx(DIM, 'mt-1 block')}>
          Drawn above: <Link link={hosted} />
        </span>
      ) : null}
    </>
  );
}

function Repository({ row, licence }: { row: MakerModelSource; licence: boolean }) {
  const link = repositoryLink(row);
  if (!link) return null;
  const commit = registerShortCommit(row);
  const licenceTo = licence ? licenceLink(row) : null;
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
      {licenceTo ? (
        <span data-phone-only="" className={cx('mt-2 block', PHONE_ONLY)}>
          <Link link={licenceTo} />
        </span>
      ) : null}
    </>
  );
}

type Column = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: MakerModelSource) => ReactNode;
};

const maker: Column = { key: 'maker', header: 'Maker', className: cx(WIDE_ONLY, 'w-[8rem]'), cell: (row) => row.maker };
const robotsHeader = (
  <>
    <span className={PHONE_ONLY}>Maker, robots</span>
    <span className="hidden sm:inline">Robots</span>
  </>
);
/** The robots cell, with the formats on a line of their own on a phone when the table lists them. */
const robots = (formats: boolean): Column => ({
  key: 'robots',
  header: robotsHeader,
  className: cx(PHONE_FIRST, 'min-w-[8rem] sm:min-w-[10rem]'),
  cell: (row) => <Robots row={row} formats={formats} />,
});
const formats: Column = {
  key: 'formats',
  header: 'Formats',
  className: cx(WIDE_ONLY, 'whitespace-nowrap'),
  cell: (row) => <span className={MONO}>{row.formats.join(', ')}</span>,
};
/** The repository is the last column a phone shows; `licence` adds the licence under it there. */
const repository = (licence: boolean): Column => ({
  key: 'repository',
  header: 'Repository',
  className: cx(PHONE_LAST, 'min-w-[9rem] sm:min-w-[10rem]'),
  cell: (row) => <Repository row={row} licence={licence} />,
});
const licence: Column = {
  key: 'licence',
  header: 'Licence',
  className: cx(WIDE_ONLY, 'min-w-[8rem]'),
  cell: (row) => {
    const link = licenceLink(row);
    return link ? <Link link={link} /> : null;
  },
};
const Clause = ({ row }: { row: MakerModelSource }) => <span className={DIM}>“{row.clause}”</span>;
const clause: Column = {
  key: 'clause',
  header: 'Limiting clause',
  className: cx(WIDE_ONLY, 'min-w-[15rem]'),
  cell: (row) => <Clause row={row} />,
};
const Note = ({ row }: { row: MakerModelSource }) => <span className={DIM}>{row.note}</span>;
const note: Column = {
  key: 'note',
  header: 'What was read',
  className: cx(WIDE_ONLY, 'min-w-[16rem]'),
  cell: (row) => <Note row={row} />,
};
const pageRead: Column = {
  key: 'page',
  header: 'Page read',
  className: cx(PHONE_LAST, 'min-w-[9rem] sm:min-w-[12rem]'),
  cell: (row) => (
    <>
      {pagesReadLinks(row).map((link) => (
        <span key={link.href} className="block">
          <Link link={link} className={MONO} breakable />
        </span>
      ))}
      <span data-phone-only="" className={cx(DIM, 'mt-1 block', PHONE_ONLY)}>
        Checked <DateText iso={row.checked} />
      </span>
    </>
  ),
};
const checked: Column = {
  key: 'checked',
  header: 'Checked',
  className: cx(WIDE_ONLY, 'whitespace-nowrap'),
  cell: (row) => <DateText iso={row.checked} />,
};

type TableLayout = {
  columns: Column[];
  /** What a phone shows the full width of the table, directly under the row. */
  phoneDetail?: (row: MakerModelSource) => ReactNode;
};

const LAYOUTS: Record<RegisterTable['status'], TableLayout> = {
  official: { columns: [maker, robots(true), formats, repository(true), licence] },
  restricted: {
    columns: [maker, robots(true), formats, repository(false), licence, clause],
    phoneDetail: (row) => {
      const link = licenceLink(row);
      return (
        <>
          {link ? <Link link={link} /> : null}
          <span className="mt-1 block">
            <Clause row={row} />
          </span>
        </>
      );
    },
  },
  'no-licence': { columns: [maker, robots(false), repository(false), note], phoneDetail: (row) => <Note row={row} /> },
  'none-found': { columns: [maker, robots(false), pageRead, checked] },
};

/** A row's hidden columns, the full width of the table, on a phone only. */
function PhoneDetailRow({ row, span, last, children }: { row: MakerModelSource; span: number; last: boolean; children: ReactNode }) {
  return (
    <tr data-phone-only="" data-register-detail={row.id} className={cx(PHONE_ONLY, !last && 'border-b border-border')}>
      <td colSpan={span} className={cx('text-[14px] pt-0!', PHONE_FIRST, PHONE_LAST)}>
        {children}
      </td>
    </tr>
  );
}

/** One status's rows as a booktabs table in its own scroll region, under a heading with its count. */
function RegisterStatusTable({ table }: { table: RegisterTable }) {
  const { columns, phoneDetail } = LAYOUTS[table.status];
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
            {table.rows.map((row, index) => {
              const last = index === table.rows.length - 1;
              // With a detail row under it on a phone, the row's rule moves below that.
              const rule = phoneDetail ? (last ? undefined : 'border-b border-border max-sm:border-b-0') : ROW;
              return (
                <Fragment key={row.id}>
                  <tr data-register-row={row.id} className={rule}>
                    {columns.map((column) => (
                      <td key={column.key} className={cx('text-[14px]', column.className)}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                  {phoneDetail ? (
                    <PhoneDetailRow row={row} span={columns.length} last={last}>
                      {phoneDetail(row)}
                    </PhoneDetailRow>
                  ) : null}
                </Fragment>
              );
            })}
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
