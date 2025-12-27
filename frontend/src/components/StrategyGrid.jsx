import { useState } from 'react';
import { getApiUrl } from '../config';

const STRATEGIES = [
  { 
    name: 'momentum', 
    icon: '📈', 
    label: 'Momentum',
    description: 'Best when market is moving fast. High risk, high reward.'
  },
  { 
    name: 'mean-reversion', 
    icon: '⚖️', 
    label: 'Mean Reversion',
    description: 'Buys dips, sells peaks. Works in ranging markets.'
  },
  { 
    name: 'breakout', 
    icon: '💥', 
    label: 'Breakout',
    description: 'Catches explosive moves. Great for volatile markets.'
  },
  { 
    name: 'rsi-divergence', 
    icon: '📊', 
    label: 'RSI Divergence',
    description: 'Spots trend reversals early. Medium risk.'
  },
  { 
    name: 'macd-crossover', 
    icon: '✂️', 
    label: 'MACD Crossover',
    description: 'Classic trend indicator. Reliable for beginners.'
  },
  { 
    name: 'volume-spike', 
    icon: '📢', 
    label: 'Volume Spike',
    description: 'Follows big money moves. High confidence signals.'
  },
  { 
    name: 'support-resistance', 
    icon: '🎯', 
    label: 'Support/Resistance',
    description: 'Trades key price levels. Conservative approach.'
  },
  { 
    name: 'trend-following', 
    icon: '🌊', 
    label: 'Trend Following',
    description: 'Rides the wave. Best for strong trends.'
  }
];

function StrategyGrid({ user }) {
  const [loadingStrategy, setLoadingStrategy] = useState(null);
  const [results, setResults] = useState({});

  // Only show if user is verified
  if (!user || user.kycStatus !== 'verified') {
    return null;
  }

  const executeStrategy = async (strategyName) => {
    setLoadingStrategy(strategyName);
    
    try {
      // Get userId from localStorage or use the passed user
      let userId = user.id;
      const storedUser = localStorage.getItem('kaseddie_user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          if (userObj.id) {
            userId = userObj.id;
          }
        } catch (e) {
          console.warn('Failed to parse user from localStorage:', e);
        }
      }

      // Create abort controller for 60s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        // Execute trade with the selected strategy
        const response = await fetch(getApiUrl('/api/trading/execute'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            symbol: 'BTC',
            strategyName: strategyName
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Strategy execution failed');
        }

        const data = await response.json();

        // Safely extract decision with fallback
        const decision = data.signal?.decision || data.action || data.decision || 'UNKNOWN';
        const message = data.message || `${decision} signal generated`;

        // Store result for this strategy
        setResults(prev => ({
          ...prev,
          [strategyName]: {
            action: decision,
            message: message,
            timestamp: Date.now()
          }
        }));

        // Speak the result using voice service (with timeout)
        if (message) {
          try {
            const audioController = new AbortController();
            const audioTimeoutId = setTimeout(() => audioController.abort(), 30000);

            const audioRes = await fetch(getApiUrl('/api/ai/speak'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: message }),
              signal: audioController.signal
            });
            
            clearTimeout(audioTimeoutId);

            if (audioRes.ok) {
              const audioBlob = await audioRes.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              audio.play();
              
              // Clean up the URL after playing
              audio.onended = () => URL.revokeObjectURL(audioUrl);
            }
          } catch (audioErr) {
            console.warn('Audio playback skipped:', audioErr.message);
          }
        }

        // Clear result after 8 seconds
        setTimeout(() => {
          setResults(prev => {
            const newResults = { ...prev };
            delete newResults[strategyName];
            return newResults;
          });
        }, 8000);

      } catch (fetchErr) {
        clearTimeout(timeoutId);
        
        if (fetchErr.name === 'AbortError') {
          // Timeout error
          setResults(prev => ({
            ...prev,
            [strategyName]: {
              action: 'TIMEOUT',
              message: 'Analysis timed out after 60s. Please try again.',
              timestamp: Date.now()
            }
          }));
          
          setTimeout(() => {
            setResults(prev => {
              const newResults = { ...prev };
              delete newResults[strategyName];
              return newResults;
            });
          }, 5000);
        } else {
          throw fetchErr;
        }
      }
    } catch (err) {
      console.error('Strategy execution error:', err);
      
      // Show error in results
      setResults(prev => ({
        ...prev,
        [strategyName]: {
          action: 'ERROR',
          message: err.message || 'Failed to execute strategy',
          timestamp: Date.now()
        }
      }));
      
      setTimeout(() => {
        setResults(prev => {
          const newResults = { ...prev };
          delete newResults[strategyName];
          return newResults;
        });
      }, 5000);
    } finally {
      setLoadingStrategy(null);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-3xl font-bold mb-6 text-center text-neon-purple">
        🎯 Strategy Control Panel
      </h2>
      <p className="text-center text-slate-400 mb-8">
        Select a trading strategy to execute
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STRATEGIES.map((strategy) => {
          const isLoading = loadingStrategy === strategy.name;
          const result = results[strategy.name];
          const isActive = result !== undefined;

          return (
            <button
              key={strategy.name}
              onClick={() => executeStrategy(strategy.name)}
              disabled={isLoading}
              className={`
                relative p-6 rounded-xl font-bold text-center
                backdrop-blur-lg border-2 transition-all duration-300
                transform hover:scale-105 min-h-[180px] flex flex-col justify-center
                ${isLoading 
                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse' 
                  : isActive && result.action === 'BUY'
                  ? 'bg-neon-green/20 border-neon-green text-neon-green animate-pulse-glow'
                  : isActive && result.action === 'SELL'
                  ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse-glow'
                  : isActive && (result.action === 'ERROR' || result.action === 'TIMEOUT')
                  ? 'bg-orange-500/20 border-orange-500 text-orange-500'
                  : 'bg-slate-800 border-neon-purple text-neon-purple hover:bg-neon-purple/10 hover:border-neon-green hover:text-neon-green'
                }
                disabled:cursor-not-allowed disabled:transform-none
              `}
            >
              <div className="text-4xl mb-2">{strategy.icon}</div>
              <div className="text-sm font-semibold mb-2">
                {strategy.label}
              </div>
              
              {isLoading ? (
                <div className="text-xs text-yellow-400 animate-pulse">
                  🔮 Analyzing...
                </div>
              ) : result ? (
                <div className="mt-2">
                  <div className="text-xs font-bold mb-1">RECOMMENDATION:</div>
                  <div className="text-2xl font-black">
                    {result.action}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-1 leading-tight">
                  {strategy.description}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {Object.keys(results).length > 0 && (
        <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-neon-green/30">
          <h3 className="text-lg font-bold mb-2 text-neon-green">Recent Signals</h3>
          <div className="space-y-2">
            {Object.entries(results).map(([strategyName, result]) => (
              <div key={strategyName} className="text-sm text-slate-300">
                <span className="font-semibold text-neon-purple">
                  {STRATEGIES.find(s => s.name === strategyName)?.label}:
                </span>{' '}
                <span className={result.action === 'BUY' ? 'text-neon-green' : 'text-red-500'}>
                  {result.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StrategyGrid;
