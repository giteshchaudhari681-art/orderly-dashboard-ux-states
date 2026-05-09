import { SIMULATE } from './mockApi'
import OrdersDashboard from './components/OrdersDashboard'

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(245,158,11,0.08), transparent 28%), radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 24%), var(--bg)',
      }}
    >
      <div
        style={{
          background: 'rgba(24, 28, 39, 0.82)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12,
          fontFamily: 'var(--mono)',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Simulation mode</span>
        <span
          style={{
            color:
              SIMULATE === 'success'
                ? 'var(--green)'
                : SIMULATE === 'error'
                  ? 'var(--red)'
                  : SIMULATE === 'empty'
                    ? 'var(--accent)'
                    : 'var(--blue)',
            fontWeight: 700,
          }}
        >
          "{SIMULATE}"
        </span>
        <span style={{ color: 'var(--text-muted)' }}>Change `src/mockApi.js` to test each dashboard state.</span>
      </div>

      <OrdersDashboard />
    </div>
  )
}
