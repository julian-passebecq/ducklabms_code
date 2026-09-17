import { useState } from 'react';
import { connectMotherDuck } from '../lib/motherduck';

export function DataEngineDialog({ open, onClose, mode, onMode }: {
  open: boolean;
  onClose: () => void;
  mode: 'Local workspace' | 'MotherDuck';
  onMode: (mode: 'Local workspace' | 'MotherDuck') => void;
}) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  if (!open) return null;
  const connect = async () => {
    setStatus('Connecting…');
    try {
      await connectMotherDuck(token);
      onMode('MotherDuck');
      setToken('');
      setStatus('Connected for this browser session.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Connection failed.');
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card engine-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header"><div><span className="eyebrow">Data engine</span><h2>Learning backend</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
        <div className="engine-options">
          <button className={`engine-option ${mode === 'Local workspace' ? 'active' : ''}`} onClick={() => { onMode('Local workspace'); setStatus('Using deterministic local training data.'); }}>
            <strong>Local workspace</strong><span>Recommended for tutorials. Deterministic sample tables, snapshots and outputs; no account needed.</span>
          </button>
          <div className={`engine-option engine-connect ${mode === 'MotherDuck' ? 'active' : ''}`}>
            <strong>MotherDuck WASM</strong><span>Optional personal connection for external SQL exploration. Notebook/pipeline learning runs continue to use the deterministic shared local workspace so tutorials remain reproducible.</span>
            <label className="form-field"><span>Personal access token</span><input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste for this session only" /></label>
            <button className="secondary-button" onClick={connect}>Connect</button>
          </div>
        </div>
        <div className="security-note"><strong>Token handling</strong><span>The token is kept only in React memory and passed to MotherDuck’s browser WASM client. It is not written to this project or localStorage by the simulator.</span></div>
        {status && <div className="validation-message ok"><span>{status}</span></div>}
      </section>
    </div>
  );
}
