import { IntentLink } from '@/components/ui/intent-link';
import { CONTENT_CORRECTION_URL, REPOSITORY_URL } from '@/lib/identity';

/**
 * "How this wiki is made": three statements, each with the page, the
 * repository or the form that backs it. The editorial policy, the credits
 * and the licence files say the rest.
 */
export function HowMade() {
  return (
    <ul className="home-cells">
      <li data-made="sources">
        <p className="home-statement">Every number has a source.</p>
        <p className="home-more">
          <IntentLink
            data-brand-control-id="control:link-focus"
            href="/editorial-policy/"
            className="ink-link"
          >
            Editorial policy
          </IntentLink>
        </p>
      </li>
      <li data-made="licenses">
        <p className="home-statement">Text is CC BY 4.0, code is MIT.</p>
        <p className="home-more">
          <IntentLink
            data-brand-control-id="control:link-focus"
            href="/credits/"
            className="ink-link"
          >
            Credits
          </IntentLink>
          <a
            data-brand-control-id="control:link-focus"
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener"
            className="ink-link"
          >
            Source on GitHub
          </a>
        </p>
      </li>
      <li data-made="corrections">
        <p className="home-statement">Corrections are welcome.</p>
        <p className="home-more">
          <a
            data-brand-control-id="control:link-focus"
            href={CONTENT_CORRECTION_URL}
            target="_blank"
            rel="noopener"
            className="ink-link"
          >
            Report an error
          </a>
        </p>
      </li>
    </ul>
  );
}
