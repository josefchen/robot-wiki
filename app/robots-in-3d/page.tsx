import type { Metadata } from 'next';
import { PageHeader } from '@/components/data-page/page-header';
import { MakerFilesRegister } from '@/components/maker-model-sources/maker-files-register';
import { ModelRecord } from '@/components/model-viewer/model-record';
import { ModelViewer } from '@/components/model-viewer/model-viewer';
import { MODELS_3D } from '@/data/models-3d';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  MAKER_FILES_ID,
  MAKER_FILES_TITLE,
  ROBOTS_IN_3D_PATH,
  ROBOTS_IN_3D_TITLE,
  modelBlockId,
  modelViewerProps,
  pageAsOf,
  registerLead,
  registerTables,
  robotsIn3dPageLead,
} from '@/lib/robots-in-3d-page';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { materialAttributes } from '@/lib/site-materials';
import { webPageJsonLd } from '@/lib/structured-data';

const profile = routeSeoProfile(ROBOTS_IN_3D_PATH);

export const metadata: Metadata = {
  title: profile.title,
  description: profile.description,
  // Full card blocks restated: a route-level object replaces the layout's
  // for the same key. og:title is the rendered h1.
  openGraph: routeOpenGraph(ROBOTS_IN_3D_TITLE),
  twitter: routeTwitter(ROBOTS_IN_3D_TITLE),
};

/**
 * Each maker model the site ships, in data order: the model drawn from its
 * shipped URDF and meshes (a still of it until the reader loads it), then
 * its provenance record. Below them, where makers publish their own model
 * files, one table per status.
 */
export default function RobotsIn3dPage() {
  return (
    <div className="sheet sheet-masthead pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({ path: ROBOTS_IN_3D_PATH, name: ROBOTS_IN_3D_TITLE, description: profile.description }),
        }}
      />
      <div data-pagefind-body {...materialAttributes('paper')} className="material-paper">
        <PageHeader title={ROBOTS_IN_3D_TITLE} lead={robotsIn3dPageLead()} asOf={pageAsOf()} />
      </div>

      {MODELS_3D.map((model) => {
        const blockId = modelBlockId(model);
        const headingId = `${blockId}-heading`;
        return (
          <section
            key={model.id}
            id={blockId}
            aria-labelledby={headingId}
            data-model-section={model.id}
            className="mt-16 scroll-mt-24 sm:mt-20"
          >
            <h2 id={headingId} className="section-h2">
              {model.product}
            </h2>
            <ModelViewer {...modelViewerProps(model)} />
            <ModelRecord model={model} />
          </section>
        );
      })}

      <section id={MAKER_FILES_ID} aria-labelledby={`${MAKER_FILES_ID}-heading`} className="mt-16 scroll-mt-24 sm:mt-20">
        <h2 id={`${MAKER_FILES_ID}-heading`} className="section-h2">
          {MAKER_FILES_TITLE}
        </h2>
        <p className="mt-3 max-w-[40rem] font-sans text-[16px] leading-[1.6] text-text">{registerLead()}</p>
        <MakerFilesRegister tables={registerTables()} />
      </section>
    </div>
  );
}
