import { useState } from 'react';
import VoiceTransfer from './components/VoiceTransfer';

function App() {
  const [txHash, setTxHash] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white">
      {/* Simple Header for Demo */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-neon-purple/30 py-4">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
            🎤 Sauti Ledger Kaseddie AI
          </h1>
          <p className="text-lg text-slate-300 mt-2">
            Voice-Powered MNEE Transfers on Ethereum
          </p>
        </div>
      </header>

      {/* Main Content - Only Voice Transfer */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <VoiceTransfer 
          onTransactionComplete={(hash) => {
            setTxHash(hash);
            console.log('Transaction completed:', hash);
          }} 
        />

        {/* Optional Success Feedback */}
        {txHash && (
          <div className="mt-8 p-6 bg-green-900/30 border border-green-500/50 rounded-xl text-center">
            <h3 className="text-2xl font-bold text-neon-green mb-2">Transaction Success! 🎉</h3>
            <p className="text-slate-300">
              Hash: <a 
                href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-neon-green hover:underline break-all"
              >
                {txHash}
              </a>
            </p>
          </div>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="py-8 text-center text-slate-500 border-t border-slate-800/50">
        <p>© 2025 Sauti Ledger Kaseddie AI • Built for Hackathon</p>
      </footer>
    </div>
  );
}

export default App;