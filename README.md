# Carl Leger

Static personal website about hosting, web performance and technical SEO. Public pages are ordinary HTML, with a shared stylesheet and small progressive JavaScript modules. No production build step is required.

Serve the repository root with a static HTTP server to preview the website. Optional analytics are disabled on localhost and require consent on the production hostname. Contact details and privacy preferences appear in the footer.

Analytics also have a release hold in assets/js/analytics.js. Keep MEASUREMENT_RELEASED false until the GA4 stream's automatic events and user-provided data settings have been reviewed, a blocked-network privacy test passes, and the owner explicitly authorizes activation. Consent preferences and all navigation remain available while this hold is active. Do not enable collection through a preview URL.

The central design system is assets/css/styles.css. Its original graphite/navy palette, blue accent, CL monogram and authentic portrait are preserved. Blueprint backgrounds use CSS gradients. Outline SVG geometry is drawn locally for this site, with no icon, chart or font dependency. Responsive layout breakpoints are documented at the top of the stylesheet. Compatibility CSS URLs continue to import the shared stylesheet.

Public engineering scores are a small, dated local laboratory snapshot in assets/data/site-quality.json. They are not production traffic or hosting benchmarks. The English and French homepages contain matching static HTML for these scores, so primary content does not depend on JavaScript. When refreshing the snapshot, run fresh Lighthouse measurements, update the source JSON and both static dashboards together (scores, rings, context, dates and method), and verify that the displayed values match the source. Keep raw results, screenshots and private QA artifacts outside this repository. The private Gate 3.2 QA package includes the snapshot updater and consistency checks for reproducing this step.

Core Web Vitals bars are educational reference scales from web.dev, not measured visitor data. LCP, INP and CLS use their stated units and separate scales. No field INP is inferred from Lighthouse TBT. Generic request-flow diagrams explain concepts rather than a specific provider's architecture.

Article contents use native details/summary controls: links remain available in the initial HTML, expanded without JavaScript, and initially collapsed on compact screens with progressive enhancement. Comparison tables retain row labels while scrolling and size mobile data columns to the available container width. The public audit table presents distinct laboratory protocols; their scores are not a direct speed comparison, Google ranking evidence or exhaustive WCAG certification.
