import { useState } from 'react';
import SettingsModal from './SettingsModal';

function NavigationBar() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'markets', label: 'Markets', icon: '📊' },
    { id: 'trade', label: 'Trade', icon: '💱', hasDropdown: true },
    { id: 'news', label: 'News', icon: '📰' },
  ];

  const handleNavigation = (itemId) => {
    setActiveTab(itemId);
    
    switch(itemId) {
      case 'dashboard':
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
        
      case 'markets':
        // Scroll to top to show Crypto Pulse ticker
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          alert('📊 Markets Overview\n\nReal-time crypto prices are displayed in the ticker above.\n\nFeatures:\n• Live price updates\n• 24h price changes\n• Scrolling ticker animation\n\nFull market analysis coming soon!');
        }, 300);
        break;
        
      case 'trade':
        // Show trade options menu
        showTradeMenu();
        break;
        
      case 'news':
        // Scroll to Knowledge Terminal (news/market insights)
        const knowledgeSection = document.getElementById('knowledge-section');
        if (knowledgeSection) {
          // Account for sticky header height
          const headerOffset = 120;
          const elementPosition = knowledgeSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          setTimeout(() => {
            alert('📰 News & Market Insights\n\nUse the Knowledge Terminal below to:\n• Ask about any cryptocurrency\n• Get real-time market analysis\n• Access AI-powered insights\n\nTry asking: "How is Bitcoin doing?" or "What strategies do you use?"');
          }, 500);
        }
        break;
        
      default:
        break;
    }
  };

  const showTradeMenu = () => {
    const choice = prompt(
      '💱 Select Trading Mode:\n\n' +
      '1. Spot Trade (Manual)\n' +
      '2. Futures (Strategies)\n' +
      '3. Convert (Coming Soon)\n\n' +
      'Enter 1, 2, or 3:'
    );
    
    switch(choice) {
      case '1':
        // Scroll to Manual Trade section
        const manualSection = document.getElementById('manual-section');
        if (manualSection) {
          manualSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          alert('⚠️ Please login and complete KYC verification to access Manual Trading');
        }
        break;
        
      case '2':
        // Scroll to Strategy Grid (Futures)
        const strategySection = document.getElementById('strategy-section');
        if (strategySection) {
          strategySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          alert('⚠️ Please login and complete KYC verification to access Futures Trading');
        }
        break;
        
      case '3':
        // Convert feature
        alert('⚠️ Currency Conversion requires Level 2 Verification.\n\nThis feature is coming soon!');
        break;
        
      default:
        // User cancelled or invalid input
        break;
    }
  };

  return (
    <>
      <nav className="bg-slate-900/95 backdrop-blur-lg border-b border-neon-purple/30 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎃</div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
                  Kaseddie AI
                </h1>
                <p className="text-xs text-slate-500">Autonomous Trading</p>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === item.id
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                  {item.hasDropdown && <span className="text-xs">▼</span>}
                </button>
              ))}
            </div>

            {/* Settings Icon */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 hover:border-neon-purple/50"
              title="Settings"
            >
              <span className="text-xl">⚙️</span>
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2 pb-3 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg whitespace-nowrap text-sm ${
                  activeTab === item.id
                    ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                    : 'text-slate-400 bg-slate-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default NavigationBar;
