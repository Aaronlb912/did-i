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

  if (id === 'ant') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <line x1="20" y1="15" x2="17" y2="8" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="17" y1="8" x2="12" y2="6" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="28" y1="15" x2="31" y2="8" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="31" y1="8" x2="36" y2="6" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="12" cy="6" rx="1.4" ry="1.4" fill="#7a3526" />
        <ellipse cx="36" cy="6" rx="1.4" ry="1.4" fill="#7a3526" />
        <line x1="20" y1="29" x2="12" y2="25" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="25" x2="8" y2="28" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="19.5" y1="31" x2="11" y2="32.5" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="32.5" x2="7" y2="37" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="33" x2="13" y2="38" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="38" x2="10" y2="44" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="29" x2="36" y2="25" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="36" y1="25" x2="40" y2="28" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28.5" y1="31" x2="37" y2="32.5" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="37" y1="32.5" x2="41" y2="37" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="33" x2="35" y2="38" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="35" y1="38" x2="38" y2="44" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="24" cy="43" rx="9" ry="8" fill="#9c4431" />
        <line x1="16.5" y1="41" x2="31.5" y2="41" stroke="#7a3526" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="16" y1="45" x2="32" y2="45" stroke="#7a3526" strokeWidth="1.1" strokeLinecap="round" />
        <ellipse cx="20.5" cy="39.5" rx="2.6" ry="1.5" fill="#ffffff" opacity="0.2" />
        <ellipse cx="24" cy="31" rx="5" ry="4.5" fill="#b5533c" />
        <ellipse cx="24" cy="20" rx="8.5" ry="7.5" fill="#b5533c" />
        <ellipse cx="21" cy="16.8" rx="2.2" ry="1.2" fill="#ffffff" opacity="0.25" />
        <ellipse cx="19.6" cy="19.8" rx="2.4" ry="2.8" fill="#2d241c" />
        <ellipse cx="28.4" cy="19.8" rx="2.4" ry="2.8" fill="#2d241c" />
        <ellipse cx="20.2" cy="19" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="29" cy="19" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="22.2" cy="26.4" rx="1.3" ry="0.9" fill="#7a3526" />
        <ellipse cx="25.8" cy="26.4" rx="1.3" ry="0.9" fill="#7a3526" />
      </svg>
    )
  }

  if (id === 'possum') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <line x1="37" y1="41" x2="43" y2="38" stroke="#f2a7b4" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="43" y1="38" x2="43.5" y2="33" stroke="#f2a7b4" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="13" cy="19" rx="5" ry="5.5" fill="#3a3438" />
        <ellipse cx="35" cy="19" rx="5" ry="5.5" fill="#3a3438" />
        <ellipse cx="13" cy="19.5" rx="3" ry="3.4" fill="#f2a7b4" />
        <ellipse cx="35" cy="19.5" rx="3" ry="3.4" fill="#f2a7b4" />
        <ellipse cx="24" cy="32" rx="15" ry="13.5" fill="#9b98a3" />
        <ellipse cx="24" cy="29" rx="10.5" ry="9" fill="#f4f1ec" />
        <ellipse cx="24" cy="34.5" rx="5.5" ry="4.2" fill="#f4f1ec" />
        <ellipse cx="19" cy="28" rx="3.2" ry="3.6" fill="#5b5660" />
        <ellipse cx="29" cy="28" rx="3.2" ry="3.6" fill="#5b5660" />
        <ellipse cx="19" cy="28" rx="1.9" ry="2.3" fill="#1f1a1e" />
        <ellipse cx="29" cy="28" rx="1.9" ry="2.3" fill="#1f1a1e" />
        <ellipse cx="19.6" cy="27.2" rx="0.6" ry="0.8" fill="#ffffff" opacity="0.9" />
        <ellipse cx="29.6" cy="27.2" rx="0.6" ry="0.8" fill="#ffffff" opacity="0.9" />
        <ellipse cx="24" cy="37.2" rx="1.9" ry="1.4" fill="#e07a8a" />
        <ellipse cx="15" cy="33.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.6" />
        <ellipse cx="33" cy="33.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.6" />
        <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#9b98a3" />
        <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#9b98a3" />
        <ellipse cx="17" cy="45" rx="3" ry="2" fill="#f2a7b4" />
        <ellipse cx="31" cy="45" rx="3" ry="2" fill="#f2a7b4" />
      </svg>
    )
  }

  if (id === 'frog') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="16" cy="20" rx="7" ry="6.5" fill="#72c45e" />
        <ellipse cx="32" cy="20" rx="7" ry="6.5" fill="#72c45e" />
        <ellipse cx="24" cy="32" rx="16" ry="13" fill="#72c45e" />
        <ellipse cx="24" cy="37" rx="10" ry="7" fill="#e4f4c4" />
        <ellipse cx="11" cy="35" rx="1.8" ry="1.3" fill="#4e9a42" />
        <ellipse cx="37" cy="34" rx="1.6" ry="1.2" fill="#4e9a42" />
        <ellipse cx="16" cy="19" rx="4.6" ry="4.6" fill="#fff" />
        <ellipse cx="32" cy="19" rx="4.6" ry="4.6" fill="#fff" />
        <ellipse cx="16.6" cy="19.6" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="31.4" cy="19.6" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="17.3" cy="18.6" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <ellipse cx="32.1" cy="18.6" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <ellipse cx="22.5" cy="27.5" rx="0.6" ry="0.45" fill="#2f5a28" />
        <ellipse cx="25.5" cy="27.5" rx="0.6" ry="0.45" fill="#2f5a28" />
        <path d="M17 30 Q24 35.5 31 30" fill="none" stroke="#2f5a28" strokeWidth="1.3" strokeLinecap="round" />
        <ellipse cx="12.5" cy="30.5" rx="2.4" ry="1.4" fill="#f59aa8" opacity="0.75" />
        <ellipse cx="35.5" cy="30.5" rx="2.4" ry="1.4" fill="#f59aa8" opacity="0.75" />
        <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#72c45e" />
        <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#72c45e" />
        <ellipse cx="17" cy="45" rx="3" ry="2" fill="#e4f4c4" />
        <ellipse cx="31" cy="45" rx="3" ry="2" fill="#e4f4c4" />
      </svg>
    )
  }

  if (id === 'penguin') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="11" cy="33" rx="3.4" ry="8" fill="#344157" transform="rotate(22 11 33)" />
        <ellipse cx="37" cy="33" rx="3.4" ry="8" fill="#344157" transform="rotate(-22 37 33)" />
        <ellipse cx="24" cy="31" rx="14.5" ry="15" fill="#344157" />
        <ellipse cx="19.5" cy="27" rx="6.2" ry="6.8" fill="#f7f5f0" />
        <ellipse cx="28.5" cy="27" rx="6.2" ry="6.8" fill="#f7f5f0" />
        <ellipse cx="24" cy="37.5" rx="9" ry="7.5" fill="#f7f5f0" />
        <ellipse cx="20.5" cy="18.5" rx="2.6" ry="1.4" fill="#ffffff" opacity="0.2" />
        <ellipse cx="19.8" cy="26.5" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="28.2" cy="26.5" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="20.5" cy="25.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="28.9" cy="25.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <polygon points="21.5,30.5 26.5,30.5 24,34" fill="#f5a524" />
        <ellipse cx="15.5" cy="31.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="32.5" cy="31.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#f5a524" />
        <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#f5a524" />
        <ellipse cx="17" cy="45.6" rx="2.8" ry="1.5" fill="#ffc766" />
        <ellipse cx="31" cy="45.6" rx="2.8" ry="1.5" fill="#ffc766" />
      </svg>
    )
  }

  if (id === 'fox') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="36.5" cy="41.5" rx="9" ry="4.6" fill="#e8743b" transform="rotate(-32 36.5 41.5)" />
        <ellipse cx="42.8" cy="37.2" rx="3.3" ry="2.6" fill="#fff6ea" transform="rotate(-32 42.8 37.2)" />
        <polygon points="10.5,21 20.5,21 15.5,9" fill="#e8743b" />
        <polygon points="27.5,21 37.5,21 32.5,9" fill="#e8743b" />
        <polygon points="13.1,20 18.3,20 15.7,13" fill="#3a2a22" />
        <polygon points="29.699999999999996,20 34.9,20 32.3,13" fill="#3a2a22" />
        <ellipse cx="24" cy="31" rx="14.5" ry="14" fill="#e8743b" />
        <ellipse cx="17" cy="34.5" rx="5.6" ry="4.4" fill="#fff6ea" />
        <ellipse cx="31" cy="34.5" rx="5.6" ry="4.4" fill="#fff6ea" />
        <ellipse cx="24" cy="38" rx="7.5" ry="6" fill="#fff6ea" />
        <ellipse cx="19.8" cy="27.5" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="28.2" cy="27.5" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="20.5" cy="26.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="28.9" cy="26.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="24" cy="32.6" rx="1.7" ry="1.2" fill="#2d241c" />
        <ellipse cx="14.5" cy="31.8" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="33.5" cy="31.8" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#3a2a22" />
        <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#3a2a22" />
      </svg>
    )
  }

  if (id === 'otter') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="11" cy="22" rx="4" ry="3.6" fill="#8a5a36" />
        <ellipse cx="37" cy="22" rx="4" ry="3.6" fill="#8a5a36" />
        <ellipse cx="24" cy="31" rx="15" ry="14" fill="#a06a40" />
        <ellipse cx="24" cy="34" rx="10" ry="8.5" fill="#f1dcc0" />
        <ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="18.8" cy="26" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="30.8" cy="26" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="24" cy="31.5" rx="2.6" ry="1.9" fill="#2b2018" />
        <path d="M21.5 34 Q24 36.2 26.5 34" fill="none" stroke="#2b2018" strokeWidth="1" strokeLinecap="round" />
        <path d="M17 33 L11 32 M31 33 L37 32" fill="none" stroke="#7a5038" strokeWidth="0.7" strokeLinecap="round" />
        <path d="M19 41 L24 37 L29 41 Q24 44 19 41 Z" fill="#f6b8c4" stroke="#d98aa0" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M24 37.8 V42.4 M24 37.8 L21.4 41.7 M24 37.8 L26.6 41.7" fill="none" stroke="#d98aa0" strokeWidth="0.6" strokeLinecap="round" />
        <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8a5a36" />
        <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8a5a36" />
      </svg>
    )
  }

  if (id === 'hedgehog') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <polygon points="9.97,34.75 5.71,32.95 9.42,30.22 6.07,27.07 10.52,25.79 8.43,21.63 13.12,21.93 12.53,17.23 16.94,19.09 17.93,14.39 21.56,17.59 24,13.4 26.44,17.59 30.07,14.39 31.06,19.09 35.47,17.23 34.88,21.93 39.57,21.63 37.48,25.79 41.93,27.07 38.58,30.22 42.29,32.95 38.03,34.75" fill="#7a5a46" />
        <ellipse cx="24" cy="31" rx="15" ry="14" fill="#8f6a52" />
        <path d="M16 21.5 L14.6 19.4 M20.3 19.4 L19.6 17.1 M24 18.8 V16.4 M27.7 19.4 L28.4 17.1 M32 21.5 L33.4 19.4" fill="none" stroke="#b08a6c" strokeWidth="0.9" strokeLinecap="round" />
        <ellipse cx="13.6" cy="25" rx="2.6" ry="2.4" fill="#e8b89a" />
        <ellipse cx="34.4" cy="25" rx="2.6" ry="2.4" fill="#e8b89a" />
        <ellipse cx="24" cy="34" rx="12" ry="10.5" fill="#f3d9b6" />
        <ellipse cx="18.5" cy="29" rx="2.2" ry="2.9" fill="#2d241c" />
        <ellipse cx="29.5" cy="29" rx="2.2" ry="2.9" fill="#2d241c" />
        <ellipse cx="19.2" cy="28" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="30.2" cy="28" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="24" cy="33" rx="2.2" ry="1.6" fill="#2b2018" />
        <path d="M22 35.4 Q24 37 26 35.4" fill="none" stroke="#2b2018" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="14.8" cy="33.2" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="33.2" cy="33.2" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#c48f72" />
        <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#c48f72" />
      </svg>
    )
  }

  if (id === 'panda') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="12.5" cy="19.5" rx="4.8" ry="4.6" fill="#2f2c33" />
        <ellipse cx="35.5" cy="19.5" rx="4.8" ry="4.6" fill="#2f2c33" />
        <ellipse cx="24" cy="31" rx="15" ry="14" fill="#f4f1ea" />
        <ellipse cx="11" cy="38.5" rx="3.6" ry="5.4" fill="#2f2c33" transform="rotate(28 11 38.5)" />
        <ellipse cx="37" cy="38.5" rx="3.6" ry="5.4" fill="#2f2c33" transform="rotate(-28 37 38.5)" />
        <ellipse cx="18" cy="28.2" rx="3.9" ry="4.9" fill="#2f2c33" transform="rotate(32 18 28.2)" />
        <ellipse cx="30" cy="28.2" rx="3.9" ry="4.9" fill="#2f2c33" transform="rotate(-32 30 28.2)" />
        <ellipse cx="18.4" cy="27.6" rx="1.9" ry="2.3" fill="#0f0d11" />
        <ellipse cx="29.6" cy="27.6" rx="1.9" ry="2.3" fill="#0f0d11" />
        <ellipse cx="19.1" cy="26.7" rx="0.75" ry="0.95" fill="#ffffff" opacity="0.95" />
        <ellipse cx="30.3" cy="26.7" rx="0.75" ry="0.95" fill="#ffffff" opacity="0.95" />
        <ellipse cx="24" cy="33.4" rx="2.1" ry="1.5" fill="#2f2c33" />
        <path d="M22 35.4 Q24 37 26 35.4" fill="none" stroke="#2f2c33" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="13.6" cy="34" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="34.4" cy="34" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#2f2c33" />
        <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#2f2c33" />
      </svg>
    )
  }

  if (id === 'duck') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M24 17 Q22 11 25 8 Q25 12 28 13 Q27 9 30 8 Q29 13 27 17 Z" fill="#ffd34d" />
        <ellipse cx="24" cy="31" rx="15" ry="14" fill="#ffd34d" />
        <path d="M9.5 33 Q5.5 35 6.5 39 Q10.5 39 12.5 36 Z M38.5 33 Q42.5 35 41.5 39 Q37.5 39 35.5 36 Z" fill="#f3bd2e" />
        <ellipse cx="24" cy="36" rx="9" ry="6.5" fill="#fff1b8" />
        <ellipse cx="18" cy="26" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="30" cy="26" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="18.8" cy="25" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="30.8" cy="25" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <path d="M18.5 31 Q24 28 29.5 31 Q24 35.5 18.5 31 Z" fill="#ff9a3c" stroke="#e07a22" strokeWidth="0.8" strokeLinejoin="round" />
        <ellipse cx="13.5" cy="31" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <ellipse cx="34.5" cy="31" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <path d="M13 43 H22 L20 47 H15 Z M26 43 H35 L33 47 H28 Z" fill="#ff9a3c" />
      </svg>
    )
  }

  if (id === 'axolotl') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="24" cy="43" rx="8.5" ry="6" fill="#ffc2d4" />
        <ellipse cx="24" cy="44" rx="5" ry="3.6" fill="#ffe6ee" />
        <path d="M31 44 Q37 44 39 40 Q39.5 44 36 46 Q34 47 31 46.5 Z" fill="#f2a4bd" />
        <path d="M9.5 19.75 C5.82 21.09 2.18 18.99 2.23 15.55 C5.18 13.79 8.82 15.89 9.5 19.75 Z M9 25 C6.22 27.9 1.76 27.75 0.08 24.69 C1.97 21.75 6.43 21.91 9 25 Z M9.5 30.25 C8.82 34.01 5.35 35.86 2.55 33.95 C2.53 30.56 6.01 28.71 9.5 30.25 Z M38.5 19.75 C39.18 15.89 42.82 13.79 45.77 15.55 C45.82 18.99 42.18 21.09 38.5 19.75 Z M39 25 C41.57 21.91 46.03 21.75 47.92 24.69 C46.24 27.75 41.78 27.9 39 25 Z M38.5 30.25 C41.99 28.71 45.47 30.56 45.45 33.95 C42.65 35.86 39.18 34.01 38.5 30.25 Z" fill="#ff6f91" />
        <path d="M8.46 19.15 L3.78 16.45 M7.8 24.96 L1.88 24.75 M8.44 30.81 L4.14 33.1 M39.54 19.15 L44.22 16.45 M40.2 24.96 L46.12 24.75 M39.56 30.81 L43.86 33.1" fill="none" stroke="#e2426e" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="24" cy="26" rx="15.5" ry="13.5" fill="#ffc2d4" />
        <ellipse cx="24" cy="30.5" rx="10" ry="6.5" fill="#ffe6ee" opacity="0.6" />
        <ellipse cx="18" cy="26" rx="2.7" ry="3.19" fill="#1f1a1e" />
        <ellipse cx="30" cy="26" rx="2.7" ry="3.19" fill="#1f1a1e" />
        <ellipse cx="18.81" cy="24.92" rx="0.86" ry="1.03" fill="#ffffff" opacity="0.95" />
        <ellipse cx="30.81" cy="24.92" rx="0.86" ry="1.03" fill="#ffffff" opacity="0.95" />
        <path d="M21 31 Q22.5 32.65 24 31 Q25.5 32.65 27 31" fill="none" stroke="#2d1a20" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="12.5" cy="31" rx="2.3" ry="1.4" fill="#ff6f91" opacity="0.55" />
        <ellipse cx="35.5" cy="31" rx="2.3" ry="1.4" fill="#ff6f91" opacity="0.55" />
        <ellipse cx="19" cy="48.5" rx="3" ry="2" fill="#f2a4bd" />
        <ellipse cx="29" cy="48.5" rx="3" ry="2" fill="#f2a4bd" />
      </svg>
    )
  }

  if (id === 'turtle') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="8.8" cy="37.5" rx="3.2" ry="4.8" fill="#8fd27a" transform="rotate(-38 8.8 37.5)" />
        <ellipse cx="39.2" cy="37.5" rx="3.2" ry="4.8" fill="#8fd27a" transform="rotate(38 39.2 37.5)" />
        <ellipse cx="17" cy="46" rx="4.5" ry="3" fill="#8fd27a" />
        <ellipse cx="31" cy="46" rx="4.5" ry="3" fill="#8fd27a" />
        <ellipse cx="24" cy="37" rx="16" ry="11" fill="#7d5a2e" />
        <ellipse cx="24" cy="36.4" rx="14.6" ry="9.8" fill="#a0753e" />
        <polygon points="24,35.4 27.4,37.4 27.4,41.4 24,43.4 20.6,41.4 20.6,37.4" fill="#c99f62" />
        <polygon points="14.2,34.6 16.8,36.1 16.8,39.1 14.2,40.6 11.6,39.1 11.6,36.1" fill="#c99f62" />
        <polygon points="33.8,34.6 36.4,36.1 36.4,39.1 33.8,40.6 31.2,39.1 31.2,36.1" fill="#c99f62" />
        <ellipse cx="24" cy="25" rx="11.2" ry="10" fill="#9edb86" />
        <ellipse cx="19.5" cy="25" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="28.5" cy="25" rx="2.2" ry="2.8" fill="#2d241c" />
        <ellipse cx="20.2" cy="24.1" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <ellipse cx="29.2" cy="24.1" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <path d="M21.8 29.4 Q24 31.2 26.2 29.4" fill="none" stroke="#2f5a28" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="15.8" cy="28.6" rx="2.1" ry="1.2" fill="#f59aa8" opacity="0.7" />
        <ellipse cx="32.2" cy="28.6" rx="2.1" ry="1.2" fill="#f59aa8" opacity="0.7" />
      </svg>
    )
  }

  // Never sold: earned by bringing 15 friends (src/lib/purse.js REFER_BUDDY).
  if (id === 'hive') {
    return (
      <svg
        className={className}
        viewBox="0 0 48 58"
        width="48"
        height="58"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="11" cy="18" rx="6" ry="8" fill="#dff3ff" opacity="0.9" stroke="#8fb8d4" strokeWidth="1" transform="rotate(-25 11 18)" />
        <ellipse cx="37" cy="18" rx="6" ry="8" fill="#dff3ff" opacity="0.9" stroke="#8fb8d4" strokeWidth="1" transform="rotate(25 37 18)" />
        <path d="M19 17 Q16 10 13 8 M29 17 Q32 10 35 8" fill="none" stroke="#2b2018" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="13" cy="8" rx="2.2" ry="2.2" fill="#2b2018" />
        <ellipse cx="35" cy="8" rx="2.2" ry="2.2" fill="#2b2018" />
        <ellipse cx="24" cy="31" rx="15" ry="14" fill="#f6c443" />
        <path d="M10.5 35 Q24 40 37.5 35 V38.4 Q24 43.4 10.5 38.4 Z M12 41.5 Q24 45.5 36 41.5 L34 44.1 Q24 47.1 14 44.1 Z" fill="#2b2018" />
        <ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <ellipse cx="18.8" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <ellipse cx="30.8" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <ellipse cx="14" cy="32" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <ellipse cx="34" cy="32" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <path d="M22 31.5 Q24 33.3 26 31.5" fill="none" stroke="#2b2018" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="17" cy="47" rx="4.2" ry="2.8" fill="#2b2018" />
        <ellipse cx="31" cy="47" rx="4.2" ry="2.8" fill="#2b2018" />
      </svg>
    )
  }

  return null
}
