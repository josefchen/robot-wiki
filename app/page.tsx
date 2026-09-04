import Link from 'next/link';
import { So101ChainPreview } from '@/components/home/so101-chain-preview';
import { ReliabilityCompounding } from '@/components/interactive/reliability-compounding';
import { ImageRef } from '@/components/mdx/image-ref';
import { Action } from '@/components/ui';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { SEGMENT_ORDER } from '@/lib/market-map';
import { so101Preview } from '@/lib/so101-kinematics';
import { COMPANIES } from '@/data/companies';
import {
  DOMAINS,
  DOMAIN_META,
  modulesByDomain,
} from '@/data/modules';

/**
 * Home: the brand title sheet, the seven-domain typographic index, the live
 * featured interactive as the visual anchor, visual entry points for the
 * playground and market map, and the reading guidance folded into the page
 * flow.
 *
 * Structure follows architecture.md 6c and the home page doctrine in
 * library/design-system.md 12.1: the taxonomy appears exactly once in main
 * (the index), never as a grid of equal bordered cards, and no
 * build-progress metadata renders anywhere. The sections are direct children
 * of <main> (no wrapper div) so each one is a distinct top-level section for
 * the structural-signature checks in contract/design-integrity.md.
 */
const container = 'mx-auto w-full max-w-5xl px-6';

/**
 * The id the SO-101 figure points its `aria-describedby` at. Declared here
 * rather than generated so the figure and its textual alternative are bound
 * by one literal that a test can name.
 */
const SO101_PREVIEW_DESCRIPTION_ID = 'so101-chain-preview-description';

/**
 * The registered structural signature of each top-level home section, as
 * `surface/heading/form`. `VAL-DESIGN-009` and the rubric's
 * `repetition-frames` anchor both bound how many adjacent siblings may share
 * one signature, and the rubric measures runs over the rendered
 * `data-brand-module-signature` values, so an unannotated page is not a
 * varied page: it is a page the measurement cannot see.
 *
 * The three module sections in the middle deliberately share their surface
 * and heading treatment and differ only in content form (a live instrument,
 * a credited photograph, a pair of schematics). That run is exactly three,
 * which is the bound rather than an accident, and the sheet before them and
 * the ruled closing note after them break it on both sides.
 */
const SECTION_SIGNATURES = {
  intro: 'sheet/display-lockup/primary-action',
  domainIndex: 'ruled-plain/index-heading/row-links',
  featured: 'plain/module-heading/live-instrument',
  hardware: 'plain/module-heading/credited-figure',
  tools: 'plain/module-heading/schematic-pair',
  howToRead: 'ruled-plain/closing-heading/guidance-prose',
} as const;

export default function Home() {
  // The adjacent group is a survey rather than a stack of prerequisites,
  // so its four modules are listed individually in the index row: a
  // reader picks a domain by name, then an adjacent topic directly.
  // Core domains keep the domain landing as their single
  // entry point; expanding all of them here would restate the whole
  // taxonomy a third time.
  const adjacentModules = (modulesByDomain().adjacent ?? []).filter(
    (m) => m.status === 'published',
  );

  return (
    <>
      {/* data-pagefind-body sits on each section rather than a wrapper:
          Pagefind excludes every page that declares no body region once
          one page declares one, so the home route needs its own to be
          searchable at all (VAL-SEARCH-021), and a wrapper div would stop
          these sections being direct children of <main>, which the
          structural-signature rules in contract/design-integrity.md
          measure. Interactive readouts inside these sections carry their
          own data-pagefind-ignore, so only the prose is indexed. */}
      <section
        aria-label="Introduction"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.intro}
        className={`${container} pt-8 lg:pt-10`}
      >
        {/* VAL-DSHOME-009: below md the grid is an exact 80px band that
            sits immediately below the descriptor/wordmark lockup and
            closes the hero sheet, with the overview and CTA outside the
            sheet; from md the two-column layout restores (grid right,
            13rem). */}
        <div
          data-brand-surface-id="surface:flat"
          className="flex flex-col border border-border bg-bg md:grid md:grid-cols-[minmax(0,1fr)_13rem]"
        >
          <div className="px-6 pb-6 pt-7 sm:px-8 md:py-8">
            {/* VAL-B2-TYPE-006 / design-system 4.3 lock the home wordmark
                to 52-68px at 375 and 88-120px at 1440 with a 0.88-0.98
                line height. The two clamps hold each band whole rather
                than interpolating between the two widths the contract
                measures: below xl the ramp cannot leave 56-68px, and from
                xl it cannot leave 88-104px, so every width in between
                lands inside a stated band rather than in the gap.
                The band switches at xl rather than lg because the sidebar
                narrows the hero column to 416px at 1024, where the 88px
                floor sets 420px of Tektur and the identity would break in
                half; xl is the first breakpoint that fits it on one
                line. */}
            <h1
              data-tektur-role="home-wordmark"
              className="font-display-home text-[length:clamp(3.5rem,6.4vw,4.25rem)] leading-[0.92] tracking-[-0.035em] text-text xl:text-[length:clamp(5.5rem,6.4vw,6.5rem)]"
            >
              {PUBLIC_IDENTITY}
            </h1>
            {/* The descriptor is the locked string verbatim, sentence case
                in mono (design-system 3.5). No text-transform: a rendered
                casing change would fail the byte comparison in
                VAL-B2-ID-002 while the source still looked correct. */}
            {/* The measure holds the 53-character descriptor on one line
                from sm up: wrapping the locked sentence cost the seventh
                domain link its place in the first viewport
                (VAL-HOME-001). Below sm it wraps as the column allows. */}
            <p className="mt-3 max-w-[56ch] font-mono text-xs leading-relaxed tracking-[0.01em] text-text-dim">
              {PUBLIC_DESCRIPTOR}
            </p>
          </div>
          <div
            id="home-engineering-grid"
            aria-hidden="true"
            data-registration-device
            data-brand-device-id="device:dot-grid"
            data-brand-anchor-selector="#home-engineering-grid"
            data-brand-device-edge="left"
            data-brand-anchor-edge="left"
            data-brand-motif="dot-grid"
            className="engineering-grid pointer-events-none relative h-20 w-full border-b border-border md:h-auto md:min-h-full md:border-b-0 md:border-l"
          >
            <span
              aria-hidden="true"
              data-registration-device
              data-brand-device-id="device:section-rule"
              data-brand-anchor-selector="#home-engineering-grid"
              data-brand-device-edge="center-x"
              data-brand-anchor-edge="center-x"
              data-brand-motif="registration-cross"
              className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 border-l border-border-strong"
            />
            <span
              aria-hidden="true"
              data-registration-device
              data-brand-device-id="device:section-rule"
              data-brand-anchor-selector="#home-engineering-grid"
              data-brand-device-edge="center-y"
              data-brand-anchor-edge="center-y"
              data-brand-motif="registration-cross"
              className="pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2 border-t border-border-strong"
            />
            <span
              aria-hidden="true"
              data-registration-device
              data-brand-device-id="device:registration-cross"
              data-brand-anchor-selector="#home-engineering-grid"
              data-brand-device-edge="center-x"
              data-brand-anchor-edge="center-x"
              data-brand-motif="registration-cross"
              className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 bg-accent"
            />
          </div>
        </div>
        {/* Overview and CTA sit outside the sheet so the 80px band can
            close the hero exactly (the test measures the sheet bottom as
            the grid's bottom). */}
        <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-text-dim">
          {PUBLIC_IDENTITY} is an encyclopedia of modern robotics for engineers who
          already know machine learning. It covers learned manipulation
          policies, sim-to-real reinforcement learning, world models,
          teleoperation data pipelines, and the classical control stack
          underneath them. Every technical claim is{' '}
          {/* The board's editorial-structure panel highlights the one phrase
              a zone is about; here that is the site's premise. <mark> is the
              non-colour carrier: the highlight is announced as marked text
              whether or not the lime is perceived, which is what keeps this
              inside the "never colour alone" rule in design-system 11. */}
          <mark
            data-brand-highlight="home-premise"
            className="whitespace-nowrap bg-selection px-1 text-ink"
          >
            cited to a primary source
          </mark>
          . The centre of gravity is robot learning, and the site is not a
          catalogue of the industry.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Action variant="primary" href="/manipulation/action-chunking">
            Start reading
          </Action>
          <Action variant="link" href="#how-to-read">
            How to read this wiki
          </Action>
        </div>
      </section>

      {/* The seven taxonomy entries as one dense typographic index. */}
      <section
        aria-labelledby="domain-index-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.domainIndex}
        className={`${container} mt-9 border-t border-border-strong pt-5`}
      >
        {/* The index is the page's working half, so its heading outranks the
            module headings below it. The scope sentence that used to sit
            here moved into the premise: two adjacent paragraphs both ending
            on "cited to a primary source" was the same claim twice. */}
        <h2
          id="domain-index-heading"
          data-tektur-role="section-display"
          className="font-display-section text-2xl tracking-tight text-text"
        >
          Domain index
        </h2>
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {DOMAINS.map((domain) => {
            const meta = DOMAIN_META[domain];
            // The adjacent group is a survey rather than a stack of
            // prerequisites, so its row lists the modules themselves as
            // links: the titles double as the description,
            // instead of naming the same four topics twice. Core domains
            // keep the domain landing as their single entry point;
            // expanding them all here would restate the taxonomy a third
            // time.
            const isAdjacent = domain === 'adjacent';
            return (
              <li key={domain}>
                <div className="grid gap-0.5 py-2.5 sm:grid-cols-[16rem_1fr] sm:items-baseline sm:gap-6">
                  <Link
                    data-brand-control-id="control:link-focus"
                    href={`/${domain}/`}
                    className="font-sans text-[15px] font-medium text-text transition-colors hover:text-accent"
                  >
                    {meta.name}
                  </Link>
                  {isAdjacent && adjacentModules.length > 0 ? (
                    <p className="text-sm leading-snug text-text-dim">
                      {adjacentModules.map((m, i) => (
                        <span key={m.slug}>
                          {i > 0
                            ? i === adjacentModules.length - 1
                              ? ', and '
                              : ', '
                            : ''}
                          <Link
                            data-brand-control-id="control:link-focus"
                            href={`/adjacent/${m.slug}/`}
                            className="transition-colors hover:text-accent"
                          >
                            {m.title}
                          </Link>
                        </span>
                      ))}
                      .
                    </p>
                  ) : (
                    <p className="text-sm leading-snug text-text-dim">
                      {meta.description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Featured interactive: the page's visual anchor. */}
      <section
        aria-labelledby="featured-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.featured}
        className={`${container} mt-12`}
      >
        <h2
          id="featured-heading"
          data-tektur-role="section-display"
          className="font-display-section text-xl tracking-tight text-text"
        >
          Featured interactive
        </h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-text-dim">
          A 95% per-step success rate sounds strong. Compounded over a 30-step
          episode it is not. Move the sliders to see how small per-step errors
          erode end-to-end reliability; the{' '}
          <Link
            data-brand-control-id="control:link-focus"
            href="/frontier"
            className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
          >
            frontier essays
          </Link>{' '}
          develop the argument.
        </p>
        <ReliabilityCompounding className="mt-5" />
      </section>

      {/* Real hardware: the encyclopedia's subject, photographed and credited. */}
      <section
        aria-labelledby="hardware-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.hardware}
        className={`${container} mt-14`}
      >
        <h2
          id="hardware-heading"
          data-tektur-role="section-display"
          className="font-display-section text-xl tracking-tight text-text"
        >
          Real hardware
        </h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-text-dim">
          The policies and controllers this wiki covers run on physical
          machines. Every photograph and diagram on the site is licensed and
          credited, and the full list lives on the{' '}
          <Link
            data-brand-control-id="control:link-focus"
            href="/credits"
            className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
          >
            credits page
          </Link>
          .
        </p>
        <ImageRef id="spot-raf-agile-liberty-2021" />
      </section>

      {/* Standalone tools, shown visually rather than described. */}
      <section
        aria-labelledby="tools-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.tools}
        className={`${container} mt-14`}
      >
        <h2
          id="tools-heading"
          data-tektur-role="section-display"
          className="font-display-section text-xl tracking-tight text-text"
        >
          Interactive tools
        </h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {/* The playground entry draws the shipped model rather than an
              impression of it: every segment, joint and limit below comes
              from public/models/so101/so101.urdf, the file the playground
              itself loads (VAL-DESIGN-013). */}
          <article>
            <So101ChainPreview
              preview={so101Preview()}
              descriptionId={SO101_PREVIEW_DESCRIPTION_ID}
            />
            <h3 className="mt-4 font-sans text-sm font-medium text-text">
              <Link
                data-brand-control-id="control:link-focus"
                href="/playground"
                className="hover:text-accent"
              >
                3D Kinematics Playground
              </Link>
            </h3>
            <p className="mt-1 text-sm text-text-dim">
              Drive this arm in the browser: joint-slider forward kinematics,
              click-to-reach inverse kinematics, and trajectory replay.
            </p>
          </article>
          <article>
            <div
              data-brand-surface-id="surface:flat"
              className="rounded-sm bg-surface px-4 py-4"
            >
              <svg
                viewBox="0 0 320 112"
                aria-hidden="true"
                className="block h-36 w-full"
              >
                {/* Structural schematic of the market map: one identical
                    chip per real segment above identical company rows.
                    Deliberately not a bubble scatter: no circle carries a
                    size, no line carries a trend, because no quantity on
                    this teaser is sourced. The one outlined chip depicts
                    the tool's real filter interaction, and the chip count
                    is the segment registry's own length. */}
                {SEGMENT_ORDER.map((segment, i) => (
                  <rect
                    key={segment}
                    x={24 + i * 45}
                    y={16}
                    width={38}
                    height={14}
                    rx={2}
                    fill={i === 0 ? 'none' : 'var(--color-surface-2)'}
                    stroke={
                      i === 0
                        ? 'var(--color-accent)'
                        : 'var(--color-border-strong)'
                    }
                    strokeWidth={1}
                  />
                ))}
                <line
                  x1={24}
                  y1={44}
                  x2={296}
                  y2={44}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                {[56, 70, 84, 98].map((y) => (
                  <g key={y}>
                    <rect
                      x={24}
                      y={y}
                      width={8}
                      height={8}
                      fill="var(--color-logo-plate)"
                    />
                    <rect
                      x={40}
                      y={y + 2}
                      width={110}
                      height={4}
                      fill="var(--color-border-strong)"
                    />
                  </g>
                ))}
              </svg>
            </div>
            <h3 className="mt-4 font-sans text-sm font-medium text-text">
              <Link
                data-brand-control-id="control:link-focus"
                href="/market-map"
                className="hover:text-accent"
              >
                Market Map
              </Link>
            </h3>
            <p className="mt-1 text-sm text-text-dim">
              The embodied-AI industry as data: {COMPANIES.length} companies
              across {SEGMENT_ORDER.length} segments, filterable by approach,
              geography, stage, and funding.
            </p>
          </article>
        </div>
      </section>

      {/* How to read this wiki: guidance woven into the flow, with links. */}
      <section
        id="how-to-read"
        aria-labelledby="how-to-read-heading"
        data-pagefind-body
        data-brand-module-signature={SECTION_SIGNATURES.howToRead}
        className={`${container} mt-14 border-t border-border pt-10 pb-20`}
      >
        {/* A closing note rather than another module: the rule above it and
            the smaller display size say the page has finished offering
            things and is now explaining itself. */}
        <h2
          id="how-to-read-heading"
          data-tektur-role="section-display"
          className="font-display-section text-lg tracking-tight text-text"
        >
          How to read this wiki
        </h2>
        <div className="mt-4 max-w-[65ch] space-y-4 leading-relaxed text-text-dim">
          <p>
            Modules stand alone, but inside a domain they build on each other
            in registry order: later entries assume the earlier ones. If you
            come from machine learning rather than robotics, start with{' '}
            <Link
              data-brand-control-id="control:link-focus"
              href="/manipulation/action-chunking"
              className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
            >
              Action Chunking (ACT and ALOHA)
            </Link>
            . It shows the format every module follows: precise prose, inline
            citations, and a live interactive you can manipulate.
          </p>
          <p>
            The prerequisites are fluency in machine learning, not a robotics
            background. When a module needs a classical result it says so and
            links to the entry that derives it, so you can read forward and
            backfill as needed. Terms of art are defined where they first
            appear and collected in the{' '}
            <Link
              data-brand-control-id="control:link-focus"
              href="/glossary"
              className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
            >
              glossary
            </Link>
            .
          </p>
          <p>
            Every non-obvious claim carries a citation chip that links to the
            paper, lab writeup, or official documentation behind it, and the
            full bibliography sits at the end of each module. Where serious
            researchers disagree, the text names who holds which position.
          </p>
        </div>
      </section>
    </>
  );
}
