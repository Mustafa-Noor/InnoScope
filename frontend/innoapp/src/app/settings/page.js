export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: '700', 
        color: '#083d44',
        marginBottom: '16px',
        fontFamily: 'Poppins, sans-serif'
      }}>
        Settings
      </h1>
      <p style={{ 
        fontSize: '1.1rem', 
        color: '#6b7280',
        fontFamily: 'Poppins, sans-serif'
      }}>
        Configure your InnoScope preferences.
      </p>
      
      <div style={{
        marginTop: '40px',
        padding: '30px',
        backgroundColor: 'white',
        border: '2px solid rgba(16, 185, 129, 0.1)',
        borderRadius: '20px',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
      }}>
        <p style={{ 
          color: '#6b7280', 
          fontFamily: 'Poppins, sans-serif',
          textAlign: 'center',
          fontSize: '1.1rem'
        }}>
          ⚙️ Settings panel coming soon...
        </p>
      </div>
    </div>
  );
}