'use client';

/* eslint-disable @next/next/no-img-element -- static export serves plain images */
import { Fragment, useId, useMemo } from 'react';
import Link from 'next/link';
import { NumberText } from '@/components/ui/number-text';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { roleColour } from '@/components/motion/chart';
import { useChartWidth } from '@/components/market-map/use-chart-width';
import {
  MAP_WIDTH,
  OUT_OF_SCALE_TITLE,
  PLATE_PAD,
  labelSentence,
  publicMarketMapLayout,
  smallerBlocksText,
  type MapCompany,
  type MapMark,
  type PlacedTile,
  type PublicMarketMapData,
  type PublicMarketMapText,
} from '@/lib/public-market-map-layout';
import { cx } from '@/lib/utils';

const BLUE = roleColour('highlight');
const GREY = 'var(--color-concrete)';
const WHITE = 'var(--color-white)';
const INK = 'var(--ink)';
const PAPER = 'var(--paper, var(--color-paper))';

const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(3)}%`;

/** A mark as its file, in its own colours, cropped to its artwork box. */
function MarkImage({ mark, name }: { mark: MapMark; name: string }) {
  const { box, image } = mark.geometry.tile;
  const crop = (
    <span
      data-logo-src={mark.file}
      className="relative block overflow-hidden"
      style={{ width: `min(100%, ${box.width}px)`, aspectRatio: `${box.width} / ${box.height}` }}
    >
      <img
        src={mark.file}
        alt={name}
        decoding="async"
        className="absolute max-w-none"
        style={{
          left: percent(image.left, box.width),
          top: percent(image.top, box.height),
          width: percent(image.width, box.width),
          height: percent(image.height, box.height),
        }}
      />
    </span>
  );
  if (mark.ground === 'white') return crop;
  return (
    <span
      data-mark-ground="ink"
      className="block max-w-full px-1 py-0.5"
      style={{ background: INK, width: `calc(${box.width}px + 0.5rem)` }}
    >
      {crop}
    </span>
  );
}

function Tile({ tile }: { tile: PlacedTile }) {
  const { company, label } = tile;
  const pure = company.exposure === 'pure play';
  const text = pure ? WHITE : INK;
  return (
    <g data-tile={company.id} data-label={label.kind}>
      <rect x={tile.x} y={tile.y} width={tile.w} height={tile.h} fill={pure ? BLUE : GREY} stroke={PAPER} strokeWidth={1}>
        <title>{`${company.name}, ${company.valueText}`}</title>
      </rect>
      {label.kind === 'mark' && company.mark ? (
        <>
          <rect
            data-mark-ground={company.mark.ground}
            x={label.plate.x}
            y={label.plate.y}
            width={label.plate.w}
            height={label.plate.h}
            fill={company.mark.ground === 'ink' ? INK : WHITE}
          />
          <svg
            x={label.plate.x + PLATE_PAD.x}
            y={label.plate.y + PLATE_PAD.y}
            width={label.plate.w - 2 * PLATE_PAD.x}
            height={label.plate.h - 2 * PLATE_PAD.y}
          >
            <image
              href={company.mark.file}
              x={label.image.x - label.plate.x - PLATE_PAD.x}
              y={label.image.y - label.plate.y - PLATE_PAD.y}
              width={label.image.w}
              height={label.image.h}
              preserveAspectRatio="none"
            />
          </svg>
        </>
      ) : null}
      {label.kind === 'name'
        ? label.lines.map((line) =>
            line.vertical ? (
              <text key={line.x} transform={`translate(${line.x} ${line.y}) rotate(-90)`} fill={text}>
                {line.text}
              </text>
            ) : (
              <text key={line.y} x={line.x} y={line.y} fill={text}>
                {line.text}
              </text>
            ),
          )
        : null}
      {label.kind !== 'none' && label.value ? (
        <text data-scene-readout="" x={label.value.x} y={label.value.y} fill={text}>
          {label.value.text}
        </text>
      ) : null}
    </g>
  );
}

function OutOfScaleCell({ company }: { company: MapCompany }) {
  return (
    <li
      data-out-of-scale={company.id}
      className="flex min-w-0 flex-col justify-between gap-1.5 border border-dashed bg-white px-2 py-1.5 [border-color:var(--line-strong)]"
    >
      <span className="flex min-h-5 min-w-0 items-center">
        {company.mark ? (
          <MarkImage mark={company.mark} name={company.name} />
        ) : (
          <span className="font-sans text-[12px] leading-4 text-text">{company.shortName}</span>
        )}
      </span>
      <span className="text-[12px] leading-4 text-text"><NumberText>{company.valueText}</NumberText></span>
    </li>
  );
}

/**
 * The public companies market map: one tile per sized company, its area
 * in proportion to market value in US dollars, grouped by segment, pure
 * plays in the accent and companies where robots are a major part grey.
 * Each tile carries its company's own mark on white where the mark fits,
 * else its name, else nothing. The companies where robots are a minor
 * part follow in an outlined row at full value, not to scale. Every
 * number, name and date is computed on the server in lib/public-market-map.ts
 * and arrives as props; only the layout runs here. Nothing animates.
 */
export function PublicMarketMap({
  data,
  text,
  className,
}: {
  data: PublicMarketMapData;
  text: PublicMarketMapText;
  className?: string;
}) {
  const descriptionId = `${useId()}-description`;
  const [chartRef, width] = useChartWidth(MAP_WIDTH.fallback, MAP_WIDTH.minimum);
  const layout = useMemo(() => data.segments.length ? publicMarketMapLayout(width, data) : null, [width, data]);
  if (!layout) return <p className="my-6 text-sm text-text-dim">{text.caption}</p>;
  const smaller = smallerBlocksText(layout);

  return (
    <InstrumentFigure
      figureId="public-market-map"
      className={className}
      heading={text.headline}
      stage={
        <FigureStage
          footer={
            <div className="min-w-0 basis-full">
              {smaller ? (
                <div data-smaller-blocks="" className="font-sans text-[12px] leading-normal text-text-dim">
                  {smaller}
                </div>
              ) : null}
              <div className={cx('font-sans text-[12px] leading-normal text-text-dim', smaller ? 'mt-6' : 'mt-3')}>
                {OUT_OF_SCALE_TITLE}
              </div>
              <ul
                data-out-of-scale-row=""
                className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))]"
              >
                {data.outOfScale.map((company) => (
                  <OutOfScaleCell key={company.id} company={company} />
                ))}
              </ul>
            </div>
          }
        >
          {/* Its own size container: stage.css sizes stage text against 100cqw, which must be this column. */}
          <div ref={chartRef} className="@container min-w-0">
            <PlotStage
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              aria-label="Listed robotics companies sized by market value in US dollars, grouped by segment"
              aria-describedby={descriptionId}
              data-testid="public-market-map-plot"
            >
              {layout.segments.map((segment) => (
                <g key={segment.segment} data-segment={segment.segment}>
                  {segment.tiles.map((tile) => (
                    <Tile key={tile.company.id} tile={tile} />
                  ))}
                  <rect
                    x={segment.x}
                    y={segment.y}
                    width={segment.w}
                    height={segment.h}
                    fill="none"
                    stroke={PAPER}
                    strokeWidth={3}
                  />
                  {segment.band ? (
                    <g data-segment-band="">
                      <text x={segment.band.name.x} y={segment.band.name.y} fill={INK}>
                        {segment.band.name.text}
                      </text>
                      {segment.band.total && (
                        <text data-scene-readout="" x={segment.band.total.x} y={segment.band.total.y} fill={INK}>
                          {segment.band.total.text}
                        </text>
                      )}
                    </g>
                  ) : null}
                </g>
              ))}
            </PlotStage>
          </div>
        </FigureStage>
      }
      caption={text.caption}
      method={
        <>
          <div>
            {text.conversion.map((part, index) =>
              typeof part === 'string' ? (
                <Fragment key={index}>{part}</Fragment>
              ) : (
                <a
                  key={part.href}
                  data-brand-control-id="control:link-focus"
                  href={part.href}
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-2"
                >
                  {part.text}
                </a>
              ),
            )}
          </div>
          <div>{text.shares}</div>
          <div>{labelSentence(layout.counts)}</div>
          {text.outOfScale && <div>{text.outOfScale}</div>}
          <p>
            <Link href="/credits/" className="underline underline-offset-2">Image credits</Link> list each
            company mark’s source and identify marks without a published reuse grant.
          </p>
          <ChartDescription
            id={descriptionId}
            className="[&_table]:min-w-0 [&_th]:px-1.5 [&_td]:px-1.5"
            open
            form="table"
            summary="Market value by segment"
            description={text.description}
            rowHeader="segment"
            columns={[
              { header: 'companies', numeric: true },
              { header: 'market value', numeric: true },
            ]}
            rows={data.segments.map((segment) => ({
              label: segment.label,
              values: [segment.companies, segment.totalText],
            }))}
          />
        </>
      }
      source={text.source}
    />
  );
}
