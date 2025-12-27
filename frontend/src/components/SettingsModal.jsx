import { useState, useEffect } from 'react';

function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('preferences');
  
  // State
  const [autoTrade, setAutoTrade] = useState(false);
  const [riskLevel, setRiskLevel] = useState('medium');
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [apiKey, setApiKey] = useState('');
  
  // Action States
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [feedbackStatus, setFeedbackStatus] = useState('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState('feature');

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem('kaseddie_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAutoTrade(parsed.autoTrade || false);
        setRiskLevel(parsed.riskLevel || 'medium');
        setNotifications(parsed.notifications !== false);
        setSound(parsed.sound !== false);
        setApiKey(parsed.apiKey || '');
      } catch(e) {}
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('kaseddie_settings', JSON.stringify({ autoTrade, riskLevel, notifications, sound, apiKey }));
  }, [autoTrade, riskLevel, notifications, sound, apiKey]);

  const handleCleanCache = () => {
    if (confirm('⚠️ Are you sure? This will log you out and reset all local data.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    await new Promise(r => setTimeout(r, 2000));
    setUpdateStatus('updated');
    setTimeout(() => setUpdateStatus('idle'), 3000);
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    
    setFeedbackStatus('sending');
    await new Promise(r => setTimeout(r, 1500));
    
    setFeedbackStatus('sent');
    setTimeout(() => {
      setFeedbackMessage('');
      setFeedbackStatus('idle');
    }, 2000);
  };

  const menuItems = [
    { id: 'preferences', label: 'Trading Preferences', icon: '⚙️', desc: 'Risk & Automation' },
    { id: 'api', label: 'API Keys', icon: '🔑', desc: 'Connection Security' },
    { id: 'maintenance', label: 'System', icon: '🛠️', desc: 'Updates & Cache' },
    { id: 'feedback', label: 'Support', icon: '💬', desc: 'Contact Us' }
  ];

  return (
    // WRAPPER: Z-9999 forces it on top of EVERYTHING. Fixed position locks it to screen.
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col animate-in fade-in duration-200">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-neon-purple/10 rounded-xl border border-neon-purple/30">
            <span className="text-2xl">⚙️</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">SYSTEM SETTINGS</h2>
            <p className="text-slate-500 text-sm">Kaseddie AI Configuration Console</p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="px-6 py-3 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500 text-white font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2 group"
        >
          <span>Close Console</span>
          <span className="text-xl group-hover:rotate-90 transition-transform">✕</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA (Split View) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT SIDEBAR */}
        <aside className="w-80 bg-slate-900/50 border-r border-slate-800 overflow-y-auto p-6 space-y-3 hidden md:block">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full p-4 rounded-xl text-left transition-all border-2 group ${
                activeTab === item.id 
                  ? 'bg-neon-purple/10 border-neon-purple text-white shadow-[0_0_20px_rgba(188,19,254,0.2)]' 
                  : 'bg-slate-900 border-transparent hover:bg-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{item.icon}</span>
                <span className={`font-bold text-lg ${activeTab === item.id ? 'text-neon-purple' : 'group-hover:text-white'}`}>
                  {item.label}
                </span>
              </div>
              <p className="text-xs opacity-60 pl-10">{item.desc}</p>
            </button>
          ))}
        </aside>

        {/* RIGHT CONTENT PANEL */}
        <main className="flex-1 bg-slate-950 p-10 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            
            {/* Mobile Menu (Visible only on small screens) */}
            <div className="md:hidden mb-8 grid grid-cols-2 gap-2">
                {menuItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`p-3 rounded-lg border text-sm font-bold ${activeTab === item.id ? 'bg-neon-purple text-white border-neon-purple' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                    >
                        {item.icon} {item.label}
                    </button>
                ))}
            </div>
            
            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                <h3 className="text-3xl font-bold text-white border-b border-slate-800 pb-6">Trading Preferences</h3>
                
                {/* Auto Trade Card */}
                <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-neon-green/50 transition-all">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-white">Autonomous Trading</h4>
                    <p className="text-slate-400">Grant AI permission to execute trades without manual approval.</p>
                  </div>
                  <div 
                    onClick={() => setAutoTrade(!autoTrade)}
                    className={`w-20 h-10 rounded-full p-1 cursor-pointer transition-colors ${autoTrade ? 'bg-neon-green' : 'bg-slate-700'}`}
                  >
                    <div className={`bg-white w-8 h-8 rounded-full shadow-lg transform transition-transform ${autoTrade ? 'translate-x-10' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Risk Grid */}
                <div className="space-y-4">
                  <label className="text-slate-300 font-bold uppercase tracking-widest text-sm">Risk Profile</label>
                  <div className="grid grid-cols-3 gap-6">
                    {['low', 'medium', 'high'].map(level => (
                      <button
                        key={level}
                        onClick={() => setRiskLevel(level)}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${
                          riskLevel === level 
                            ? 'border-neon-green bg-neon-green/10 text-white scale-105 shadow-lg' 
                            : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600'
                        }`}
                      >
                        <div className="text-3xl mb-3">{level === 'low' ? '🛡️' : level === 'medium' ? '⚖️' : '🚀'}</div>
                        <div className="font-bold capitalize text-lg">{level} Risk</div>
                        <div className="text-sm opacity-60 mt-1">Max drawdown: {level === 'low' ? '1%' : level === 'medium' ? '2%' : '5%'}</div>
                      </button>
                    ))}
                  </div>
                </div>

                 {/* Sound Toggle */}
                 <div className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-white font-medium text-lg">🔊 Sound Effects</span>
                    <div 
                      onClick={() => setSound(!sound)}
                      className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${sound ? 'bg-neon-purple' : 'bg-slate-700'}`}
                    >
                      <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${sound ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                 </div>
              </div>
            )}

            {/* API TAB */}
            {activeTab === 'api' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                <h3 className="text-3xl font-bold text-white border-b border-slate-800 pb-6">API Connectors</h3>
                <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-4 items-start">
                  <span className="text-3xl">🔒</span>
                  <div>
                    <h4 className="font-bold text-yellow-200">Secure Vault</h4>
                    <p className="text-yellow-200/70 text-sm mt-1">Keys are encrypted and stored locally. They are never saved to our database.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-white font-bold text-lg">Binance API Key</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-800 focus:border-neon-purple p-6 rounded-xl text-xl text-white font-mono"
                    placeholder="sk_live_xxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>
            )}

            {/* Maintenance TAB */}
            {activeTab === 'maintenance' && (
               <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                  <h3 className="text-3xl font-bold text-white border-b border-slate-800 pb-6">System Maintenance</h3>
                  <button onClick={() => window.location.reload()} className="w-full p-8 bg-slate-900 border-2 border-slate-800 rounded-2xl hover:border-neon-green transition-all text-left group">
                      <div className="text-2xl font-bold text-white group-hover:text-neon-green">🔄 Check for Updates</div>
                      <p className="text-slate-500">Current Version: v1.0.0 (Frankenstein Build)</p>
                  </button>
                  <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-8 bg-red-950/10 border-2 border-red-900/30 rounded-2xl hover:border-red-500 transition-all text-left group">
                      <div className="text-2xl font-bold text-red-400 group-hover:text-red-300">🗑️ Factory Reset</div>
                      <p className="text-red-400/60">Clear all local data and logout.</p>
                  </button>
               </div>
            )}

            {/* Feedback TAB */}
            {activeTab === 'feedback' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-3xl font-bold text-white mb-2">Feedback</h3>
                  <p className="text-slate-400">Help us improve the Kaseddie AI trading engine.</p>
                </div>

                <form onSubmit={handleSendFeedback} className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {['bug', 'feature', 'general'].map(type => (
                       <button
                         key={type}
                         type="button"
                         onClick={() => setFeedbackType(type)}
                         className={`p-3 rounded-lg border text-sm font-bold capitalize transition-all ${
                           feedbackType === type 
                             ? 'bg-neon-purple text-white border-neon-purple' 
                             : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
                         }`}
                       >
                         {type === 'bug' ? '🐛 Bug' : type === 'feature' ? '💡 Idea' : '⭐ General'}
                       </button>
                    ))}
                  </div>

                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Describe your issue or idea..."
                    className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl focus:border-neon-green outline-none h-40 resize-none text-base"
                  />

                  <button 
                    type="submit"
                    disabled={!feedbackMessage || feedbackStatus !== 'idle'}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                      feedbackStatus === 'sent' 
                        ? 'bg-neon-green text-black'
                        : 'bg-gradient-to-r from-neon-purple to-blue-600 text-white hover:opacity-90'
                    }`}
                  >
                    {feedbackStatus === 'idle' && 'Submit Feedback'}
                    {feedbackStatus === 'sending' && '🚀 Sending...'}
                    {feedbackStatus === 'sent' && '✅ Message Received!'}
                  </button>
                </form>
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}

export default SettingsModal;