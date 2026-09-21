export function BuddyArt({ id, className = '' }) {
  if (id === 'cat') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="24" cy="30" rx="15" ry="14" fill="#f0a64a" />
        <ellipse cx="24" cy="32" rx="11" ry="9" fill="#ffe8c8" opacity="0.85" />
        <polygon points="10,18 14,8 18,19" fill="#f0a64a" />
        <polygon points="30,19 34,8 38,18" fill="#f0a64a" />
        <polygon points="11,17 14,10 16,18" fill="#ffd4a8" />
        <polygon points="32,18 34,10 37,17" fill="#ffd4a8" />
        <ellipse cx="18" cy="28" rx="2.2" ry="3" fill="#2d241c" />
        <ellipse cx="30" cy="28" rx="2.2" ry="3" fill="#2d241c" />
        <ellipse cx="18.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <ellipse cx="30.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <path d="M24 31 L22 34 L26 34 Z" fill="#e07a8a" />
        <line x1="14" y1="33" x2="6" y2="31" stroke="#5c4a3a" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="14" y1="35" x2="6" y2="36" stroke="#5c4a3a" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="34" y1="33" x2="42" y2="31" stroke="#5c4a3a" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="34" y1="35" x2="42" y2="36" stroke="#5c4a3a" strokeWidth="0.9" strokeLinecap="round" />
        <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#f0a64a" />
        <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#f0a64a" />
        <ellipse cx="17" cy="45" rx="3" ry="2" fill="#ffe8c8" />
        <ellipse cx="31" cy="45" rx="3" ry="2" fill="#ffe8c8" />
      </svg>
    )
  }

  if (id === 'dog') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="24" cy="30" rx="15" ry="14" fill="#c68b52" />
        <ellipse cx="24" cy="34" rx="8" ry="6.5" fill="#f3ddc4" />
        <ellipse cx="11" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(-18 11 24)" />
        <ellipse cx="37" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(18 37 24)" />
        <ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="19" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <ellipse cx="31" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <ellipse cx="24" cy="33.5" rx="3.2" ry="2.4" fill="#2d241c" />
        <path d="M22 36 Q24 40 26 36" fill="#e07a8a" />
        <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#c68b52" />
        <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#c68b52" />
        <ellipse cx="17" cy="45" rx="3" ry="2" fill="#f3ddc4" />
        <ellipse cx="31" cy="45" rx="3" ry="2" fill="#f3ddc4" />
      </svg>
    )
  }

  if (id === 'rabbit') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="17" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(-8 17 12)" />
        <ellipse cx="31" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(8 31 12)" />
        <ellipse cx="17" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(-8 17 12)" />
        <ellipse cx="31" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(8 31 12)" />
        <ellipse cx="24" cy="32" rx="14" ry="13" fill="#b8b8c8" />
        <ellipse cx="24" cy="34" rx="9" ry="8" fill="#e8e8f0" />
        <ellipse cx="18" cy="29" rx="2" ry="2.8" fill="#2d241c" />
        <ellipse cx="30" cy="29" rx="2" ry="2.8" fill="#2d241c" />
        <ellipse cx="18.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
        <ellipse cx="30.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
        <ellipse cx="24" cy="33" rx="2" ry="1.5" fill="#f0b8c8" />
        <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8" />
        <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8" />
        <ellipse cx="17" cy="45" rx="3" ry="2" fill="#e8e8f0" />
        <ellipse cx="31" cy="45" rx="3" ry="2" fill="#e8e8f0" />
      </svg>
    )
  }

  if (id === 'owl') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <polygon points="14,14 16,6 18,15" fill="#6b5038" />
        <polygon points="30,15 32,6 34,14" fill="#6b5038" />
        <ellipse cx="24" cy="32" rx="14" ry="13" fill="#8b6b4a" />
        <ellipse cx="24" cy="30" rx="11" ry="10" fill="#d4c4a8" />
        <ellipse cx="18" cy="28" rx="4" ry="4.5" fill="#f0e080" />
        <ellipse cx="30" cy="28" rx="4" ry="4.5" fill="#f0e080" />
        <ellipse cx="18" cy="28" rx="2" ry="2.5" fill="#2d241c" />
        <ellipse cx="30" cy="28" rx="2" ry="2.5" fill="#2d241c" />
        <ellipse cx="18.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
        <ellipse cx="30.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
        <polygon points="24,31 22,34 26,34" fill="#d4a040" />
        <ellipse cx="24" cy="38" rx="7" ry="6" fill="#c4a882" />
        <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a" />
        <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a" />
        <ellipse cx="17" cy="45" rx="3" ry="2" fill="#c4a882" />
        <ellipse cx="31" cy="45" rx="3" ry="2" fill="#c4a882" />
      </svg>
    )
  }

  return null
}
