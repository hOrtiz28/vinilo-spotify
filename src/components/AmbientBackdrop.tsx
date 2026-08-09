type AmbientBackdropProps = {
  coverUrl?: string | null
  playing: boolean
}

export function AmbientBackdrop({ coverUrl, playing }: AmbientBackdropProps) {
  return (
    <div className={`ambient ${playing ? 'is-playing' : ''}`} aria-hidden>
      <div className="ambient-wash" />
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      {coverUrl && (
        <div className="ambient-cover" style={{ backgroundImage: `url(${coverUrl})` }} />
      )}
      <div className="ambient-grain" />
      <div className={`ambient-pulse ${playing ? 'on' : ''}`} />
    </div>
  )
}
