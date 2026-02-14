export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '40px', maxWidth: '800px', margin: '0 auto', color: '#1a1a2e' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>🔑 Silver Key Realty API</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>Powered by QUAM Core • 30 tables • GPT-5.2 Intelligence</p>

      <div style={{ display: 'grid', gap: '16px' }}>
        <Section title="Public Endpoints" endpoints={[
          { method: 'GET', path: '/api/pathways', desc: 'List available pathways (buyer, seller, investor, renter)' },
          { method: 'GET', path: '/api/properties?public=true', desc: 'List public property listings' },
          { method: 'GET', path: '/api/agents', desc: 'List active agents (or "coming soon")' },
          { method: 'POST', path: '/api/leads', desc: 'Submit lead (encrypts PII, AI scores, fires rules)' },
          { method: 'POST', path: '/api/agents', desc: 'Submit agent application' },
          { method: 'POST', path: '/api/analytics', desc: 'Log frontend event' },
          { method: 'POST', path: '/api/ai/concierge', desc: 'Chat with Silver Key AI concierge' },
        ]} />

        <Section title="Dashboard Endpoints" endpoints={[
          { method: 'GET', path: '/api/leads', desc: 'List all leads (decrypted)' },
          { method: 'PUT', path: '/api/leads', desc: 'Update lead status (state machine enforced)' },
          { method: 'GET', path: '/api/interactions', desc: 'List CRM interactions' },
          { method: 'POST', path: '/api/interactions', desc: 'Log new interaction' },
          { method: 'GET', path: '/api/consultations', desc: 'List consultations' },
          { method: 'POST', path: '/api/consultations', desc: 'Schedule consultation' },
          { method: 'GET', path: '/api/notifications?unread=true', desc: 'List notifications' },
          { method: 'GET', path: '/api/rules', desc: 'List business rules + activity' },
          { method: 'POST', path: '/api/rules', desc: 'Create business rule' },
        ]} />

        <Section title="AI Intelligence" endpoints={[
          { method: 'POST', path: '/api/ai/score-lead', desc: 'AI score a lead (0-100 with reasoning)' },
          { method: 'POST', path: '/api/ai/analyze', desc: 'Dana\'s Analyze button — plain English insights' },
          { method: 'POST', path: '/api/ai/sentiment', desc: 'Analyze interaction sentiment' },
          { method: 'POST', path: '/api/ai/property-narrative', desc: 'Generate Silver Key property description' },
        ]} />

        <Section title="System" endpoints={[
          { method: 'GET', path: '/api/health', desc: 'System health check (DB, Azure, encryption, RLS)' },
        ]} />
      </div>
    </div>
  );
}

function Section({ title, endpoints }: { title: string; endpoints: { method: string; path: string; desc: string }[] }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px' }}>
      <h2 style={{ fontSize: '16px', marginBottom: '12px', color: '#333' }}>{title}</h2>
      {endpoints.map((ep, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '8px', fontSize: '14px' }}>
          <span style={{
            background: ep.method === 'GET' ? '#e8f5e9' : ep.method === 'POST' ? '#e3f2fd' : '#fff3e0',
            color: ep.method === 'GET' ? '#2e7d32' : ep.method === 'POST' ? '#1565c0' : '#e65100',
            padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px',
          }}>{ep.method}</span>
          <code style={{ color: '#1a1a2e' }}>{ep.path}</code>
          <span style={{ color: '#999' }}>— {ep.desc}</span>
        </div>
      ))}
    </div>
  );
}
