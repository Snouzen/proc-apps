export default function Loading() {
  return (
    <div style={{ padding: '0' }}>
      {/* Stats skeleton - 6 cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.5rem',
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            background: '#fff',
            borderRadius: '1rem',
            border: '1px solid #f1f5f9',
            padding: '1.25rem',
            height: '110px',
          }}>
            <div style={{
              width: '2rem', height: '2rem',
              background: '#e2e8f0', borderRadius: '0.5rem',
              marginBottom: '0.75rem',
            }} />
            <div style={{
              width: '6rem', height: '0.75rem',
              background: '#e2e8f0', borderRadius: '0.25rem',
              marginBottom: '0.5rem',
            }} />
            <div style={{
              width: '4rem', height: '1.5rem',
              background: '#e2e8f0', borderRadius: '0.25rem',
            }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div style={{
        marginTop: '2rem',
        background: '#fff',
        borderRadius: '1rem',
        border: '1px solid #f1f5f9',
        overflow: 'hidden',
        minHeight: '400px',
      }}>
        {/* Table header */}
        <div style={{
          display: 'flex', gap: '1rem',
          padding: '1rem 1.5rem',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {[80, 120, 100, 80, 100, 80].map((w, i) => (
            <div key={i} style={{
              width: `${w}px`, height: '0.75rem',
              background: '#e2e8f0', borderRadius: '0.25rem',
            }} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, r) => (
          <div key={r} style={{
            display: 'flex', gap: '1rem',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #f8fafc',
          }}>
            {[80, 120, 100, 80, 100, 80].map((w, i) => (
              <div key={i} style={{
                width: `${w}px`, height: '0.625rem',
                background: '#f1f5f9', borderRadius: '0.25rem',
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
