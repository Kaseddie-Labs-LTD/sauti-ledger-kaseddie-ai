import { useState, useEffect } from 'react';
import { getApiUrl } from '../config';

// Backup Data for Video Demo (In case API fails)
const MOCK_DATA = [
  { symbol: 'BTC', price: 92150.00, change: 1.5 },
  { symbol: 'ETH', price: 3120.00, change: 0.8 },
  { symbol: 'SOL', price: 145.50, change: 4.2 },
  { symbol: 'ADA', price: 0.50, change: 1.1 },
  { symbol: 'DOGE', price: 0.16, change: -0.5 },
  { symbol: 'XRP', price: 2.20, change: 2.1 }
];

function CryptoPulse() {
  const [cryptoData, setCryptoData] = useState([]);

  useEffect(() => {
    const fetchPrices = () => {
      fetch(getApiUrl('/api/market/prices'))
        .then(res => res.json())
        .then(data => {
          // CRASH PROOF: Only set if it's a valid array
          if (Array.isArray(data) && data.length > 0) {
            setCryptoData(data);
          } else {
            console.warn('API returned invalid data, using backup');
            setCryptoData(MOCK_DATA);
          }
        })
        .catch(err => {
          console.error('Failed to fetch crypto pulse, using backup:', err);
          setCryptoData(MOCK_DATA);
        });
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-950 border-b border-neon-green/20 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-4">
        <div className="inline-flex gap-8">
          {/* Only render if we have data */}
          {cryptoData.length > 0 ? (
            // Duplicate data for smooth marquee loop
            [...cryptoData, ...cryptoData].map((crypto, idx) => (
              <div key={`${crypto.symbol}-${idx}`} className="inline-flex items-center gap-2 px-4">
                <span className="text-neon-green font-bold">{crypto.symbol}</span>
                <span className="text-white">${crypto.price?.toLocaleString()}</span>
                <span className={crypto.change >= 0 ? 'text-neon-green' : 'text-red-500'}>
                  {crypto.change >= 0 ? '↑' : '↓'} {Math.abs(crypto.change)}%
                </span>
              </div>
            ))
          ) : (
             <div className="text-slate-500 px-4">Initializing Crypto Feed...</div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee > div {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default CryptoPulse;