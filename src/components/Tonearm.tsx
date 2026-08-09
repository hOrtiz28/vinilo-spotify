type TonearmProps = {
  lowered: boolean
  onToggle?: () => void
}

export function Tonearm({ lowered, onToggle }: TonearmProps) {
  return (
    <button
      type="button"
      className={`tonearm ${lowered ? 'lowered' : ''}`}
      onClick={() => onToggle?.()}
      aria-label={lowered ? 'Levantar aguja (pausar)' : 'Bajar aguja (reproducir)'}
    >
      <div className="tonearm-base" />
      <div className="tonearm-arm">
        <div className="tonearm-counterweight" />
        <div className="tonearm-shaft" />
        <div className="tonearm-headshell">
          <div className="tonearm-stylus" />
        </div>
      </div>
    </button>
  )
}
