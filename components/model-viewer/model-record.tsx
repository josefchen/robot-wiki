import type { Model3d } from '@/data/models-3d';
import { TableScroll } from '@/components/ui/table-scroll';
import { recordRows, type RecordRow } from '@/lib/robots-in-3d-page';
import { cx } from '@/lib/utils';

const LINK = 'ink-link [overflow-wrap:anywhere]';

function Value({ row }: { row: RecordRow }) {
  const text = row.date ? <time dateTime={row.date}>{row.text}</time> : row.text;
  const external = row.href?.startsWith('http');
  return (
    <>
      {row.href ? (
        <a
          href={row.href}
          data-brand-control-id="control:link-focus"
          className={LINK}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {text}
        </a>
      ) : (
        text
      )}
      {row.detail ? (
        <span className={cx('text-text-dim', !row.detailMono && 'font-sans')}>, {row.detail}</span>
      ) : null}
    </>
  );
}

/**
 * A model's provenance record as a definition table in the site's booktabs
 * style: one row per field, the field's name as the row header, figures,
 * file names and hashes in the monospace.
 */
export function ModelRecord({ model }: { model: Model3d }) {
  const captionId = `${model.id}-record`;
  return (
    <TableScroll labelledBy={captionId} className="relative mt-2">
      <table className="booktabs" data-model-record={model.id}>
        <caption id={captionId} className="sr-only">
          Files of the {model.product}
        </caption>
        <tbody>
          {recordRows(model).map((row) => (
            <tr key={row.key} data-record-row={row.key} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="w-[38%] text-left text-[13px] font-normal leading-[1.45] text-text-dim sm:w-[15rem]"
              >
                {row.label}
              </th>
              <td className={cx(row.mono ? 'font-mono text-[13px] tabular-nums' : 'text-[14px]', '[overflow-wrap:anywhere]')}>
                <Value row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
