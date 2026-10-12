# Basic SEO

The site uses `https://ginnysgems.com` as its primary domain, following the README. Both pages contain distinct titles and descriptions, canonical URLs, Open Graph and Twitter metadata, and Organization, WebSite, and WebPage JSON-LD. The visualizer's query-string variants canonicalize to `/visualizer.html`.

`robots.txt` allows crawling and points to `sitemap.xml`, which lists the two canonical pages. Include both files at the domain root when deploying. If the primary domain changes, update the HTML metadata, JSON-LD, sitemap, and robots sitemap URL together.

After deployment:

1. Verify the domain in Google Search Console and submit `https://ginnysgems.com/sitemap.xml`.
2. Check that both pages, the sitemap, and robots file return HTTP 200 on the primary domain. Configure hosting redirects for alternate domains and `/index.html` to the primary homepage URL.
3. When actual photographs are added, update their alt text and add an absolute `og:image` and `twitter:image` URL plus descriptive image alt metadata. Social image tags are intentionally omitted until a real image is available.
4. Add verified business contact/location details and social profile URLs to Organization data when supplied. No addresses, reviews, prices, or inventory claims are invented in structured data.

Search Console verification and hosting redirects require access to the production domain; they are not configured by these repository edits.

References: [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
