import { useState } from 'react';
import { getApiUrl } from '../config';

function SummonAgent() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSummon = async () => {
    if (isLoading) return; // Prevent double-click
    
    setIsLoading(true);
    setIsActive(true);
    setMessage('Analyzing market...');
    
    try {
      // Get user ID from localStorage or use hardcoded fallback
      let userId = 'bd09bc8c-e725-4f3f-aa2c-075b074aabb9';
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
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        // Execute trade
        const res = await fetch(getApiUrl('/api/trading/execute'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            symbol: 'BTC',
            strategyName: 'momentum'
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Trade execution failed');
        }

        const data = await res.json();
        
        const resultMessage = data.message || 'Trade executed successfully';
        
        if (data.executed) {
          setMessage(`✅ ${resultMessage}`);
        } else {
          setMessage(`ℹ️ ${resultMessage}`);
        }
        
        setTimeout(() => {
          setMessage('');
          setIsActive(false);
        }, 5000);

        // Play audio response (with timeout)
        if (resultMessage) {
          try {
            const audioController = new AbortController();
            const audioTimeoutId = setTimeout(() => audioController.abort(), 30000);

            const audioRes = await fetch(getApiUrl('/api/ai/speak'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: resultMessage }),
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
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        
        if (fetchErr.name === 'AbortError') {
          setMessage('⏱️ Request timed out after 60s. Please try again.');
          setTimeout(() => {
            setMessage('');
            setIsActive(false);
          }, 5000);
        } else {
          throw fetchErr;
        }
      }
    } catch (err) {
      console.error('Failed to execute trade:', err);
      setMessage(`❌ ${err.message || 'Failed to execute trade'}`);
      setTimeout(() => {
        setMessage('');
        setIsActive(false);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mb-16">
      <button
        onClick={handleSummon}
        disabled={isLoading}
        className={`
          relative px-16 py-8 text-2xl font-bold rounded-2xl
          backdrop-blur-lg border-2 transition-all duration-300
          ${isLoading
            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse cursor-wait'
            : isActive 
            ? 'bg-neon-green/20 border-neon-green text-neon-green animate-pulse-glow' 
            : 'bg-ghost-white border-neon-purple text-neon-purple hover:bg-neon-purple/20'
          }
          disabled:cursor-not-allowed
        `}
      >
        <span className="relative z-10">
          {isLoading ? '⏳ Analyzing...' : isActive ? '🔮 Agent Active' : '👻 Summon Agent'}
        </span>
      </button>
      
      {message && (
        <p className="mt-6 text-neon-green text-lg animate-float">
          {message}
        </p>
      )}
    </div>
  );
}

export default SummonAgent;
