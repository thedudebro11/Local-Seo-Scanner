/**
 * Directory and aggregator domain blocklist — Phase 14.
 *
 * These are not business websites — they're directories, review platforms,
 * social networks, and ad networks that appear in search results but should
 * never be added to a bulk scan queue.
 */

const BLOCKED_DOMAINS = new Set([
  // Review / directory sites
  'yelp.com',
  'angi.com',
  'homeadvisor.com',
  'angieslist.com',
  'thumbtack.com',
  'yellowpages.com',
  'superpages.com',
  'bbb.org',
  'porch.com',
  'fixr.com',
  'networx.com',
  'houzz.com',
  'hometalk.com',
  'expertise.com',
  'bark.com',
  'homeguide.com',
  'taskrabbit.com',
  'buildzoom.com',
  'homelight.com',
  'manta.com',
  'chamberofcommerce.com',
  'merchantcircle.com',
  'citysearch.com',

  // Ranking / "best of" list sites
  'threebestrated.com',
  'bestprosintown.com',
  'topratedlocal.com',
  'expertise.com',
  'upcity.com',
  'clutch.co',
  'sortlist.com',

  // Maps / navigation
  'mapquest.com',
  'maps.apple.com',

  // Social networks
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'nextdoor.com',
  'tiktok.com',
  'youtube.com',
  'pinterest.com',

  // Search / information
  'google.com',
  'bing.com',
  'yahoo.com',
  'wikipedia.org',
  'wikidata.org',

  // Ads / tracking
  'doubleclick.net',
  'googleadservices.com',

  // Review aggregators
  'tripadvisor.com',
  'trustpilot.com',
  'sitejabber.com',
  'birdeyereviews.com',
  'glassdoor.com',
  'angieslist.com',

  // Marketplaces / lead-gen platforms
  'thumbtack.com',
  'taskrabbit.com',
  'takl.com',
  'handy.com',
  'amazon.com',

  // News / media
  'reddit.com',
  'bobvila.com',
  'thisoldhouse.com',
  'houselogic.com',
])

/**
 * Returns true if the domain (with or without www) is on the blocklist.
 */
export function isBlockedDomain(domain: string): boolean {
  const root = domain.replace(/^www\./i, '').toLowerCase()
  // Also check if any blocked domain is a suffix match
  // e.g. "maps.google.com" should be blocked via "google.com"
  for (const blocked of BLOCKED_DOMAINS) {
    if (root === blocked || root.endsWith(`.${blocked}`)) return true
  }
  return false
}
