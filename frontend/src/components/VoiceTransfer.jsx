import { useState, useRef, useEffect } from 'react';
import { getApiUrl } from '../config';
import { useMNEEBalance, useMNEETransfer, parseMNEEAmount } from '../services/mneeService';

function VoiceTransfer({ onTransactionComplete }) {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedCommand, setParsedCommand] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // MNEE hooks
  const { balance, balanceRaw, isLoading: isBalanceLoading, isError: isBalanceError, refetch: refetchBalance } = useMNEEBalance();

  const { 
    transfer, 
    transactionHash, 
    isPending: isTransactionPending, 
    isConfirming: isTransactionConfirming, 
    isConfirmed: isTransactionConfirmed, 
    isError: isTransactionError, 
    error: transactionError 
  } = useMNEETransfer();

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Transaction success handler
  useEffect(() => {
    if (isTransactionConfirmed) {
      setMessage('✅ Transaction confirmed! Refreshing balance...');
      setError('');
      refetchBalance();
      if (onTransactionComplete && transactionHash) {
        onTransactionComplete(transactionHash);
      }
      setTimeout(() => {
        setParsedCommand(null);
        setShowConfirmation(false);
        setTranscribedText('');
      }, 3000);
    }
  }, [isTransactionConfirmed, transactionHash, onTransactionComplete, refetchBalance]);

  // Transaction error handler
  useEffect(() => {
    if (isTransactionError && transactionError) {
      const errorMessage = getTransactionErrorMessage(transactionError);
      setError(errorMessage);
      setMessage('');
    }
  }, [isTransactionError, transactionError]);

  // ── HELPER FUNCTIONS ───────────────────────────────────────────────────────

  const getTransactionErrorMessage = (error) => {
    if (!error) return 'Transaction failed';
    
    const errorMessage = error.message || error.toString();
    const errorName = error.name || '';
    
    if (errorMessage.includes('User rejected') || 
        errorMessage.includes('user rejected') || 
        errorMessage.includes('User denied') || 
        errorName === 'UserRejectedRequestError') {
      return '❌ Transaction cancelled: You rejected the transaction in your wallet';
    }
    
    if (errorMessage.includes('insufficient funds for gas') || 
        errorMessage.includes('insufficient funds for intrinsic transaction cost')) {
      return '⛽ Insufficient gas: You need more ETH for gas fees';
    }
    
    if (errorMessage.includes('execution reverted')) {
      const revertMatch = errorMessage.match(/execution reverted: (.+)/);
      const revertReason = revertMatch ? revertMatch[1] : 'unknown reason';
      return `⚠️ Transaction reverted: ${revertReason}`;
    }
    
    return `❌ Transaction failed: ${errorMessage.slice(0, 150)}${errorMessage.length > 150 ? '...' : ''}`;
  };

  const checkBrowserCompatibility = () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.');
      return false;
    }
    return true;
  };

  const checkMicrophonePermissions = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      if (permission.state === 'denied') {
        setError('Microphone access denied. Please enable it in browser settings.');
        return false;
      }
      return true;
    } catch {
      return true; // fallback
    }
  };

  const visualizeAudio = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyserRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(Math.min(100, average * 2));
      };
      draw();
    } catch (err) {
      console.warn('Audio visualization failed:', err);
    }
  };

  const validateAudio = (audioBlob, duration) => {
    if (duration < 1) {
      setError('Recording too short. Please speak for at least 1 second.');
      return false;
    }
    if (audioBlob.size < 1000) {
      setError('Audio data too small. Please try again.');
      return false;
    }
    return true;
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const duration = (Date.now() - recordingStartTimeRef.current) / 1000;

    if (!validateAudio(audioBlob, duration)) return;

    setIsProcessing(true);
    setMessage('Transcribing your voice...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');

      const res = await fetch(`${getApiUrl()}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Transcription failed');

      const { text } = await res.json();
      setTranscribedText(text);
      setMessage('Parsing command...');

      const parsed = await parseCommand(text);
      if (parsed?.action === 'transfer') {
        setParsedCommand(parsed);
        setShowConfirmation(true);
      } else {
        setError('Could not understand command. Try: "send 50 MNEE to 0x..."');
      }
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setAudioLevel(0);
    }
  };

  const parseCommand = async (text) => {
    try {
      const res = await fetch(`${getApiUrl()}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text }),
      });

      if (!res.ok) throw new Error('Parse failed');
      return await res.json();
    } catch (err) {
      console.error('Parse error:', err);
      return null;
    }
  };

  const startRecording = async () => {
    if (!checkBrowserCompatibility()) return;
    if (!(await checkMicrophonePermissions())) return;

    try {
      setError('');
      setMessage('');
      setTranscribedText('');
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      visualizeAudio(stream);

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = processAudio;

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setMessage('Recording... Speak your command');
    } catch (err) {
      setError(`Microphone error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setMessage('Processing...');
    }
  };

  const clearTranscription = () => {
    setTranscribedText('');
    setParsedCommand(null);
    setShowConfirmation(false);
    setMessage('');
    setError('');
  };

  const validateBalance = () => {
    if (!parsedCommand?.amount || !balanceRaw) {
      return { isValid: false, message: 'Balance or amount not loaded' };
    }

    const amountInWei = parseMNEEAmount(parsedCommand.amount.toString());
    if (BigInt(amountInWei) > BigInt(balanceRaw)) {
      return { 
        isValid: false, 
        message: `Insufficient balance (${parsedCommand.amount} MNEE required)` 
      };
    }
    return { isValid: true, message: '' };
  };

  const handleConfirm = async () => {
    if (!parsedCommand) return;

    const validation = validateBalance();
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    try {
      const amountInWei = parseMNEEAmount(parsedCommand.amount.toString());
      await transfer(parsedCommand.recipient, amountInWei);
      setMessage('📝 Please confirm in your wallet...');
    } catch (err) {
      setError(getTransactionErrorMessage(err));
    }
  };

  const handleReject = () => {
    setShowConfirmation(false);
    setParsedCommand(null);
    setMessage('Transaction cancelled');
  };

  const balanceValidation = validateBalance();

  return (
    <div className="bg-slate-900/50 backdrop-blur-lg border-2 border-neon-purple/30 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
        🎤 Voice Transfer
      </h2>
      
      {/* Balance */}
      <div className="mb-6 p-4 bg-slate-800/50 border border-neon-green/30 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Your MNEE Balance:</span>
          <span className="text-2xl font-bold text-neon-green">
            {isBalanceLoading ? 'Loading...' : isBalanceError ? 'Error' : `${parseFloat(balance).toFixed(2)} MNEE`}
          </span>
        </div>
      </div>
      
      <p className="text-slate-400 mb-6">
        Speak your command, e.g.: "Send 50 MNEE to 0x123..."
      </p>

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4 mb-6">
        {!isRecording && !isProcessing && (
          <button
            onClick={startRecording}
            className="px-8 py-4 text-xl font-bold rounded-xl bg-neon-purple/20 border-2 border-neon-purple text-neon-purple hover:bg-neon-purple/30 transition-all duration-300"
          >
            🎤 Start Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="px-8 py-4 text-xl font-bold rounded-xl bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500/30 transition-all duration-300 animate-pulse"
          >
            ⏹️ Stop Recording
          </button>
        )}

        {isRecording && (
          <div className="w-full max-w-md">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-neon-green to-neon-purple transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <p className="text-center text-sm text-slate-400 mt-2">Audio Level</p>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-center">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Transcribed Text */}
      {transcribedText && (
        <div className="mt-6 p-6 bg-slate-800/50 border border-neon-green/30 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-neon-green">Transcribed Command:</h3>
            <button onClick={clearTranscription} className="text-slate-400 hover:text-white" title="Clear">✕</button>
          </div>
          <p className="text-white text-lg">{transcribedText}</p>
        </div>
      )}

      {/* === UPDATED CONFIRMATION SECTION === */}
      {showConfirmation && parsedCommand && (
        <div className="mt-6 p-6 bg-gradient-to-br from-slate-900/70 to-slate-950/70 border-2 border-neon-purple/60 rounded-2xl shadow-2xl backdrop-blur-md">
          <h3 className="text-2xl font-bold text-neon-purple mb-6 flex items-center gap-3">
            <span className="text-3xl">🔍</span> Confirm Your Transfer
          </h3>

          <div className="space-y-4 mb-8">
            {/* Action */}
            <div className="flex justify-between items-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 font-medium">Action</span>
              <span className="text-white font-semibold capitalize tracking-wide">
                {parsedCommand.action}
              </span>
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 font-medium">Amount</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-neon-green">
                  {parsedCommand.amount} MNEE
                </div>
                <div className="text-sm text-slate-500">
                  ≈ ${parsedCommand.amount} USD
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 font-medium">Recipient</span>
                <button
                  onClick={() => navigator.clipboard.writeText(parsedCommand.recipient)}
                  className="text-neon-purple hover:text-neon-green text-sm flex items-center gap-1 transition-colors"
                  title="Copy address"
                >
                  📋 Copy
                </button>
              </div>
              <div className="font-mono text-sm text-white break-all bg-slate-900/40 p-2 rounded-lg border border-slate-700/50">
                {parsedCommand.recipient}
              </div>
            </div>

            {/* Confidence */}
            {parsedCommand.confidence && (
              <div className="flex justify-between items-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 font-medium">AI Confidence</span>
                <span
                  className={`font-bold text-lg px-3 py-1 rounded-full ${
                    parsedCommand.confidence >= 80
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                      : parsedCommand.confidence >= 60
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {parsedCommand.confidence}%
                </span>
              </div>
            )}
          </div>

          {/* Balance Warning */}
          {!balanceValidation.isValid && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="font-medium">{balanceValidation.message}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleConfirm}
              disabled={!balanceValidation.isValid || isTransactionPending || isTransactionConfirming}
              className={`
                flex-1 py-4 px-6 font-bold text-lg rounded-xl transition-all duration-300 shadow-lg
                ${
                  balanceValidation.isValid && !isTransactionPending && !isTransactionConfirming
                    ? 'bg-gradient-to-r from-neon-green to-emerald-600 hover:from-emerald-600 hover:to-neon-green border-2 border-neon-green/60 text-white hover:shadow-neon-green/50'
                    : 'bg-slate-700/40 border-2 border-slate-600 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              {isTransactionPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing...
                </span>
              ) : isTransactionConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : (
                '✅ Confirm & Send'
              )}
            </button>

            <button
              onClick={handleReject}
              disabled={isTransactionPending || isTransactionConfirming}
              className={`
                flex-1 py-4 px-6 font-bold text-lg rounded-xl transition-all duration-300
                bg-gradient-to-r from-red-600/80 to-rose-700 hover:from-rose-700 hover:to-red-600
                border-2 border-red-500/60 text-white
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              ❌ Cancel
            </button>
          </div>

          {/* Transaction Status */}
          {transactionHash && (
            <div className="mt-6 p-5 bg-slate-900/60 border border-neon-purple/40 rounded-xl">
              <p className="text-slate-300 text-sm mb-3 font-medium">Transaction Details</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Hash:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neon-purple hover:text-neon-green font-mono break-all hover:underline flex items-center gap-2 transition-colors"
                  >
                    {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                    <span className="text-xs">↗</span>
                  </a>
                </div>

                {isTransactionConfirming && (
                  <p className="text-yellow-400 font-medium flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    Waiting for network confirmation...
                  </p>
                )}

                {isTransactionConfirmed && (
                  <p className="text-neon-green font-medium flex items-center gap-2">
                    <span className="text-xl">🎉</span> Successfully confirmed on chain!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-purple"></div>
          <span className="text-slate-400">Processing...</span>
        </div>
      )}
    </div>
  );
}

export default VoiceTransfer;