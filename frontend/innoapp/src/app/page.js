export default function Home() {
  return (
    <div>
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: '700', 
        color: '#083d44',
        marginBottom: '16px',
        fontFamily: 'Poppins, sans-serif'
      }}>
        Welcome to InnoScope
      </h1>
      <p style={{ 
        fontSize: '1.1rem', 
        color: '#6b7280',
        fontFamily: 'Poppins, sans-serif'
      }}>
        Select a feature from the sidebar to get started.
      </p>
      
      <div style={{
        marginTop: '40px',
        padding: '30px',
        backgroundColor: 'white',
        border: '2px solid rgba(16, 185, 129, 0.1)',
        borderRadius: '20px',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#083d44',
          marginBottom: '20px',
          fontFamily: 'Poppins, sans-serif'
        }}>
          Available Features
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.02)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '15px'
          }}>
            <h3 style={{ color: '#059669', fontFamily: 'Poppins, sans-serif', marginBottom: '10px' }}>🗣️ Layman Chat</h3>
            <p style={{ color: '#6b7280', fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem' }}>
              Simple conversation interface for easy interactions
            </p>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.02)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '15px'
          }}>
            <h3 style={{ color: '#059669', fontFamily: 'Poppins, sans-serif', marginBottom: '10px' }}>🗺️ Roadmap</h3>
            <p style={{ color: '#6b7280', fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem' }}>
              Generate intelligent project roadmaps from your files
            </p>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.02)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '15px'
          }}>
            <h3 style={{ color: '#059669', fontFamily: 'Poppins, sans-serif', marginBottom: '10px' }}>📁 Files Chat</h3>
            <p style={{ color: '#6b7280', fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem' }}>
              Interactive chat with your project files
            </p>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.02)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '15px'
          }}>
            <h3 style={{ color: '#059669', fontFamily: 'Poppins, sans-serif', marginBottom: '10px' }}>🤝 Collaborate</h3>
            <p style={{ color: '#6b7280', fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem' }}>
              Work together with your team members
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
