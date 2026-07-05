import CreditCardIcon from '@mui/icons-material/CreditCard';
import { CARD_BRAND_META } from './cardBrandMeta';

export default function CardBrandIcon({ brand, size = 20 }) {
  const meta = CARD_BRAND_META[brand] || CARD_BRAND_META.OTHER;
  if (!meta.svg) {
    return <CreditCardIcon sx={{ fontSize: size, color: meta.hex }} />;
  }
  return (
    <span
      style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: meta.svg }}
    />
  );
}
