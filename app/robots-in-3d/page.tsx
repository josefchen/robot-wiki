import type { Metadata } from 'next';
import { PageHeader } from '@/components/data-page/page-header';
import { ModelRecord } from '@/components/model-viewer/model-record';
import { ModelViewer } from '@/components/model-viewer/model-viewer';
import { MODELS_3D } from '@/data/models-3d';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import {
  ROBOTS_IN_3D_PATH,
  ROBOTS_IN_3D_TITLE,
  modelAltText,
  modelCaption,
  modelHeading,
  modelSummary,
  newestChecked,
  robotsIn3dLead,
  urdfUrl,
} from '@/lib/robots-in-3d-page';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { materialAttributes } from '@/lib/site-materials';
import { webPageJsonLd } from '@/lib/structured-data';

const profile = routeSeoProfile(ROBOTS_IN_3D_PATH);

export const metadata: Metadata = {
  title: profile.title,
  description: profile.description,
  // Out of search and out of the sitemap until the page is linked; links on
  // it may still be followed.
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  // Full card blocks restated: a route-level object replaces the layout's
  // for the same key. og:title is the rendered h1.
  openGraph: routeOpenGraph(ROBOTS_IN_3D_TITLE),
  twitter: routeTwitter(ROBOTS_IN_3D_TITLE),
};

/**
 * Each maker model the site ships, in data order: the model drawn from its
 * shipped URDF and meshes, then its provenance record.
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
        <PageHeader title={ROBOTS_IN_3D_TITLE} lead={robotsIn3dLead()} asOf={newestChecked()} />
      </div>

      {MODELS_3D.map((model) => {
        const headingId = `${model.id}-heading`;
        return (
          <section
            key={model.id}
            id={model.id}
            aria-labelledby={headingId}
            data-model-section={model.id}
            className="mt-16 scroll-mt-24 sm:mt-20"
          >
            <h2 id={headingId} className="section-h2">
              {model.product}
            </h2>
            <ModelViewer
              id={model.id}
              product={model.product}
              summary={modelSummary(model)}
              heading={modelHeading(model)}
              caption={modelCaption(model)}
              alt={modelAltText(model)}
              urdf={urdfUrl(model)}
            />
            <ModelRecord model={model} />
          </section>
        );
      })}
    </div>
  );
}
