import Link from 'next/link';
import { Card } from '@/components/ui';
import { ReliabilityCompounding } from '@/components/interactive/reliability-compounding';
import { CORE_DOMAINS, DOMAIN_META, modulesByDomain } from '@/data/modules';

const grouped = modulesByDomain();

function publishedCount(domain: string): number {
  return (grouped[domain] ?? []).filter((m) => m.status === 'published')
    .length;
}

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-14 pb-20 lg:pt-20">
      {/* Hero: the premise, kept above the fold. */}
      <section aria-label="Introduction">
        <h1 className="font-sans text-4xl font-semibold tracking-tight text-text md:text-5xl">
          robot-wiki
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-text-dim">
          An encyclopedic, interactive guide to modern robotics for ML
          engineers, from learned manipulation policies to the classical stack
          underneath them.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/manipulation/action-chunking"
            className="rounded-sm border border-accent px-4 py-2 font-sans text-sm font-medium text-accent transition-colors hover:bg-surface-2 active:translate-y-[1px]"
          >
            Start reading
          </Link>
          <a
            href="#how-to-read"
            className="text-sm text-text-dim underline decoration-border-strong underline-offset-4 transition-colors hover:text-text"
          >
            How to read this wiki
          </a>
        </div>
      </section>

      {/* The six core domains. */}
      <section aria-labelledby="core-domains" className="mt-16">
        <h2
          id="core-domains"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          The six core domains
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CORE_DOMAINS.map((domain) => {
            const meta = DOMAIN_META[domain];
            const mods = grouped[domain] ?? [];
            const published = publishedCount(domain);
            return (
              <Card key={domain} href={`/${domain}/`} title={meta.name}>
                <p>{meta.description}</p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
                  {published > 0
                    ? `${published} of ${mods.length} modules published`
                    : `${mods.length} modules planned`}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Adjacent domains: one distinguished strip with its four modules. */}
      <section aria-labelledby="adjacent-domains" className="mt-14">
        <h2
          id="adjacent-domains"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          Adjacent domains
        </h2>
        <Link
          href="/adjacent"
          className="group mt-5 block rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-sans text-sm font-medium text-text group-hover:text-accent">
              {DOMAIN_META.adjacent.name}
            </h3>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
              {(grouped.adjacent ?? []).length} modules planned
            </span>
          </div>
          <p className="mt-1 text-sm text-text-dim">
            {DOMAIN_META.adjacent.description}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(grouped.adjacent ?? []).map((m) => (
              <li
                key={m.slug}
                className="rounded-sm border border-border bg-surface-2 px-3 py-2 text-sm text-text-dim"
              >
                {m.title}
              </li>
            ))}
          </ul>
        </Link>
      </section>

      {/* Standalone tools: market map and playground. */}
      <section aria-labelledby="tools" className="mt-14">
        <h2
          id="tools"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          Interactive tools
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <Link
            href="/market-map"
            className="group rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:p-5 md:col-span-3"
          >
            <h3 className="font-sans text-sm font-medium text-text group-hover:text-accent">
              Market Map
            </h3>
            <p className="mt-1 text-sm text-text-dim">
              The embodied-AI industry as data: more than a hundred companies
              across foundation models, humanoids, industrial systems, vertical
              applications, simulation, and components, filterable by approach,
              geography, stage, and funding.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
              6 segments, 100+ companies
            </p>
          </Link>
          <Link
            href="/playground"
            className="group rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:p-5 md:col-span-2"
          >
            <h3 className="font-sans text-sm font-medium text-text group-hover:text-accent">
              3D Kinematics Playground
            </h3>
            <p className="mt-1 text-sm text-text-dim">
              Move a real robot arm: joint-slider forward kinematics,
              click-to-reach inverse kinematics, and trajectory replay.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
              FK, IK, replay
            </p>
          </Link>
        </div>
      </section>

      {/* How to read this wiki. */}
      <section
        id="how-to-read"
        aria-labelledby="how-to-read-heading"
        className="mt-14 border-t border-border pt-10"
      >
        <h2
          id="how-to-read-heading"
          className="font-sans text-xl font-semibold tracking-tight text-text"
        >
          How to read this wiki
        </h2>
        <div className="mt-4 max-w-[65ch] space-y-4 leading-relaxed text-text-dim">
          <p>
            Six core domains form the spine:{' '}
            <Link
              href="/manipulation"
              className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
            >
              Manipulation &amp; Learned Policies
            </Link>
            , reinforcement learning and sim-to-real, world models, data,
            hardware and evaluation,{' '}
            <Link
              href="/classical"
              className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
            >
              classical foundations
            </Link>
            , and the frontier of open problems. A seventh group, Adjacent
            Domains, sketches vehicles, drones, surgical, and space robotics
            in brief.
          </p>
          <p>
            Modules stand alone, but within a domain they build on each other
            in registry order. If you come from ML, start with the first
            published module,{' '}
            <Link
              href="/manipulation/action-chunking"
              className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
            >
              Action Chunking (ACT and ALOHA)
            </Link>
            : precise prose, inline citations to primary sources, and a live
            interactive you can manipulate. That is the format every module
            follows. Every non-obvious claim carries a citation chip that
            links to the paper, lab writeup, or official documentation behind
            it.
          </p>
          <p>
            Planned modules appear in the taxonomy before they are written, so
            the sidebar doubles as the roadmap. Draft entries are marked
            planned and go live as they are reviewed.
          </p>
        </div>
      </section>

      {/* Featured interactive. */}
      <section aria-labelledby="featured" className="mt-14 border-t border-border pt-10">
        <h2
          id="featured"
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
            Frontier domain
          </Link>{' '}
          develops the argument.
        </p>
        <ReliabilityCompounding className="mt-5" />
      </section>
    </div>
  );
}
