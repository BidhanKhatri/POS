import visaSvg from 'simple-icons/icons/visa.svg?raw';
import mastercardSvg from 'simple-icons/icons/mastercard.svg?raw';
import amexSvg from 'simple-icons/icons/americanexpress.svg?raw';
import discoverSvg from 'simple-icons/icons/discover.svg?raw';

// simple-icons ships bare <svg><path/></svg> markup with no width/height/fill —
// stamp all three on so the mark scales to its wrapper and picks up the brand color.
const prepareSvg = (raw, hex) => raw.replace('<svg ', `<svg fill="${hex}" width="100%" height="100%" `);

// Official brand marks from simple-icons (CC0), recolored to each network's brand hex.
export const CARD_BRAND_META = {
  VISA:       { label: 'Visa',       hex: '#1A1F71', svg: prepareSvg(visaSvg, '#1A1F71') },
  MASTERCARD: { label: 'Mastercard', hex: '#EB001B', svg: prepareSvg(mastercardSvg, '#EB001B') },
  AMEX:       { label: 'Amex',       hex: '#2E77BC', svg: prepareSvg(amexSvg, '#2E77BC') },
  DISCOVER:   { label: 'Discover',   hex: '#FF6000', svg: prepareSvg(discoverSvg, '#FF6000') },
  OTHER:      { label: 'Other',      hex: '#6B5B57', svg: null },
};
