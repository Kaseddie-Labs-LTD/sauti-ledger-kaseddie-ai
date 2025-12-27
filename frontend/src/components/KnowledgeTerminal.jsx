import { useState } from 'react';
import { getApiUrl } from '../config';

function KnowledgeTerminal() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const handleAsk = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      return;
    }

    setLoading(true);
    const currentQuestion = question;
    setQuestion('');

    // Add question to conversation
    setConversationHistory(prev => [...prev, { type: 'question', text: currentQuestion }]);

    try {
      const response = await fetch(getApiUrl('/api/ai/ask'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion })
      });

      const data = await response.json();

      if (response.ok) {
        const aiAnswer = data.answer || data.message || 'No response from AI';
        setAnswer(aiAnswer);
        
        // Add answer to conversation
        setConversationHistory(prev => [...prev, { type: 'answer', text: aiAnswer }]);

        // Speak the answer
        try {
          const audioRes = await fetch(getApiUrl('/api/ai/speak'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: aiAnswer })
          });
          
          if (audioRes.ok && audioRes.headers.get('content-type')?.includes('audio')) {
            const audioBlob = await audioRes.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play().catch(e => console.log('Audio play failed:', e));
            
            // Clean up the URL after playing
            audio.onended = () => URL.revokeObjectURL(audioUrl);
          } else {
            console.log('Voice synthesis unavailable, using browser TTS');
            // Fallback to browser's built-in text-to-speech
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(aiAnswer);
              utterance.rate = 0.9;
              utterance.pitch = 1.1;
              speechSynthesis.speak(utterance);
            }
          }
        } catch (audioErr) {
          console.log('Voice synthesis failed:', audioErr);
        }
      } else {
        const errorMsg = data.error || 'Failed to get answer';
        setAnswer(errorMsg);
        setConversationHistory(prev => [...prev, { type: 'error', text: errorMsg }]);
      }
    } catch (err) {
      console.error('AI ask error:', err);
      const errorMsg = 'Failed to connect to AI service';
      setAnswer(errorMsg);
      setConversationHistory(prev => [...prev, { type: 'error', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-neon-green/30 backdrop-blur-lg mb-12">
      <h2 className="text-3xl font-bold mb-4 text-center">
        <span className="bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
          🧠 AI Knowledge Terminal
        </span>
      </h2>
      <p className="text-center text-slate-400 mb-6">
        Ask Kaseddie about the market, trading strategies, or crypto news
      </p>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="mb-6 max-h-96 overflow-y-auto space-y-4 bg-slate-900 rounded-lg p-4">
          {conversationHistory.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                item.type === 'question'
                  ? 'bg-neon-purple/20 border border-neon-purple/50 ml-8'
                  : item.type === 'error'
                  ? 'bg-red-500/20 border border-red-500/50 mr-8'
                  : 'bg-neon-green/20 border border-neon-green/50 mr-8'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {item.type === 'question' ? '👤' : item.type === 'error' ? '⚠️' : '🤖'}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold mb-1 ${
                    item.type === 'question' ? 'text-neon-purple' : 'text-neon-green'
                  }`}>
                    {item.type === 'question' ? 'You' : 'Kaseddie AI'}
                  </p>
                  <p className="text-white leading-relaxed">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleAsk} className="flex gap-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about the market..."
          disabled={loading}
          className="flex-1 bg-slate-700 text-white px-6 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-green text-lg disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-gradient-to-r from-neon-green to-neon-purple text-slate-900 font-bold px-8 py-4 rounded-lg hover:opacity-90 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
        >
          {loading ? (
            <>
              <span className="animate-pulse">🔮 Thinking...</span>
            </>
          ) : (
            <>
              🧙 Ask Kaseddie
            </>
          )}
        </button>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-bounce text-neon-green text-2xl">
            👻 Summoning knowledge from the crypt...
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeTerminal;
