import React, { useMemo, useState } from 'react';

export type FlagIconProps = {
  emoji?: string;
  label: string;
  fallbackText?: string;
  className?: string;
};

export const FlagIcon: React.FC<FlagIconProps> = ({ emoji, label, fallbackText, className }) => {
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => {
    if (!emoji) return null;

    const chars: string[] = Array.from(emoji);
    const codepoints = chars
      .map((char) => char.codePointAt(0))
      .filter((cp): cp is number => typeof cp === 'number')
      .map((cp) => cp.toString(16))
      .join('-');

    if (!codepoints) return null;

    return `https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
  }, [emoji]);

  if (!src || failed) {
    return (
      <span aria-label={label} title={label} className={className}>
        {fallbackText || label}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};
