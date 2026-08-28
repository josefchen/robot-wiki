import Link from 'next/link';
import { ReliabilityCompounding } from '@/components/interactive/reliability-compounding';
import { ImageRef } from '@/components/mdx/image-ref';
import {
  DOMAINS,
  DOMAIN_META,
  modulesByDomain,
} from '@/data/modules';

/**
 * Home: hero premise, the seven-domain typographic index, the live featured
 * interactive as the visual anchor, visual entry points for the playground
 * and market map, and the reading guidance folded into the page flow.
 *
 * Structure follows architecture.md 6c and the home page doctrine in
 * library/design-system.md: the taxonomy appears exactly once in main (the
 * index), never as a grid of equal bordered cards, and no build-progress
 * metadata renders anywhere. The sections are direct children of <main> (no
 * wrapper div) so each one is a distinct top-level section for the
 * structural-signature checks in contract/design-integrity.md.
 */
const container = 'mx-auto w-full max-w-5xl px-6';

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
        className={`${container} pt-8 lg:pt-10`}
      >
        {/* VAL-DSHOME-009: below md the grid is an exact 80px band that
            sits immediately below the descriptor/wordmark lockup and
            closes the hero sheet, with the overview and CTA outside the
            sheet; from md the two-column layout restores (grid right,
            13rem). */}
        <div className="flex flex-col border border-border bg-bg md:grid md:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="px-6 pb-6 pt-7 sm:px-8 md:py-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
              Robotics encyclopaedia
            </p>
            <h1
              data-tektur-role="home-wordmark"
              className="font-display-home mt-3 text-5xl leading-none tracking-[-0.035em] text-text sm:text-6xl"
            >
              robot-wiki
            </h1>
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
          robot-wiki is an encyclopedia of modern robotics for engineers who
          already know machine learning. It covers learned manipulation
          policies, sim-to-real reinforcement learning, world models,
          teleoperation data pipelines, and the classical control stack
          underneath them, with every technical claim cited to a primary
          source.
        </p>
        <Link
          href="/manipulation/action-chunking"
          className="mt-5 inline-flex font-sans text-sm font-medium text-accent underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
        >
          Start reading
        </Link>
      </section>

      {/* The seven taxonomy entries as one dense typographic index. */}
      <section
        aria-labelledby="domain-index-heading"
        data-pagefind-body
        className={`${container} mt-10`}
      >
        <h2
          id="domain-index-heading"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          Domain index
        </h2>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-text-dim">
          The scope is modern robotics with a robot-learning centre of
          gravity: Manipulation &amp; Learned Policies, Classical
          Foundations, and the five domains around them, every claim cited
          to a primary source. It is not a product catalogue, and it makes
          no attempt to cover the whole industry.
        </p>
        <ul className="mt-3 divide-y divide-border border-t border-border">
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
        className={`${container} mt-12`}
      >
        <h2
          id="featured-heading"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          Featured interactive
        </h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-text-dim">
          A 95% per-step success rate sounds strong. Compounded over a 30-step
          episode it is not. Move the sliders to see how small per-step errors
          erode end-to-end reliability; the{' '}
          <Link
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
        className={`${container} mt-14`}
      >
        <h2
          id="hardware-heading"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          Real hardware
        </h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-text-dim">
          The policies and controllers this wiki covers run on physical
          machines. Every photograph and diagram on the site is licensed and
          credited, and the full list lives on the{' '}
          <Link
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
        className={`${container} mt-14`}
      >
        <h2
          id="tools-heading"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          Interactive tools
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Link
            href="/playground"
            className="group block"
          >
            <div className="mb-4 rounded-sm bg-surface px-4 py-3">
              <svg
                viewBox="0 0 320 112"
                aria-hidden="true"
                className="block h-28 w-full"
              >
              {/* Schematic of the SO-101 arm reaching toward an IK target. */}
              <line
                x1={16}
                y1={96}
                x2={304}
                y2={96}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <rect
                x={36}
                y={88}
                width={32}
                height={8}
                fill="var(--color-surface-2)"
                stroke="var(--color-border-strong)"
                strokeWidth={1}
              />
              <line
                x1={52}
                y1={88}
                x2={82}
                y2={52}
                stroke="var(--color-text-dim)"
                strokeWidth={3}
              />
              <line
                x1={82}
                y1={52}
                x2={130}
                y2={40}
                stroke="var(--color-text-dim)"
                strokeWidth={3}
              />
              <line
                x1={130}
                y1={40}
                x2={168}
                y2={58}
                stroke="var(--color-text-dim)"
                strokeWidth={3}
              />
              <circle cx={52} cy={88} r={4} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={82} cy={52} r={4} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={130} cy={40} r={4} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={168} cy={58} r={3.5} fill="var(--color-accent)" />
              <circle
                cx={196}
                cy={44}
                r={7}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={196}
                y1={33}
                x2={196}
                y2={55}
                stroke="var(--color-accent)"
                strokeWidth={1}
              />
              <line
                x1={185}
                y1={44}
                x2={207}
                y2={44}
                stroke="var(--color-accent)"
                strokeWidth={1}
              />
            </svg>
            </div>
            <h3 className="font-sans text-sm font-medium text-text group-hover:text-accent">
              3D Kinematics Playground
            </h3>
            <p className="mt-1 text-sm text-text-dim">
              Drive an SO-101 robot arm in the browser: joint-slider forward
              kinematics, click-to-reach inverse kinematics, and trajectory
              replay.
            </p>
          </Link>
          <Link
            href="/market-map"
            className="group block"
          >
            <div className="mb-4 rounded-sm bg-surface px-4 py-3">
              <svg
                viewBox="0 0 320 112"
                aria-hidden="true"
                className="block h-28 w-full"
              >
              {/* Structural schematic of the market map: one identical
                  chip per real segment (six) above identical company
                  rows. Deliberately not a bubble scatter: no circle
                  carries a size, no line carries a trend, because no
                  quantity on this teaser is sourced. The one outlined
                  chip depicts the tool's real filter interaction. */}
              <rect
                x={24}
                y={16}
                width={38}
                height={14}
                rx={2}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1}
              />
              {[1, 2, 3, 4, 5].map((i) => (
                <rect
                  key={i}
                  x={24 + i * 45}
                  y={16}
                  width={38}
                  height={14}
                  rx={2}
                  fill="var(--color-surface-2)"
                  stroke="var(--color-border-strong)"
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
            <h3 className="font-sans text-sm font-medium text-text group-hover:text-accent">
              Market Map
            </h3>
            <p className="mt-1 text-sm text-text-dim">
              The embodied-AI industry as data: 111 companies across six
              segments, filterable by approach, geography, stage, and funding.
            </p>
          </Link>
        </div>
      </section>

      {/* How to read this wiki: guidance woven into the flow, with links. */}
      <section
        id="how-to-read"
        aria-labelledby="how-to-read-heading"
        data-pagefind-body
        className={`${container} mt-14 border-t border-border pt-10 pb-20`}
      >
        <h2
          id="how-to-read-heading"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          How to read this wiki
        </h2>
        <div className="mt-4 max-w-[65ch] space-y-4 leading-relaxed text-text-dim">
          <p>
            Modules stand alone, but inside a domain they build on each other
            in registry order: later entries assume the earlier ones. If you
            come from machine learning rather than robotics, start with{' '}
            <Link
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
