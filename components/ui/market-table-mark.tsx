import { getCompanyLogo } from '@/data/logos';
import { MARK_PLACEMENT, markGeometry, markInk } from '@/lib/market-map-marks';
import { LogoMark } from './logo-mark';

/** Decorative by design: the same cell always contains the full, selectable issuer name. */
export function MarketTableMark({ id }: { id: string | null }) {
  const asset = id ? getCompanyLogo(id) : undefined;
  if (!id || !asset) return null;
  const geometry = markGeometry(asset, MARK_PLACEMENT[id], 'table');
  return (
    <span
      aria-hidden="true"
      data-market-table-mark={id}
      className="inline-flex shrink-0 items-center"
      style={{ width: geometry.box.width }}
    >
      <LogoMark
        file={asset.file}
        label=""
        geometry={geometry}
        ink={markInk(id)}
      />
    </span>
  );
}
