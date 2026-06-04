import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HomeScreen from './screens/HomeScreen.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import ShareView from './components/ShareView.jsx';
import InfoVisionLogo from './components/InfoVisionLogo.jsx';
import './App.css';

function getShareId() {
  const match = window.location.hash.match(/^#share\/(.+)$/);
  return match ? match[1] : null;
}

const pageTransition = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.28 } },
};

export default function App() {
  const [shareId, setShareId] = useState(() => getShareId());
  const [selectedAgent, setSelectedAgent] = useState(null); // null = home screen
  const [agentName, setAgentName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [fileContext, setFileContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    const onHash = () => setShareId(getShareId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function handleSelectAgent(agent) {
    if (agent) {
      setSelectedAgent(agent);
      setAgentName(agent.name);
      setInstructions(agent.masterPrompt);
    } else {
      // Custom agent
      setSelectedAgent({ id: 'custom', name: 'Custom Agent', starters: [] });
      setAgentName('Custom Agent');
      setInstructions('');
    }
    setFileContext('');
    setUploadedFiles([]);
  }

  function handleBack() {
    setSelectedAgent(null);
    setAgentName('');
    setInstructions('');
  }

  // Share view
  if (shareId) {
    return <ShareView shareId={shareId} onBack={() => { window.location.hash = ''; }} />;
  }

  return (
    <AnimatePresence mode="wait">
      {!selectedAgent ? (
        <motion.div key="home" {...pageTransition} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <HomeScreen onSelectAgent={handleSelectAgent} />
        </motion.div>
      ) : (
        <motion.div key="builder" {...pageTransition} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="app">
            <header className="app-header">
              <button className="btn-back" onClick={handleBack}>
                <ArrowLeftIcon />
                Back
              </button>
              <div className="header-center">
                {selectedAgent.id !== 'custom' && (
                  <span className="header-agent-pill" style={{ background: `${selectedAgent.accentColor}22`, color: selectedAgent.accentColor, borderColor: `${selectedAgent.accentColor}44` }}>
                    {selectedAgent.name}
                  </span>
                )}
                <span className="agent-title">{agentName || 'Untitled Agent'}</span>
                <ChevronDownIcon />
              </div>
              <div className="header-right">
                <button className="btn-icon" title="More options"><DotsIcon /></button>
                <DeployButton
                  agentName={agentName}
                  instructions={instructions}
                  fileContext={fileContext}
                  starters={selectedAgent.starters || []}
                />
              </div>
            </header>

            <div className="app-body">
              <LeftPanel
                agentName={agentName}
                setAgentName={setAgentName}
                instructions={instructions}
                setInstructions={setInstructions}
                fileContext={fileContext}
                setFileContext={setFileContext}
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
              />
              <ChatPanel
                instructions={instructions}
                fileContext={fileContext}
                agentName={agentName}
                starters={selectedAgent.starters || []}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Deploy button ──────────────────────────────────────────────

function DeployButton({ agentName, instructions, fileContext, starters }) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function deploy() {
    setLoading(true);
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName, instructions, fileContext, conversationStarters: starters }),
      });
      const data = await res.json();
      setShareUrl(`${window.location.origin}/${data.shareUrl.replace(/^\//, '')}`);
      setShowModal(true);
    } catch (err) {
      alert('Deploy failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <motion.button className="btn-deploy" onClick={deploy} disabled={loading}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <RocketIcon />
        {loading ? 'Deploying…' : 'Deploy Agent'}
        <ChevronDownIcon />
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" onClick={() => setShowModal(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
              <div className="modal-header">
                <div className="modal-icon">🚀</div>
                <h2>Agent Deployed!</h2>
                <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <p className="modal-subtitle">
                Anyone with this link can chat with your <strong>{agentName}</strong> agent.
              </p>
              <div className="modal-url-row">
                <input className="modal-url-input" value={shareUrl || ''} readOnly />
                <button className="btn-copy" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                <button className="btn-primary" onClick={() => window.open(shareUrl, '_blank')}>Open Agent ↗</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────
export function ArrowLeftIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function ChevronDownIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function DotsIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg>;
}
function RocketIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M9.5 2.5C11 1 14.5 1.5 14.5 1.5S15 5 13.5 6.5L8 12l-4-4 5.5-5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5 11L2 14M6.5 9.5l-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
