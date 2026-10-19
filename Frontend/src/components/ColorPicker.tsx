import { COLOR_CHOICES, type DetectedColor } from '../lib/colors'
import './ColorPicker.css'

interface ColorPickerProps {
  value: DetectedColor | null
  onChange: (color: DetectedColor | null) => void
  /** A short note under the swatches, e.g. that the colour was auto-detected. */
  hint?: string
}

/** Pick a piece's colour from the named colours, or clear it. Uses the `modal__field` styles. */
export default function ColorPicker({ value, onChange, hint }: ColorPickerProps) {
  return (
    <div className="modal__field">
      <span>Color</span>
      <div className="colorpick" role="radiogroup" aria-label="Color">
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          className={`colorpick__none${value === null ? ' is-on' : ''}`}
          onClick={() => onChange(null)}
        >
          None
        </button>
        {COLOR_CHOICES.map((c) => (
          <button
            key={c.name}
            type="button"
            role="radio"
            aria-checked={value?.name === c.name}
            aria-label={c.name}
            title={c.name}
            className={`colorpick__swatch${value?.name === c.name ? ' is-on' : ''}`}
            style={{ background: c.hex }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
      <p className="colorpick__label">
        {value ? <strong>{value.name}</strong> : 'No color'}
        {hint && <small> · {hint}</small>}
      </p>
    </div>
  )
}
