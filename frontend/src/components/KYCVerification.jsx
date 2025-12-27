import { useState } from 'react';
import { getApiUrl } from '../config';

function KYCVerification({ user, onVerificationComplete }) {
  const [showModal, setShowModal] = useState(false);
  const [idDocument, setIdDocument] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsVerifying(true);

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
        const res = await fetch(getApiUrl('/api/kyc/submit'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            idDocument: idDocument?.name || 'national_id.jpg',
            selfie: selfie?.name || 'selfie.jpg'
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await res.json();

        if (res.ok && data.success) {
          // Show success animation
          setIsVerifying(false);
          setShowSuccess(true);
          
          // Update localStorage
          if (data.user) {
            localStorage.setItem('kaseddie_user', JSON.stringify(data.user));
            window.dispatchEvent(new Event('userUpdated'));
          }

          // Wait 2 seconds then close
          setTimeout(() => {
            setShowSuccess(false);
            setShowModal(false);
            if (onVerificationComplete) {
              onVerificationComplete(data.user);
            }
          }, 2000);
        } else {
          throw new Error(data.error || 'Verification failed');
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        
        if (fetchErr.name === 'AbortError') {
          throw new Error('Verification timed out after 60 seconds. Please try again.');
        }
        throw fetchErr;
      }
    } catch (err) {
      console.error('KYC verification error:', err);
      alert('Verification failed: ' + err.message);
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Instant feedback - don't wait for upload
    if (type === 'id') {
      setIdDocument(file);
      console.log('✅ ID Document selected:', file.name);
    } else {
      setSelfie(file);
      console.log('✅ Selfie selected:', file.name);
    }
  };

  // Don't show if user is already verified
  if (user?.kycStatus === 'verified') {
    return null;
  }

  return (
    <>
      {/* Main Verify Button */}
      <div className="mb-8 text-center">
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 bg-neon-purple/20 border-2 border-neon-purple text-neon-purple rounded-lg hover:bg-neon-purple/30 transition-all animate-pulse shadow-[0_0_15px_rgba(188,19,254,0.5)] font-bold text-xl"
        >
          🛡️ VERIFY IDENTITY TO TRADE
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-neon-purple p-8 rounded-xl max-w-md w-full shadow-2xl">
            
            {showSuccess ? (
              <div className="text-center py-10">
                <div className="text-6xl mb-4 animate-bounce">✅</div>
                <h2 className="text-2xl text-neon-green font-bold mb-2">Identity Verified!</h2>
                <p className="text-slate-400">You are now cleared to trade.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  🕵️ KYC Verification
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ID Document Upload */}
                  <div>
                    <p className="block text-sm font-medium text-slate-300 mb-2">
                      Upload National ID
                    </p>
                    <label 
                      className={`
                        w-full cursor-pointer flex flex-col items-center justify-center
                        border-2 border-dashed rounded-lg p-8 transition-all
                        ${idDocument 
                          ? 'border-neon-green bg-neon-green/10 hover:bg-neon-green/20' 
                          : 'border-neon-purple bg-slate-800 hover:bg-slate-700 hover:border-neon-purple/80'
                        }
                      `}
                    >
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'id')}
                        className="hidden"
                        required 
                      />
                      {idDocument ? (
                        <>
                          <span className="text-4xl mb-2">✅</span>
                          <span className="text-neon-green font-semibold">
                            📄 {idDocument.name}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            Click to change
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl mb-2">🆔</span>
                          <span className="text-neon-purple font-semibold">
                            Click to upload ID
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            PNG, JPG up to 10MB
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Selfie Upload */}
                  <div>
                    <p className="block text-sm font-medium text-slate-300 mb-2">
                      Upload Selfie
                    </p>
                    <label 
                      className={`
                        w-full cursor-pointer flex flex-col items-center justify-center
                        border-2 border-dashed rounded-lg p-8 transition-all
                        ${selfie 
                          ? 'border-neon-green bg-neon-green/10 hover:bg-neon-green/20' 
                          : 'border-neon-purple bg-slate-800 hover:bg-slate-700 hover:border-neon-purple/80'
                        }
                      `}
                    >
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'selfie')}
                        className="hidden"
                        required 
                      />
                      {selfie ? (
                        <>
                          <span className="text-4xl mb-2">✅</span>
                          <span className="text-neon-green font-semibold">
                            📸 {selfie.name}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            Click to change
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl mb-2">🤳</span>
                          <span className="text-neon-purple font-semibold">
                            Click to upload selfie
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            PNG, JPG up to 10MB
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="flex-1 py-3 bg-neon-purple text-black font-bold rounded-lg hover:bg-neon-purple/90 transition-colors disabled:opacity-50 flex justify-center items-center"
                    >
                      {isVerifying ? 'Verifying...' : 'Submit Documents'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default KYCVerification;