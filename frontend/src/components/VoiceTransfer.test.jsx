import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getApiUrl } from '../config';
import { useMNEEBalance, useMNEETransfer, parseMNEEAmount } from '../services/mneeService';

function VoiceTransfer({ onTransactionComplete }) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedCommand, setParsedCommand] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  // Reset when wallet disconnects
  useEffect(() => {
    if (!isConnected && !isConnecting && !isReconnecting) {
      setIsRecording(false);
      setIsProcessing(false);
      setTranscribedText('');
      setParsedCommand(null);
      setShowConfirmation(false);
      setError('Wallet disconnected. Please reconnect to continue.');
      setMessage('');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [isConnected, isConnecting, isReconnecting]);

  // Transaction success
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

  // Transaction error
  useEffect(() => {
    if (isTransactionError && transactionError) {
      setError(getTransactionErrorMessage(transactionError));
      setMessage('');
    }
  }, [isTransactionError, transactionError]);

  // ── HELPER FUNCTIONS ───────────────────────────────────────────────────────

  const getTransactionErrorMessage = (error) => {
    if (error?.code === 4001) return 'Transaction rejected by user';
    if (error?.code === -32603) return 'Internal JSON-RPC error - check gas or funds';
    return error?.message || 'Unknown transaction error occurred';
  };

  const checkBrowserCompatibility = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.');
      return false;
    }
    return true;
  };

  const checkMicrophonePermissions = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      if (permissionStatus.state === 'denied') {
        setError('Microphone access denied. Please enable it in your browser settings.');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Permission check failed:', err);
      return true; // fallback - let getUserMedia handle it
    }
  };

  const visualizeAudio = (stream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      setAudioLevel(Math.min(100, Math.max(0, average * 2))); // scale for visibility
    };
    draw();
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

      const transcribeRes = await fetch(`${getApiUrl()}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');

      const { text } = await transcribeRes.json();
      setTranscribedText(text);
      setMessage('Parsing command...');

      const parsed = await parseCommand(text);
      if (parsed?.action === 'transfer') {
        setParsedCommand(parsed);
        setShowConfirmation(true);
      } else {
        setError('Could not understand command. Please try again (e.g. "send 50 MNEE to 0x...")');
      }
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      resetRecordingState();
    }
  };

  const parseCommand = async (text) => {
    try {
      const res = await fetch(`${getApiUrl()}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text }),
      });

      if (!res.ok) throw new Error('Command parsing failed');
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
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      visualizeAudio(stream);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = processAudio;

      mediaRecorder.start();
      setIsRecording(true);
      setMessage('Recording... Speak your command');
    } catch (err) {
      setError(`Could not access microphone: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setMessage('Processing your command...');
    }
  };

  const resetRecordingState = () => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setAudioLevel(0);
  };

  const clearTranscription = () => {
    setTranscribedText('');
    setParsedCommand(null);
    setShowConfirmation(false);
  };

  const validateBalance = () => {
    if (!parsedCommand?.amount || !balanceRaw) {
      return { isValid: false, message: 'Balance or amount not loaded' };
    }

    const amountInWei = parseMNEEAmount(parsedCommand.amount);
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

    const amountInWei = parseMNEEAmount(parsedCommand.amount);
    try {
      await transfer(parsedCommand.recipient, amountInWei);
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

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-6">
      {!isConnected ? (
        <div className="text-center py-20 bg-gradient-to-br from-slate-900/80 to-indigo-950/80 rounded-3xl border-2 border-indigo-500/30 shadow-2xl backdrop-blur-lg">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
            Voice MNEE Transfer
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Speak naturally to send MNEE (USD stablecoin) on Ethereum.<br />
            Connect your wallet to start using voice commands.
          </p>
          <div className="inline-block scale-110 transform-gpu">
            <ConnectButton 
              label="Connect Wallet"
              accountStatus="address"
              showBalance={false}
            />
          </div>
          {(isConnecting || isReconnecting) && (
            <p className="mt-8 text-lg text-indigo-400 font-medium animate-pulse">
              Connecting wallet...
            </p>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/50 backdrop-blur-lg border-2 border-neon-purple/30 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
              🎤 Voice Transfer
            </h2>
            <div className="px-4 py-2 bg-slate-800/70 rounded-lg text-sm font-medium">
              Connected: <span className="font-mono text-neon-green">{address?.slice(0,6)}...{address?.slice(-4)}</span>
            </div>
          </div>

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
                disabled={isProcessing}
                className="px-8 py-4 text-xl font-bold rounded-xl bg-neon-purple/20 border-2 border-neon-purple text-neon-purple hover:bg-neon-purple/30 transition-all duration-300 disabled:opacity-50"
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

          {transcribedText && (
            <div className="mt-6 p-6 bg-slate-800/50 border border-neon-green/30 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-neon-green">Transcribed Command:</h3>
                <button onClick={clearTranscription} className="text-slate-400 hover:text-white" title="Clear">✕</button>
              </div>
              <p className="text-white text-lg">{transcribedText}</p>
            </div>
          )}

          {showConfirmation && parsedCommand && (
            <div className="mt-6 p-6 bg-slate-800/50 border-2 border-neon-purple/50 rounded-xl">
              <h3 className="text-xl font-bold text-neon-purple mb-4">Confirm Transaction</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Action:</span>
                  <span className="text-white font-semibold capitalize">{parsedCommand.action}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-neon-green font-bold text-xl">{parsedCommand.amount} MNEE</span>
                </div>
                
                <div className="flex justify-between items-start p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Recipient:</span>
                  <span className="text-white font-mono text-sm break-all ml-2">
                    {parsedCommand.recipient}
                  </span>
                </div>

                {parsedCommand.confidence && (
                  <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                    <span className="text-slate-400">Confidence:</span>
                    <span className={`font-semibold ${
                      parsedCommand.confidence >= 80 ? 'text-neon-green' : 
                      parsedCommand.confidence >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {parsedCommand.confidence}%
                    </span>
                  </div>
                )}
              </div>

              {!balanceValidation.isValid && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 font-semibold">⚠️ {balanceValidation.message}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleConfirm}
                  disabled={!balanceValidation.isValid || isTransactionPending || isTransactionConfirming}
                  className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all duration-300 ${
                    balanceValidation.isValid && !isTransactionPending && !isTransactionConfirming
                      ? 'bg-neon-green/20 border-2 border-neon-green text-neon-green hover:bg-neon-green/30'
                      : 'bg-slate-700/20 border-2 border-slate-600 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isTransactionPending ? '⏳ Signing...' : 
                   isTransactionConfirming ? '⏳ Confirming...' : '✅ Confirm Transfer'}
                </button>
                
                <button
                  onClick={handleReject}
                  disabled={isTransactionPending || isTransactionConfirming}
                  className="flex-1 px-6 py-3 font-bold rounded-xl bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500/30 transition-all duration-300 disabled:opacity-50"
                >
                  ❌ Cancel
                </button>
              </div>

              {transactionHash && (
                <div className="mt-4 p-4 bg-slate-900/50 border border-neon-purple/30 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Transaction Hash:</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neon-purple hover:text-neon-green font-mono text-xs break-all transition-colors"
                  >
                    {transactionHash}
                  </a>
                  {isTransactionConfirming && (
                    <p className="text-yellow-400 text-sm mt-2">⏳ Waiting for confirmation...</p>
                  )}
                  {isTransactionConfirmed && (
                    <p className="text-neon-green text-sm mt-2">✅ Confirmed on chain!</p>
                  )}
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-purple"></div>
              <span className="text-slate-400">Processing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceTransfer;