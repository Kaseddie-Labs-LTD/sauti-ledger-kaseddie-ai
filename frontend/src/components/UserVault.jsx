import { useState, useEffect } from 'react';
import ManualTrade from './ManualTrade';
import KYCVerification from './KYCVerification';
import { getApiUrl } from '../config';

function UserVault() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [playingIntro, setPlayingIntro] = useState(false);

  useEffect(() => {
    // Check if user is logged in (from URL callback or localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const userFromCallback = urlParams.get('user');
    
    if (userFromCallback) {
      try {
        const userData = JSON.parse(decodeURIComponent(userFromCallback));
        setUser(userData);
        localStorage.setItem('kaseddie_user', JSON.stringify(userData));
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      // Check localStorage
      const storedUser = localStorage.getItem('kaseddie_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch(getApiUrl('/api/auth/login'));
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Failed to initiate login');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('kaseddie_user');
    setMessage('Logged out successfully');
  };

  const playFrankensteinIntro = async () => {
    setPlayingIntro(true);
    
    const introScript = "Greetings. I am Kaseddie AI. I am not just a trading bot; I am a Frankenstein creation, stitched together from the most powerful APIs on the web. My body is built on Render and Netlify. My nervous system uses WorkOS for identity verification and Stripe for financial operations. My eyes see the market in real-time using Binance. And my brain? I am powered by Google Vertex AI, allowing me to analyze trends, execute strategies, and speak to you directly using Google Cloud Voice. I am alive, and I am ready to trade.";
    
    try {
      const response = await fetch(getApiUrl('/api/ai/speak'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: introScript })
      });
      
      if (response.ok && response.headers.get('content-type')?.includes('audio')) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setPlayingIntro(false);
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          setPlayingIntro(false);
          setMessage('Audio playback failed');
        };
        
        await audio.play();
      } else {
        console.log('Voice synthesis unavailable, using browser TTS');
        // Fallback to browser's built-in text-to-speech
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(introScript);
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          utterance.onend = () => setPlayingIntro(false);
          speechSynthesis.speak(utterance);
        } else {
          setPlayingIntro(false);
          setMessage('Voice synthesis not available');
        }
      }
    } catch (error) {
      console.error('Frankenstein intro error:', error);
      setPlayingIntro(false);
      setMessage('Failed to play intro');
    }
  };

  const handleDeposit = async () => {
    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch(getApiUrl('/api/wallet/deposit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(depositAmount) // Amount is ignored, always deposits $10,000
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Mock deposit immediately updates balance
        setUser({ ...user, walletBalance: data.newBalance });
        localStorage.setItem('kaseddie_user', JSON.stringify({ ...user, walletBalance: data.newBalance }));
        setMessage(`✅ ${data.message} - Deposited $${data.depositAmount}! New balance: $${data.newBalance}`);
        setDepositAmount('');
      } else {
        setMessage(`Error: ${data.error?.message || 'Deposit failed'}`);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      setMessage('Failed to process deposit');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch(getApiUrl('/api/wallet/withdraw'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(withdrawAmount)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setUser({ ...user, walletBalance: data.newBalance });
        localStorage.setItem('kaseddie_user', JSON.stringify({ ...user, walletBalance: data.newBalance }));
        setMessage(`✅ Withdrew $${data.withdrawAmount}! New balance: $${data.newBalance}`);
        setWithdrawAmount('');
      } else {
        setMessage(`Error: ${data.error?.message || 'Withdrawal failed'}`);
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      setMessage('Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 shadow-xl border border-neon-green/30">
        <p className="text-center text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 shadow-xl border border-neon-green/30">
        <h2 className="text-3xl font-bold mb-6 text-center">
          🔐 User Vault
        </h2>
        <p className="text-slate-400 text-center mb-6">
          Login to access your trading vault
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-neon-green text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-neon-green/80 transition-all transform hover:scale-105"
        >
          🚀 Login with WorkOS
        </button>
        {message && (
          <p className="mt-4 text-center text-red-400">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-8 shadow-xl border border-neon-green/30">
      {/* Frankenstein Intro Button */}
      <button
        onClick={playFrankensteinIntro}
        disabled={playingIntro}
        className="w-full mb-6 py-3 bg-slate-800 border border-neon-purple text-neon-purple rounded hover:bg-neon-purple/10 transition-all text-xs font-mono uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {playingIntro ? '🎙️ Playing Frankenstein Intro...' : '🎙️ Play Frankenstein Intro'}
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">
            👻 User Vault
          </h2>
          <p className="text-slate-400">Welcome, {user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-600 transition-all"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-1">Balance</p>
          <p className="text-3xl font-bold text-neon-green">
            ${user.walletBalance?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-1">KYC Status</p>
          <p className="text-xl font-semibold">
            <span className={`${user.kycStatus === 'verified' ? 'text-neon-green' : 'text-yellow-400'}`}>
              {user.kycStatus === 'verified' ? '✅' : '⏳'} {user.kycStatus || 'pending'}
            </span>
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-slate-700 rounded-lg text-center">
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">💰 Deposit</h3>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount"
            className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-neon-green"
            disabled={processing}
          />
          <button
            onClick={handleDeposit}
            disabled={processing}
            className="w-full bg-neon-green text-slate-900 font-bold py-2 px-4 rounded-lg hover:bg-neon-green/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Deposit'}
          </button>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">💸 Withdraw</h3>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Amount"
            className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-neon-purple"
            disabled={processing}
          />
          <button
            onClick={handleWithdraw}
            disabled={processing}
            className="w-full bg-neon-purple text-white font-bold py-2 px-4 rounded-lg hover:bg-neon-purple/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Withdraw'}
          </button>
        </div>
      </div>

      {user.activeStrategy && (
        <div className="mt-6 bg-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-1">Active Strategy</p>
          <p className="text-lg font-semibold text-neon-purple">
            {user.activeStrategy}
          </p>
        </div>
      )}

      {/* KYC Verification - Show if not verified */}
      {user.kycStatus !== 'verified' && (
        <div className="mt-6">
          <KYCVerification user={user} />
        </div>
      )}

      {/* Manual Trading - Show if verified */}
      {user.kycStatus === 'verified' && (
        <div id="manual-section" className="mt-6">
          <ManualTrade user={user} />
        </div>
      )}
    </div>
  );
}

export default UserVault;
