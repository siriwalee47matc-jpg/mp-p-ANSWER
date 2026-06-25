import Image from 'next/image';

type BrandMarkProps = {
  compact?: boolean;
};

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark ${compact ? 'compact' : ''}`}>
      <div className="brand-mark__seal">
        <Image
          src="/sentinel-logo.jpg"
          alt="Sentinel ADS Sisaket seal"
          width={compact ? 52 : 104}
          height={compact ? 52 : 104}
          priority
        />
      </div>
      <div className="brand-mark__copy">
        <span className="brand-mark__eyebrow">AI Ad Enforcement Command</span>
        <strong className="brand-mark__title">SENTINEL ADS</strong>
        <span className="brand-mark__subtitle">Sisaket Public Health Illegal Ad Intelligence Center</span>
      </div>
    </div>
  );
}
