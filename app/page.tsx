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
        className={`${container} pt-12 lg:pt-16`}
      >
        <h1 className="font-sans text-4xl font-semibold tracking-tight text-text md:text-5xl">
          robot-wiki
        </h1>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-text-dim">
          robot-wiki is an encyclopedia of modern robotics for engineers who
          already know machine learning. It covers learned manipulation
          policies, sim-to-real reinforcement learning, world models,
          teleoperation data pipelines, and the classical control stack
          underneath them, with every technical claim cited to a primary
          source.
        </p>
        <div className="mt-6">
          <Link
            href="/manipulation/action-chunking"
            className="inline-block rounded-sm border border-accent px-4 py-2 font-sans text-sm font-medium text-accent transition-colors hover:bg-surface-2 active:translate-y-[1px]"
          >
            Start reading
          </Link>
        </div>
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
              {/* A bubble field in the spirit of the market map scatter view. */}
              <line
                x1={24}
                y1={96}
                x2={304}
                y2={96}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <line
                x1={24}
                y1={96}
                x2={24}
                y2={12}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <circle cx={52} cy={78} r={5} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={84} cy={60} r={8} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={112} cy={80} r={4} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={138} cy={48} r={10} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={166} cy={66} r={6} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={192} cy={36} r={9} fill="var(--color-accent)" opacity={0.85} />
              <circle cx={218} cy={58} r={5} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={244} cy={28} r={7} fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth={1} />
              <circle cx={270} cy={48} r={4} fill="var(--color-accent)" opacity={0.85} />
              <path
                d="M40 84 L280 26"
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
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
