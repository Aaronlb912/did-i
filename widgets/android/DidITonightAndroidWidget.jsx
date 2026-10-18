import React from 'react'
import { ACCESSORY_PAD, dressedSvg } from '../../src/lib/accessories.js'
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget'

// The exact markup native/components/BuddyArt.jsx's `BuddyArt` renders (not
// the boxy `BuddyPlain` fallback) — SvgWidget draws real SVG, so the widget
// buddy can be pixel-identical to the in-app one instead of an approximation.
const BUDDY_SVG = {
  cat: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="24" cy="30" rx="15" ry="14" fill="#f0a64a"/>
    <ellipse cx="24" cy="32" rx="11" ry="9" fill="#ffe8c8" opacity="0.85"/>
    <polygon points="10,18 14,8 18,19" fill="#f0a64a"/>
    <polygon points="30,19 34,8 38,18" fill="#f0a64a"/>
    <polygon points="11,17 14,10 16,18" fill="#ffd4a8"/>
    <polygon points="32,18 34,10 37,17" fill="#ffd4a8"/>
    <ellipse cx="18" cy="28" rx="2.2" ry="3" fill="#2d241c"/>
    <ellipse cx="30" cy="28" rx="2.2" ry="3" fill="#2d241c"/>
    <ellipse cx="18.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="30.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <path d="M24 31 L22 34 L26 34 Z" fill="#e07a8a"/>
    <line x1="14" y1="33" x2="6" y2="31" stroke="#5c4a3a" stroke-width="0.9"/>
    <line x1="14" y1="35" x2="6" y2="36" stroke="#5c4a3a" stroke-width="0.9"/>
    <line x1="34" y1="33" x2="42" y2="31" stroke="#5c4a3a" stroke-width="0.9"/>
    <line x1="34" y1="35" x2="42" y2="36" stroke="#5c4a3a" stroke-width="0.9"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#f0a64a"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#f0a64a"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#ffe8c8"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#ffe8c8"/>
  </svg>`,
  dog: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="24" cy="30" rx="15" ry="14" fill="#c68b52"/>
    <ellipse cx="24" cy="34" rx="8" ry="6.5" fill="#f3ddc4"/>
    <ellipse cx="11" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(-18 11 24)"/>
    <ellipse cx="37" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(18 37 24)"/>
    <ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="19" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="31" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="24" cy="33.5" rx="3.2" ry="2.4" fill="#2d241c"/>
    <path d="M22 36 Q24 40 26 36" fill="#e07a8a"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#c68b52"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#c68b52"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#f3ddc4"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#f3ddc4"/>
  </svg>`,
  rabbit: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="17" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(-8 17 12)"/>
    <ellipse cx="31" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(8 31 12)"/>
    <ellipse cx="17" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(-8 17 12)"/>
    <ellipse cx="31" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(8 31 12)"/>
    <ellipse cx="24" cy="32" rx="14" ry="13" fill="#b8b8c8"/>
    <ellipse cx="24" cy="34" rx="9" ry="8" fill="#e8e8f0"/>
    <ellipse cx="18" cy="29" rx="2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="30" cy="29" rx="2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="18.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <ellipse cx="30.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <ellipse cx="24" cy="33" rx="2" ry="1.5" fill="#f0b8c8"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#e8e8f0"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#e8e8f0"/>
  </svg>`,
  owl: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <polygon points="14,14 16,6 18,15" fill="#6b5038"/>
    <polygon points="30,15 32,6 34,14" fill="#6b5038"/>
    <ellipse cx="24" cy="32" rx="14" ry="13" fill="#8b6b4a"/>
    <ellipse cx="24" cy="30" rx="11" ry="10" fill="#d4c4a8"/>
    <ellipse cx="18" cy="28" rx="4" ry="4.5" fill="#f0e080"/>
    <ellipse cx="30" cy="28" rx="4" ry="4.5" fill="#f0e080"/>
    <ellipse cx="18" cy="28" rx="2" ry="2.5" fill="#2d241c"/>
    <ellipse cx="30" cy="28" rx="2" ry="2.5" fill="#2d241c"/>
    <ellipse cx="18.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <ellipse cx="30.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <polygon points="24,31 22,34 26,34" fill="#d4a040"/>
    <ellipse cx="24" cy="38" rx="7" ry="6" fill="#c4a882"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#c4a882"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#c4a882"/>
  </svg>`,
  ant: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <line x1="20" y1="15" x2="17" y2="8" stroke="#7a3526" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="17" y1="8" x2="12" y2="6" stroke="#7a3526" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="28" y1="15" x2="31" y2="8" stroke="#7a3526" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="31" y1="8" x2="36" y2="6" stroke="#7a3526" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="12" cy="6" rx="1.4" ry="1.4" fill="#7a3526"/>
    <ellipse cx="36" cy="6" rx="1.4" ry="1.4" fill="#7a3526"/>
    <line x1="20" y1="29" x2="12" y2="25" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12" y1="25" x2="8" y2="28" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="19.5" y1="31" x2="11" y2="32.5" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="11" y1="32.5" x2="7" y2="37" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="20" y1="33" x2="13" y2="38" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="13" y1="38" x2="10" y2="44" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="28" y1="29" x2="36" y2="25" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="36" y1="25" x2="40" y2="28" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="28.5" y1="31" x2="37" y2="32.5" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="37" y1="32.5" x2="41" y2="37" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="28" y1="33" x2="35" y2="38" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="35" y1="38" x2="38" y2="44" stroke="#7a3526" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="24" cy="43" rx="9" ry="8" fill="#9c4431"/>
    <line x1="16.5" y1="41" x2="31.5" y2="41" stroke="#7a3526" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="16" y1="45" x2="32" y2="45" stroke="#7a3526" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="20.5" cy="39.5" rx="2.6" ry="1.5" fill="#ffffff" opacity="0.2"/>
    <ellipse cx="24" cy="31" rx="5" ry="4.5" fill="#b5533c"/>
    <ellipse cx="24" cy="20" rx="8.5" ry="7.5" fill="#b5533c"/>
    <ellipse cx="21" cy="16.8" rx="2.2" ry="1.2" fill="#ffffff" opacity="0.25"/>
    <ellipse cx="19.6" cy="19.8" rx="2.4" ry="2.8" fill="#2d241c"/>
    <ellipse cx="28.4" cy="19.8" rx="2.4" ry="2.8" fill="#2d241c"/>
    <ellipse cx="20.2" cy="19" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="29" cy="19" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="22.2" cy="26.4" rx="1.3" ry="0.9" fill="#7a3526"/>
    <ellipse cx="25.8" cy="26.4" rx="1.3" ry="0.9" fill="#7a3526"/>
  </svg>`,
  possum: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <line x1="37" y1="41" x2="43" y2="38" stroke="#f2a7b4" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="43" y1="38" x2="43.5" y2="33" stroke="#f2a7b4" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="13" cy="19" rx="5" ry="5.5" fill="#3a3438"/>
    <ellipse cx="35" cy="19" rx="5" ry="5.5" fill="#3a3438"/>
    <ellipse cx="13" cy="19.5" rx="3" ry="3.4" fill="#f2a7b4"/>
    <ellipse cx="35" cy="19.5" rx="3" ry="3.4" fill="#f2a7b4"/>
    <ellipse cx="24" cy="32" rx="15" ry="13.5" fill="#9b98a3"/>
    <ellipse cx="24" cy="29" rx="10.5" ry="9" fill="#f4f1ec"/>
    <ellipse cx="24" cy="34.5" rx="5.5" ry="4.2" fill="#f4f1ec"/>
    <ellipse cx="19" cy="28" rx="3.2" ry="3.6" fill="#5b5660"/>
    <ellipse cx="29" cy="28" rx="3.2" ry="3.6" fill="#5b5660"/>
    <ellipse cx="19" cy="28" rx="1.9" ry="2.3" fill="#1f1a1e"/>
    <ellipse cx="29" cy="28" rx="1.9" ry="2.3" fill="#1f1a1e"/>
    <ellipse cx="19.6" cy="27.2" rx="0.6" ry="0.8" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="29.6" cy="27.2" rx="0.6" ry="0.8" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="24" cy="37.2" rx="1.9" ry="1.4" fill="#e07a8a"/>
    <ellipse cx="15" cy="33.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.6"/>
    <ellipse cx="33" cy="33.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.6"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#9b98a3"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#9b98a3"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#f2a7b4"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#f2a7b4"/>
  </svg>`,
  frog: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="20" rx="7" ry="6.5" fill="#72c45e"/>
    <ellipse cx="32" cy="20" rx="7" ry="6.5" fill="#72c45e"/>
    <ellipse cx="24" cy="32" rx="16" ry="13" fill="#72c45e"/>
    <ellipse cx="24" cy="37" rx="10" ry="7" fill="#e4f4c4"/>
    <ellipse cx="11" cy="35" rx="1.8" ry="1.3" fill="#4e9a42"/>
    <ellipse cx="37" cy="34" rx="1.6" ry="1.2" fill="#4e9a42"/>
    <ellipse cx="16" cy="19" rx="4.6" ry="4.6" fill="#fff"/>
    <ellipse cx="32" cy="19" rx="4.6" ry="4.6" fill="#fff"/>
    <ellipse cx="16.6" cy="19.6" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="31.4" cy="19.6" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="17.3" cy="18.6" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="32.1" cy="18.6" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="22.5" cy="27.5" rx="0.6" ry="0.45" fill="#2f5a28"/>
    <ellipse cx="25.5" cy="27.5" rx="0.6" ry="0.45" fill="#2f5a28"/>
    <path d="M17 30 Q24 35.5 31 30" fill="none" stroke="#2f5a28" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="12.5" cy="30.5" rx="2.4" ry="1.4" fill="#f59aa8" opacity="0.75"/>
    <ellipse cx="35.5" cy="30.5" rx="2.4" ry="1.4" fill="#f59aa8" opacity="0.75"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#72c45e"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#72c45e"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#e4f4c4"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#e4f4c4"/>
  </svg>`,
  penguin: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="11" cy="33" rx="3.4" ry="8" fill="#344157" transform="rotate(22 11 33)"/>
    <ellipse cx="37" cy="33" rx="3.4" ry="8" fill="#344157" transform="rotate(-22 37 33)"/>
    <ellipse cx="24" cy="31" rx="14.5" ry="15" fill="#344157"/>
    <ellipse cx="19.5" cy="27" rx="6.2" ry="6.8" fill="#f7f5f0"/>
    <ellipse cx="28.5" cy="27" rx="6.2" ry="6.8" fill="#f7f5f0"/>
    <ellipse cx="24" cy="37.5" rx="9" ry="7.5" fill="#f7f5f0"/>
    <ellipse cx="20.5" cy="18.5" rx="2.6" ry="1.4" fill="#ffffff" opacity="0.2"/>
    <ellipse cx="19.8" cy="26.5" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="28.2" cy="26.5" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="20.5" cy="25.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="28.9" cy="25.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <polygon points="21.5,30.5 26.5,30.5 24,34" fill="#f5a524"/>
    <ellipse cx="15.5" cy="31.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="32.5" cy="31.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#f5a524"/>
    <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#f5a524"/>
    <ellipse cx="17" cy="45.6" rx="2.8" ry="1.5" fill="#ffc766"/>
    <ellipse cx="31" cy="45.6" rx="2.8" ry="1.5" fill="#ffc766"/>
  </svg>`,
  fox: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="36.5" cy="41.5" rx="9" ry="4.6" fill="#e8743b" transform="rotate(-32 36.5 41.5)"/>
    <ellipse cx="42.8" cy="37.2" rx="3.3" ry="2.6" fill="#fff6ea" transform="rotate(-32 42.8 37.2)"/>
    <polygon points="10.5,21 20.5,21 15.5,9" fill="#e8743b"/>
    <polygon points="27.5,21 37.5,21 32.5,9" fill="#e8743b"/>
    <polygon points="13.1,20 18.3,20 15.7,13" fill="#3a2a22"/>
    <polygon points="29.699999999999996,20 34.9,20 32.3,13" fill="#3a2a22"/>
    <ellipse cx="24" cy="31" rx="14.5" ry="14" fill="#e8743b"/>
    <ellipse cx="17" cy="34.5" rx="5.6" ry="4.4" fill="#fff6ea"/>
    <ellipse cx="31" cy="34.5" rx="5.6" ry="4.4" fill="#fff6ea"/>
    <ellipse cx="24" cy="38" rx="7.5" ry="6" fill="#fff6ea"/>
    <ellipse cx="19.8" cy="27.5" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="28.2" cy="27.5" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="20.5" cy="26.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="28.9" cy="26.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="24" cy="32.6" rx="1.7" ry="1.2" fill="#2d241c"/>
    <ellipse cx="14.5" cy="31.8" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="33.5" cy="31.8" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#3a2a22"/>
    <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#3a2a22"/>
  </svg>`,
  otter: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="11" cy="22" rx="4" ry="3.6" fill="#8a5a36"/>
    <ellipse cx="37" cy="22" rx="4" ry="3.6" fill="#8a5a36"/>
    <ellipse cx="24" cy="31" rx="15" ry="14" fill="#a06a40"/>
    <ellipse cx="24" cy="34" rx="10" ry="8.5" fill="#f1dcc0"/>
    <ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="18.8" cy="26" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="30.8" cy="26" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="24" cy="31.5" rx="2.6" ry="1.9" fill="#2b2018"/>
    <path d="M21.5 34 Q24 36.2 26.5 34" fill="none" stroke="#2b2018" stroke-width="1" stroke-linecap="round"/>
    <path d="M17 33 L11 32 M31 33 L37 32" fill="none" stroke="#7a5038" stroke-width="0.7" stroke-linecap="round"/>
    <path d="M19 41 L24 37 L29 41 Q24 44 19 41 Z" fill="#f6b8c4" stroke="#d98aa0" stroke-width="0.8" stroke-linejoin="round"/>
    <path d="M24 37.8 V42.4 M24 37.8 L21.4 41.7 M24 37.8 L26.6 41.7" fill="none" stroke="#d98aa0" stroke-width="0.6" stroke-linecap="round"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8a5a36"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8a5a36"/>
  </svg>`,
  hedgehog: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <polygon points="9.97,34.75 5.71,32.95 9.42,30.22 6.07,27.07 10.52,25.79 8.43,21.63 13.12,21.93 12.53,17.23 16.94,19.09 17.93,14.39 21.56,17.59 24,13.4 26.44,17.59 30.07,14.39 31.06,19.09 35.47,17.23 34.88,21.93 39.57,21.63 37.48,25.79 41.93,27.07 38.58,30.22 42.29,32.95 38.03,34.75" fill="#7a5a46"/>
    <ellipse cx="24" cy="31" rx="15" ry="14" fill="#8f6a52"/>
    <path d="M16 21.5 L14.6 19.4 M20.3 19.4 L19.6 17.1 M24 18.8 V16.4 M27.7 19.4 L28.4 17.1 M32 21.5 L33.4 19.4" fill="none" stroke="#b08a6c" stroke-width="0.9" stroke-linecap="round"/>
    <ellipse cx="13.6" cy="25" rx="2.6" ry="2.4" fill="#e8b89a"/>
    <ellipse cx="34.4" cy="25" rx="2.6" ry="2.4" fill="#e8b89a"/>
    <ellipse cx="24" cy="34" rx="12" ry="10.5" fill="#f3d9b6"/>
    <ellipse cx="18.5" cy="29" rx="2.2" ry="2.9" fill="#2d241c"/>
    <ellipse cx="29.5" cy="29" rx="2.2" ry="2.9" fill="#2d241c"/>
    <ellipse cx="19.2" cy="28" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="30.2" cy="28" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="24" cy="33" rx="2.2" ry="1.6" fill="#2b2018"/>
    <path d="M22 35.4 Q24 37 26 35.4" fill="none" stroke="#2b2018" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="14.8" cy="33.2" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="33.2" cy="33.2" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#c48f72"/>
    <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#c48f72"/>
  </svg>`,
  panda: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12.5" cy="19.5" rx="4.8" ry="4.6" fill="#2f2c33"/>
    <ellipse cx="35.5" cy="19.5" rx="4.8" ry="4.6" fill="#2f2c33"/>
    <ellipse cx="24" cy="31" rx="15" ry="14" fill="#f4f1ea"/>
    <ellipse cx="11" cy="38.5" rx="3.6" ry="5.4" fill="#2f2c33" transform="rotate(28 11 38.5)"/>
    <ellipse cx="37" cy="38.5" rx="3.6" ry="5.4" fill="#2f2c33" transform="rotate(-28 37 38.5)"/>
    <ellipse cx="18" cy="28.2" rx="3.9" ry="4.9" fill="#2f2c33" transform="rotate(32 18 28.2)"/>
    <ellipse cx="30" cy="28.2" rx="3.9" ry="4.9" fill="#2f2c33" transform="rotate(-32 30 28.2)"/>
    <ellipse cx="18.4" cy="27.6" rx="1.9" ry="2.3" fill="#0f0d11"/>
    <ellipse cx="29.6" cy="27.6" rx="1.9" ry="2.3" fill="#0f0d11"/>
    <ellipse cx="19.1" cy="26.7" rx="0.75" ry="0.95" fill="#ffffff" opacity="0.95"/>
    <ellipse cx="30.3" cy="26.7" rx="0.75" ry="0.95" fill="#ffffff" opacity="0.95"/>
    <ellipse cx="24" cy="33.4" rx="2.1" ry="1.5" fill="#2f2c33"/>
    <path d="M22 35.4 Q24 37 26 35.4" fill="none" stroke="#2f2c33" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="13.6" cy="34" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="34.4" cy="34" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#2f2c33"/>
    <ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#2f2c33"/>
  </svg>`,
  duck: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 17 Q22 11 25 8 Q25 12 28 13 Q27 9 30 8 Q29 13 27 17 Z" fill="#ffd34d"/>
    <ellipse cx="24" cy="31" rx="15" ry="14" fill="#ffd34d"/>
    <path d="M9.5 33 Q5.5 35 6.5 39 Q10.5 39 12.5 36 Z M38.5 33 Q42.5 35 41.5 39 Q37.5 39 35.5 36 Z" fill="#f3bd2e"/>
    <ellipse cx="24" cy="36" rx="9" ry="6.5" fill="#fff1b8"/>
    <ellipse cx="18" cy="26" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="30" cy="26" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="18.8" cy="25" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="30.8" cy="25" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <path d="M18.5 31 Q24 28 29.5 31 Q24 35.5 18.5 31 Z" fill="#ff9a3c" stroke="#e07a22" stroke-width="0.8" stroke-linejoin="round"/>
    <ellipse cx="13.5" cy="31" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55"/>
    <ellipse cx="34.5" cy="31" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55"/>
    <path d="M13 43 H22 L20 47 H15 Z M26 43 H35 L33 47 H28 Z" fill="#ff9a3c"/>
  </svg>`,
  axolotl: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="24" cy="43" rx="8.5" ry="6" fill="#ffc2d4"/>
    <ellipse cx="24" cy="44" rx="5" ry="3.6" fill="#ffe6ee"/>
    <path d="M31 44 Q37 44 39 40 Q39.5 44 36 46 Q34 47 31 46.5 Z" fill="#f2a4bd"/>
    <path d="M9.5 19.75 C5.82 21.09 2.18 18.99 2.23 15.55 C5.18 13.79 8.82 15.89 9.5 19.75 Z M9 25 C6.22 27.9 1.76 27.75 0.08 24.69 C1.97 21.75 6.43 21.91 9 25 Z M9.5 30.25 C8.82 34.01 5.35 35.86 2.55 33.95 C2.53 30.56 6.01 28.71 9.5 30.25 Z M38.5 19.75 C39.18 15.89 42.82 13.79 45.77 15.55 C45.82 18.99 42.18 21.09 38.5 19.75 Z M39 25 C41.57 21.91 46.03 21.75 47.92 24.69 C46.24 27.75 41.78 27.9 39 25 Z M38.5 30.25 C41.99 28.71 45.47 30.56 45.45 33.95 C42.65 35.86 39.18 34.01 38.5 30.25 Z" fill="#ff6f91"/>
    <path d="M8.46 19.15 L3.78 16.45 M7.8 24.96 L1.88 24.75 M8.44 30.81 L4.14 33.1 M39.54 19.15 L44.22 16.45 M40.2 24.96 L46.12 24.75 M39.56 30.81 L43.86 33.1" fill="none" stroke="#e2426e" stroke-width="1" stroke-linecap="round" opacity="0.75"/>
    <ellipse cx="24" cy="26" rx="15.5" ry="13.5" fill="#ffc2d4"/>
    <ellipse cx="24" cy="30.5" rx="10" ry="6.5" fill="#ffe6ee" opacity="0.6"/>
    <ellipse cx="18" cy="26" rx="2.7" ry="3.19" fill="#1f1a1e"/>
    <ellipse cx="30" cy="26" rx="2.7" ry="3.19" fill="#1f1a1e"/>
    <ellipse cx="18.81" cy="24.92" rx="0.86" ry="1.03" fill="#ffffff" opacity="0.95"/>
    <ellipse cx="30.81" cy="24.92" rx="0.86" ry="1.03" fill="#ffffff" opacity="0.95"/>
    <path d="M21 31 Q22.5 32.65 24 31 Q25.5 32.65 27 31" fill="none" stroke="#2d1a20" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="12.5" cy="31" rx="2.3" ry="1.4" fill="#ff6f91" opacity="0.55"/>
    <ellipse cx="35.5" cy="31" rx="2.3" ry="1.4" fill="#ff6f91" opacity="0.55"/>
    <ellipse cx="19" cy="48.5" rx="3" ry="2" fill="#f2a4bd"/>
    <ellipse cx="29" cy="48.5" rx="3" ry="2" fill="#f2a4bd"/>
  </svg>`,
  turtle: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="17" cy="46" rx="4.5" ry="3" fill="#8fd27a"/>
    <ellipse cx="31" cy="46" rx="4.5" ry="3" fill="#8fd27a"/>
    <path d="M7.5 42 C7.5 28 14.5 23 24 23 C33.5 23 40.5 28 40.5 42 Q24 47 7.5 42 Z" fill="#6e4f27"/>
    <path d="M9.6 40.8 C9.6 29.5 15.6 25.2 24 25.2 C32.4 25.2 38.4 29.5 38.4 40.8 Q24 45 9.6 40.8 Z" fill="#a0753e"/>
    <path d="M18.6 35.5 H29.4 L31 41.6 Q24 43.8 17 41.6 Z M11.3 39.8 C11.2 34 12.8 30.2 16.2 28.4 L17.2 35 L15.6 41.1 Q13 40.8 11.3 39.8 Z M36.7 39.8 C36.8 34 35.2 30.2 31.8 28.4 L30.8 35 L32.4 41.1 Q35 40.8 36.7 39.8 Z" fill="#c99f62"/>
    <path d="M8.4 41.8 Q24 46.6 39.6 41.8" fill="none" stroke="#e2c58c" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="13.2" cy="33.5" rx="1.1" ry="2.8" fill="#ffffff" opacity="0.3" transform="rotate(22 13.2 33.5)"/>
    <ellipse cx="24" cy="25" rx="11.2" ry="10" fill="#9edb86"/>
    <ellipse cx="19.5" cy="25" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="28.5" cy="25" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="20.2" cy="24.1" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="29.2" cy="24.1" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <path d="M21.8 29.4 Q24 31.2 26.2 29.4" fill="none" stroke="#2f5a28" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="15.8" cy="28.6" rx="2.1" ry="1.2" fill="#f59aa8" opacity="0.7"/>
    <ellipse cx="32.2" cy="28.6" rx="2.1" ry="1.2" fill="#f59aa8" opacity="0.7"/>
  </svg>`,
  snowman: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <line x1="13.5" y1="34" x2="5" y2="28" stroke="#7a5a3c" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="7.6" y1="29.8" x2="7" y2="26.6" stroke="#7a5a3c" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="34.5" y1="34" x2="43" y2="28" stroke="#7a5a3c" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="40.4" y1="29.8" x2="41" y2="26.6" stroke="#7a5a3c" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="24" cy="38.8" rx="14" ry="9.4" fill="#b9c8d8"/>
    <ellipse cx="24" cy="38.2" rx="13.2" ry="8.6" fill="#f4f7fa"/>
    <ellipse cx="24" cy="24.5" rx="10.4" ry="9.8" fill="#b9c8d8"/>
    <ellipse cx="24" cy="24.1" rx="9.6" ry="9.1" fill="#f4f7fa"/>
    <ellipse cx="20.5" cy="18.6" rx="2.4" ry="1.3" fill="#ffffff" opacity="0.8"/>
    <ellipse cx="20" cy="23" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="28" cy="23" rx="2.2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="20.7" cy="22.1" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="28.7" cy="22.1" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="26.6" cy="27.4" rx="3.4" ry="1.3" fill="#f28c38" transform="rotate(12 26.6 27.4)"/>
    <ellipse cx="16.8" cy="28.6" rx="2" ry="1.2" fill="#f59aa8" opacity="0.6"/>
    <ellipse cx="31.6" cy="28.6" rx="2" ry="1.2" fill="#f59aa8" opacity="0.6"/>
    <ellipse cx="24" cy="35" rx="1.1" ry="1.1" fill="#2d241c"/>
    <ellipse cx="24" cy="39" rx="1.1" ry="1.1" fill="#2d241c"/>
    <ellipse cx="24" cy="43" rx="1.1" ry="1.1" fill="#2d241c"/>
  </svg>`,
  hive: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="11" cy="18" rx="6" ry="8" fill="#dff3ff" opacity="0.9" stroke="#8fb8d4" stroke-width="1" transform="rotate(-25 11 18)"/>
    <ellipse cx="37" cy="18" rx="6" ry="8" fill="#dff3ff" opacity="0.9" stroke="#8fb8d4" stroke-width="1" transform="rotate(25 37 18)"/>
    <path d="M19 17 Q16 10 13 8 M29 17 Q32 10 35 8" fill="none" stroke="#2b2018" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="13" cy="8" rx="2.2" ry="2.2" fill="#2b2018"/>
    <ellipse cx="35" cy="8" rx="2.2" ry="2.2" fill="#2b2018"/>
    <ellipse cx="24" cy="31" rx="15" ry="14" fill="#f6c443"/>
    <path d="M10.5 35 Q24 40 37.5 35 V38.4 Q24 43.4 10.5 38.4 Z M12 41.5 Q24 45.5 36 41.5 L34 44.1 Q24 47.1 14 44.1 Z" fill="#2b2018"/>
    <ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="18.8" cy="26" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="30.8" cy="26" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9"/>
    <ellipse cx="14" cy="32" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55"/>
    <ellipse cx="34" cy="32" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55"/>
    <path d="M22 31.5 Q24 33.3 26 31.5" fill="none" stroke="#2b2018" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="17" cy="47" rx="4.2" ry="2.8" fill="#2b2018"/>
    <ellipse cx="31" cy="47" rx="4.2" ry="2.8" fill="#2b2018"/>
  </svg>`,
}

// The buddy wearing its accessories (worn), when it has any on.
export function buddySvgFor(id, worn = null, tone = '') {
  const base = BUDDY_SVG[String(id || '')] || ''
  return worn ? dressedSvg(base, String(id || ''), worn, tone || undefined) : base
}

function BuddyMark({ id, worn, tone, compact }) {
  const svg = buddySvgFor(id, worn, tone)
  if (!svg) return null
  const dressed = svg !== BUDDY_SVG[id]
  // Same width either way, so an outfit never squeezes the question; dressed,
  // the buddy draws a little smaller to leave room for wings and hats.
  const boxW = compact ? 28 : 36
  const boxH = dressed ? (boxW * (58 + ACCESSORY_PAD * 2)) / (48 + ACCESSORY_PAD * 2) : (boxW * 58) / 48
  return <SvgWidget svg={svg} style={{ width: boxW, height: boxH }} />
}

const FALLBACK = {
  bg: '#0e1014',
  panel: '#16191f',
  ink: '#f4f6fa',
  inkSoft: '#99a1b0',
  on: '#c9f24d',
  skip: '#7d8694',
  miss: '#ff6f61',
  line: '#2b3140',
  gem: false,
}

function palette(props) {
  return props?.colors ? { ...FALLBACK, ...props.colors } : FALLBACK
}

function leadItem(p) {
  const items = p.items || []
  const hasOpen = items.some((item) => item.status === 'open')
  const id = String(p.leadLampId || '').trim()
  // leadNight picks between last night's and tonight's card for one question.
  const night = String(p.leadNight || '').trim()
  if (id) {
    const hit = items.find(
      (item) =>
        item.lampId === id &&
        (!night || String(item.periodKey || '') === night) &&
        (item.status === 'open' || (!hasOpen && item.status === 'skip')),
    )
    if (hit) return hit
  }
  return items.find((item) => item.status === 'open') || items.find((item) => item.status === 'skip') || null
}

function questionLine(p, lead) {
  if (lead) {
    const fromLead = String(lead.question || '').trim() || String(lead.label || '').trim()
    if (fromLead) return fromLead
  }
  const top = String(p.question || '').trim()
  if (top) return top
  return String(p.footer || p.openLabel || '').trim()
}

function widgetSize(widgetInfo) {
  const h = widgetInfo?.height || 0
  const w = widgetInfo?.width || 0
  const short = h > 0 && h < 170
  const compact = short || (h > 0 && h < 150 && (w === 0 || w < 280))
  const tight = h > 0 && h < 132
  const large = !compact && (h >= 200 || (w >= 320 && h >= 160))
  return { compact, tight, large, h, w }
}

// Greedy word wrap estimate. Roboto bold averages about 0.5em per glyph.
function linesFor(text, fontSize, width) {
  const perLine = Math.max(4, Math.floor(width / (fontSize * 0.5)))
  let lines = 1
  let used = 0
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const len = word.length
    if (used === 0) used = len
    else if (used + 1 + len <= perLine) used += 1 + len
    else {
      lines += 1
      used = len
    }
    while (used > perLine) {
      lines += 1
      used -= perLine
    }
  }
  return lines
}

// Biggest size that fits the whole question in the room the card has, so it
// never cuts off mid-line. Falls back to the size cap when the widget size is
// unknown.
export function fitQuestion(text, max, width, height) {
  if (!(width > 0) || !(height > 0)) return { fontSize: max, lines: 3 }
  for (let size = max; size >= 12; size -= 1) {
    const lines = linesFor(text, size, width)
    if (lines * size * 1.2 <= height) return { fontSize: size, lines }
  }
  return { fontSize: 12, lines: Math.max(1, Math.floor(height / (12 * 1.2))) }
}

export function renderDidITonightAndroidWidget(props, widgetInfo) {
  const raw = props || {
    tagTitle: 'Did I',
    question: '',
    items: [],
    footer: '',
    didLabel: 'Did',
    nopeLabel: 'Not yet',
    openLabel: 'Open',
    left: 0,
    openUri: 'didi://tonight',
  }
  const p = raw
  const C = palette(p)
  const tonightUri = p.openUri || 'didi://tonight'
  const { compact, tight, large } = widgetSize(widgetInfo)
  const gem = Boolean(C.gem)
  const lead = leadItem(p)
  const buddyId = String(p.buddyId || '')
  const showBuddy = Boolean(buddyId) && !tight
  const question = questionLine(p, lead)
  // Every so often: "Last time: 6 days ago" under the question (buildTonightWidgetProps).
  const sinceText = lead
    ? String(lead.since || (lead.lampId === p.leadLampId ? p.sinceLine : '') || '').trim()
    : ''
  const radius = compact ? 16 : large ? 24 : 22
  const titleSize = lead
    ? tight
      ? 15
      : compact
        ? 18
        : large
          ? 28
          : 24
    : compact
      ? 13
      : 14
  const panelPadH = compact ? 12 : large ? 16 : 14
  const panelPadV = tight ? 8 : compact ? 10 : large ? 14 : 12
  const actionGap = tight ? 6 : 8
  const ringPad = 2
  const outerPad = compact ? 8 : 10
  // Next steps through open questions, or the did-nots once none are open.
  const items = p.items || []
  const openCount = items.filter((item) => item.status === 'open').length
  const browsable = openCount || items.filter((item) => item.status === 'skip').length
  const showNext = Boolean(lead) && browsable > 1 && !tight
  const { w, h } = widgetSize(widgetInfo)
  const buttonH = (tight ? 5 : compact ? 6 : 8) * 2 + (compact ? 13 : 15) * 1.35
  // Too narrow to keep the buddy's corner clear on both sides of the question
  // (that left it no width at all): the question goes under the buddy instead.
  const sideGap = showBuddy ? (compact ? 28 : 34) : 4
  const stack = showBuddy && w > 0 && w - 2 * (outerPad + ringPad + panelPadH + sideGap) < 90
  const buddyDrop = stack ? (compact ? 24 : 30) : 0
  const showSince = Boolean(sinceText) && !tight
  const sinceH = showSince ? (compact ? 14 : 16) : 0
  const roomW = w - 2 * (outerPad + ringPad + panelPadH) - 2 * (stack ? 4 : sideGap)
  const roomH =
    h -
    2 * (outerPad + ringPad + panelPadV) -
    15 -
    (tight ? 2 : 4) -
    buddyDrop -
    sinceH -
    (lead ? actionGap * 2 + buttonH : actionGap + 16)
  const fit = lead ? fitQuestion(question, titleSize, roomW, roomH) : { fontSize: titleSize, lines: 2 }
  const questionSize = fit.fontSize
  const questionLines = fit.lines

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: gem ? C.bg : C.panel,
        flexDirection: 'column',
        padding: outerPad,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          backgroundColor: C.on,
          borderRadius: radius,
          padding: ringPad,
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <OverlapWidget
          style={{
            width: 'match_parent',
            height: '100%',
          }}
        >
          <FlexWidget
            style={{
              height: '100%',
              width: 'match_parent',
              backgroundColor: C.panel,
              borderRadius: compact ? 14 : large ? 22 : 20,
              paddingHorizontal: panelPadH,
              paddingVertical: panelPadV,
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <TextWidget
              text={String(p.tagTitle || 'Did I').toUpperCase()}
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: C.on,
                textAlign: 'center',
                width: 'match_parent',
                paddingHorizontal: showNext ? (compact ? 50 : 56) : 0,
              }}
              maxLines={1}
            />
            <FlexWidget
              style={{
                flex: 1,
                width: 'match_parent',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: stack ? 4 : sideGap,
                marginTop: (tight ? 2 : 4) + buddyDrop,
                marginBottom: lead ? actionGap : 0,
                overflow: 'hidden',
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: tonightUri }}
            >
              <TextWidget
                text={lead ? question : p.footer || p.openLabel}
                style={{
                  fontSize: questionSize,
                  fontWeight: lead ? '700' : '500',
                  color: lead ? C.ink : C.inkSoft,
                  textAlign: 'center',
                  width: 'match_parent',
                }}
                maxLines={questionLines}
              />
              {showSince ? (
                <TextWidget
                  text={sinceText}
                  style={{
                    fontSize: compact ? 10 : 12,
                    fontWeight: '600',
                    color: C.inkSoft,
                    textAlign: 'center',
                    width: 'match_parent',
                    marginTop: 2,
                  }}
                  maxLines={1}
                />
              ) : null}
            </FlexWidget>
            {lead
              ? [
                  <FlexWidget
                    key="actions"
                    style={{
                      flexDirection: 'row',
                      width: 'match_parent',
                      marginTop: actionGap,
                    }}
                  >
                    <FlexWidget
                      style={{
                        flex: 1,
                        backgroundColor: C.skip,
                        borderRadius: 12,
                        paddingVertical: tight ? 5 : compact ? 6 : 8,
                        marginRight: 6,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      clickAction="ANSWER"
                      clickActionData={{ lampId: lead.lampId, kind: 'nope', night: String(lead.periodKey || '') }}
                    >
                      <TextWidget
                        text={p.nopeLabel || 'Not yet'}
                        style={{ fontSize: compact ? 13 : 15, fontWeight: '700', color: C.ink, textAlign: 'center' }}
                        maxLines={1}
                      />
                    </FlexWidget>
                    <FlexWidget
                      style={{
                        flex: 1,
                        backgroundColor: C.on,
                        borderRadius: 12,
                        paddingVertical: tight ? 5 : compact ? 6 : 8,
                        marginLeft: 6,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      clickAction="ANSWER"
                      clickActionData={{ lampId: lead.lampId, kind: 'did', night: String(lead.periodKey || '') }}
                    >
                      <TextWidget
                        text={p.didLabel || 'Did'}
                        style={{ fontSize: compact ? 13 : 15, fontWeight: '700', color: C.bg, textAlign: 'center' }}
                        maxLines={1}
                      />
                    </FlexWidget>
                  </FlexWidget>,
                ]
              : (
              <TextWidget
                text={p.openLabel}
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: C.on,
                  textAlign: 'center',
                  width: 'match_parent',
                  marginTop: actionGap,
                }}
                maxLines={1}
                clickAction="OPEN_URI"
                clickActionData={{ uri: tonightUri }}
              />
            )}
            {!compact && String(p.weLine || '').trim() ? (
              <TextWidget
                text={String(p.weLine).trim()}
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: C.on,
                  textAlign: 'center',
                  width: 'match_parent',
                  marginTop: tight ? 2 : 4,
                }}
                maxLines={1}
                clickAction="OPEN_URI"
                clickActionData={{ uri: tonightUri }}
              />
            ) : null}
          </FlexWidget>
          {showBuddy ? (
            <FlexWidget
              style={{
                width: 'match_parent',
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-end',
                paddingTop: panelPadV + ringPad,
                paddingRight: panelPadH + ringPad,
              }}
            >
              <BuddyMark id={buddyId} worn={p.buddyWorn} tone={palette(p).on} compact={compact} />
            </FlexWidget>
          ) : null}
          {showNext ? (
            // Top-left, opposite the buddy. Browses the other open questions
            // tonight without answering one.
            <FlexWidget
              style={{
                width: 'match_parent',
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                paddingTop: panelPadV + ringPad - 3,
                paddingLeft: panelPadH + ringPad - 4,
              }}
            >
              <FlexWidget
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.bg,
                  borderWidth: 1,
                  borderColor: C.on,
                  borderRadius: 11,
                  paddingHorizontal: compact ? 7 : 9,
                  paddingVertical: compact ? 2 : 3,
                }}
                clickAction="PEEK"
                clickActionData={{ dir: 'next' }}
              >
                <TextWidget
                  text={`${p.nextLabel || 'Next'} ›`}
                  style={{ fontSize: compact ? 10 : 11, fontWeight: '700', color: C.on }}
                  maxLines={1}
                />
              </FlexWidget>
            </FlexWidget>
          ) : null}
        </OverlapWidget>
      </FlexWidget>
    </FlexWidget>
  )
}
