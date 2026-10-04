export default function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Tabby logo"
      style={{ verticalAlign: 'middle', marginRight: 8 }}>
      <rect width="32" height="32" rx="9" fill="#FF7A3D" />
      <g fill="#23213A">
        <ellipse cx="16" cy="21.5" rx="6.2" ry="5" />
        <ellipse cx="8.2" cy="15.5" rx="2.2" ry="2.8" />
        <ellipse cx="12.8" cy="9.8" rx="2.4" ry="3" />
        <ellipse cx="19.2" cy="9.8" rx="2.4" ry="3" />
        <ellipse cx="23.8" cy="15.5" rx="2.2" ry="2.8" />
      </g>
    </svg>
  )
}
