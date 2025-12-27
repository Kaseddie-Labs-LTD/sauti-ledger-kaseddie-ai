import { useState, useEffect } from 'react';
import { getApiUrl } from '../config';

function TradeGraveyard() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        // Get user ID from localStorage
        const storedUser = localStorage.getItem('kaseddie_user');
        if (!storedUser) {
          setLoading(false);
          return;
        }

        const user = JSON.parse(storedUser);
        if (!user.id) {
          setLoading(false);
          return;
        }

        // Fetch real trades from API
        const response = await fetch(getApiUrl(`/api/trading/history/${user.id}`));
        const data = await response.json();

        if (response.ok && data.trades) {
          // Sort by newest first
          const sortedTrades = data.trades.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          setTrades(sortedTrades);
        }
      } catch (err) {
        console.error('Failed to fetch trades:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();

    // Refresh trades every 10 seconds
    const interval = setInterval(fetchTrades, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 text-neon-purple">
          💀 Graveyard of Trades
        </h2>
        <p className="text-center text-slate-400">Loading trades...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8 text-neon-purple">
        💀 Graveyard of Trades
      </h2>
      
      {trades.length === 0 ? (
        <p className="text-center text-slate-400">No trades yet. Start trading to see your history!</p>
      ) : (
        <div className="space-y-4">
          {trades.map(trade => (
            <div
              key={trade.id}
              className="backdrop-blur-lg bg-ghost-white border border-slate-700 rounded-xl p-6 hover:border-neon-green/50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{trade.action === 'BUY' ? '📈' : '📉'}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{trade.symbol}</h3>
                    <p className="text-slate-400 text-sm">
                      {trade.amount?.toFixed(6)} @ ${trade.price?.toLocaleString()}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Strategy: {trade.strategy || 'manual'}
                    </p>
                    {(trade.stopLoss || trade.takeProfit) && (
                      <div className="mt-2 flex gap-3 text-xs">
                        {trade.stopLoss && (
                          <span className="text-red-400">
                            🛑 SL: ${trade.stopLoss.toLocaleString()}
                          </span>
                        )}
                        {trade.takeProfit && (
                          <span className="text-neon-green">
                            🎯 TP: ${trade.takeProfit.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    ${trade.usdValue?.toFixed(2)}
                  </p>
                  <p className={`text-sm font-semibold ${trade.action === 'BUY' ? 'text-neon-green' : 'text-red-500'}`}>
                    {trade.action}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(trade.timestamp).toLocaleString()}
                  </p>
                  {trade.confidence && (
                    <p className="text-slate-400 text-xs mt-1">
                      Confidence: {trade.confidence}%
                    </p>
                  )}
                </div>
              </div>
              
              {trade.reasoning && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-slate-400 text-sm italic">
                    "{trade.reasoning}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TradeGraveyard;
