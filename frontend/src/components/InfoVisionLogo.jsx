export default function InfoVisionLogo({ size = 28 }) {
  return (
    <img
      src="/assets/infovision-logo.gif"
      alt="InfoVision Intelligence logo"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}

export function InfoVisionIcon({ size = 48 }) {
  return <InfoVisionLogo size={size} />;
}
