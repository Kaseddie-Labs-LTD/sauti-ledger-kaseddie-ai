# Implementation Plan

- [x] 1. Set up MNEE token contract integration
  - [x] 1.1 Create MNEE contract ABI and configuration
    - Update MNEE contract address to correct Ethereum mainnet address: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
    - Add MNEE contract address and ABI to frontend configuration
    - Create TypeScript types for MNEE contract interface
    - _Requirements: 2.1, 6.1_
  
  - [x] 1.2 Implement MNEE balance reading service
    - Create service to read MNEE balance using Wagmi hooks
    - Add balance caching and refresh logic
    - Handle balance read errors gracefully
    - _Requirements: 2.1, 2.3_
  
  - [x] 1.3 Write property test for balance reading
    - **Property 3: Balance read accuracy**
    - **Validates: Requirements 2.1**

- [x] 2. Implement speech-to-text service (Backend)
  - [x] 2.1 Create Google Cloud Speech-to-Text integration
    - Set up Google Cloud Speech-to-Text client
    - Implement audio transcription function
    - Add audio quality validation
    - Handle API errors and retries
    - _Requirements: 3.2, 3.3_
  
  - [x] 2.2 Create speech service API endpoint
    - Add POST /api/voice/transcribe endpoint
    - Accept audio file uploads
    - Return transcribed text
    - _Requirements: 3.2_
  
  - [x] 2.3 Write property test for speech-to-text
    - **Property 6: Speech-to-text conversion**
    - **Validates: Requirements 3.2**

- [x] 3. Implement AI command parser service (Backend)
  - [x] 3.1 Create command parser service using Vertex AI
    - Create commandParserService.js in backend/src/services
    - Implement parseVoiceCommand function using existing Vertex AI setup
    - Extract action, amount, and recipient from text using AI prompting
    - Add confidence scoring based on AI response
    - Handle ambiguous commands with clarification requests
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.3_
  
  - [x] 3.2 Add recipient address validation and resolution
    - Validate Ethereum address format (0x followed by 40 hex characters)
    - Add basic ENS name resolution support (optional)
    - Handle invalid addresses with clear error messages
    - _Requirements: 4.3_
  
  - [x] 3.3 Create parser API endpoint
    - Add POST /api/voice/parse endpoint to voice.js routes
    - Accept transcribed text in request body
    - Return ParsedCommand object with action, amount, recipient, confidence
    - Handle parsing errors gracefully
    - _Requirements: 4.4, 4.5_
  
  - [x] 3.4 Write property test for action extraction
    - **Property 8: Action extraction from commands**
    - **Validates: Requirements 4.1**
  
  - [x] 3.5 Write property test for amount extraction
    - **Property 9: Amount extraction from commands**
    - **Validates: Requirements 4.2**
  
  - [x] 3.6 Write property test for recipient resolution
    - **Property 10: Recipient address resolution**
    - **Validates: Requirements 4.3**
  
  - [x] 3.7 Write property test for parser output structure
    - **Property 11: Parser output structure**
    - **Validates: Requirements 4.4**
  
  - [x] 3.8 Write property test for parser error handling
    - **Property 12: Parser error handling**
    - **Validates: Requirements 4.5**

- [x] 4. Implement voice input component (Frontend)
  - [x] 4.1 Create VoiceTransfer component
    - Create VoiceTransfer.jsx in frontend/src/components
    - Add microphone access using MediaRecorder API
    - Implement audio recording with start/stop controls
    - Display recording status with visual feedback (waveform/indicator)
    - Send audio blob to backend /api/voice/transcribe endpoint
    - Display transcribed text to user
    - _Requirements: 3.1, 3.2_
  
  - [x] 4.2 Add audio capture validation
    - Check microphone permissions before recording
    - Validate audio quality (duration, size) before sending
    - Handle microphone access denied errors
    - Handle browser compatibility issues
    - _Requirements: 3.1, 3.3_
  
  - [x] 4.3 Write property test for audio capture






    - **Property 5: Audio capture validity**
    - **Validates: Requirements 3.1**

- [x] 5. Implement command parsing integration and confirmation UI (Frontend)
  - [x] 5.1 Integrate command parser API call in VoiceTransfer
    - Call /api/voice/parse endpoint with transcribed text
    - Handle parsing response (success or error)
    - Display parsed command details (action, amount, recipient)
    - Handle parsing errors with user-friendly messages
    - _Requirements: 3.4, 4.4, 4.5_
  
  - [x] 5.2 Create confirmation modal/section in VoiceTransfer
    - Display parsed command details (action, amount, recipient address)
    - Add confirm and reject buttons with clear labels
    - Show current MNEE balance using useMNEEBalance hook
    - Display insufficient balance warning if amount exceeds balance
    - Style with existing UI theme
    - _Requirements: 5.1, 5.4_
  
  - [x] 5.3 Add balance validation logic
    - Check if parsed amount exceeds user's MNEE balance
    - Display validation errors with clear messaging
    - Disable confirm button if validation fails
    - Show how much MNEE is available vs requested
    - _Requirements: 5.4_
  
  - [x] 5.4 Write property test for insufficient balance validation
    - **Property 15: Insufficient balance validation**
    - **Validates: Requirements 5.4**

- [ ] 6. Implement transaction executor (Frontend)




  - [x] 6.1 Create MNEE transfer hook in mneeService.js



    - Add useMNEETransfer custom hook using Wagmi's useWriteContract
    - Call MNEE contract transfer function with recipient and amount (in wei)
    - Handle transaction signing through connected wallet
    - Use useWaitForTransactionReceipt to monitor transaction status
    - Return transaction functions and status
    - Note: MNEE token is on Ethereum mainnet at 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
    - _Requirements: 6.1, 6.5_
  

  - [x] 6.2 Integrate transaction execution in VoiceTransfer component

    - Import and use useMNEETransfer hook
    - Convert parsed amount to wei using parseMNEEAmount
    - Execute transfer on user confirmation in handleConfirm function
    - Track transaction states (idle, pending, confirmed, failed)
    - Display transaction hash when submitted to blockchain
    - Show success message with transaction link when confirmed
    - Show error messages with details when failed
    - Automatically refresh MNEE balance after confirmation using refetch
    - Remove the TODO comment and console.log in handleConfirm
    - _Requirements: 6.2, 6.3, 6.4, 2.4_
  

  - [x] 6.3 Implement comprehensive transaction error handling

    - Handle user rejection in wallet (UserRejectedRequestError)
    - Handle insufficient gas errors
    - Handle contract execution failures (revert reasons)
    - Handle network timeouts and RPC errors
    - Display user-friendly error messages for each case
    - _Requirements: 8.4_
  
  - [ ] 6.4 Write property test for transaction execution




    - **Property 16: Transaction execution with correct parameters**
    - **Validates: Requirements 6.1**
  
  - [ ]* 6.5 Write property test for balance refresh
    - **Property 4: Balance refresh after transaction**
    - **Validates: Requirements 2.4**

- [ ] 7. Implement wallet connection verification and state management (Frontend)
  - [ ] 7.1 Add wallet status verification to VoiceTransfer component
    - Import and use useAccount hook from Wagmi to check wallet connection
    - Display connection status indicator (connected/disconnected)
    - Show "Connect Wallet" prompt if disconnected
    - Disable voice recording button when wallet is not connected
    - Add visual indicator showing wallet connection is required
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 7.2 Add wallet state change listeners and disconnection handling
    - Use useAccount hook to listen for connection/disconnection events
    - Update UI immediately when wallet state changes
    - Halt in-progress operations if wallet disconnects during flow
    - Reset component state to idle on disconnection
    - Clear any pending transactions or confirmations
    - _Requirements: 1.4, 8.2_
  
  - [ ]* 7.3 Write property test for wallet status verification
    - **Property 1: Wallet status verification on initialization**
    - **Validates: Requirements 1.1**
  
  - [ ]* 7.4 Write property test for wallet state reactivity
    - **Property 2: Wallet state change reactivity**
    - **Validates: Requirements 1.4**
  
  - [ ]* 7.5 Write property test for wallet disconnection handling
    - **Property 17: Wallet disconnection halts operations**
    - **Validates: Requirements 8.2**

- [ ] 8. Complete end-to-end flow orchestration and error handling
  - [ ] 8.1 Enhance state management for complete transaction flow
    - Add transaction execution states to existing state management
    - Track states: executing, pending (tx submitted), confirmed (tx mined), failed
    - Handle state transitions from confirmation → execution → pending → confirmed/failed
    - Display appropriate UI for transaction execution states
    - Show transaction hash and block explorer link when available
    - _Requirements: 3.4, 5.2, 5.3, 6.2, 6.3_
  
  - [ ] 8.2 Add comprehensive error handling and recovery
    - Enhance existing error handling to cover transaction errors
    - Display user-friendly error messages for each error type
    - Log errors to console for debugging
    - Allow user to restart flow after errors with clear "Try Again" button
    - Handle network errors with retry suggestions
    - Preserve error context for better debugging
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 8.3 Write property test for confirmation flow
    - **Property 13: Confirmation triggers execution**
    - **Validates: Requirements 5.2**
  
  - [ ]* 8.4 Write property test for rejection flow
    - **Property 14: Rejection cancels transaction**
    - **Validates: Requirements 5.3**
  
  - [ ]* 8.5 Write property test for text forwarding
    - **Property 7: Text forwarding to parser**
    - **Validates: Requirements 3.4**

- [ ] 9. Add UI polish and user experience improvements
  - [ ] 9.1 Add transaction execution loading indicators
    - Show spinner/loading indicator during transaction signing
    - Show spinner/loading indicator while transaction is pending on blockchain
    - Display current step in the transaction process with clear labels
    - Add visual feedback for transaction confirmation
    - _Requirements: 7.4_
  
  - [ ] 9.2 Enhance visual feedback for transaction states
    - Add success animations (checkmark, green highlight) on transaction confirmation
    - Add transaction link to Etherscan block explorer on success
    - Add status badges showing current transaction state clearly
    - Improve error display with actionable suggestions
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 9.3 Add accessibility features
    - Keyboard navigation for all interactive elements
    - Screen reader support with descriptive ARIA labels
    - ARIA labels for all buttons and status indicators
    - Focus management (auto-focus on confirm/reject buttons)
    - High contrast mode support
    - _Requirements: 7.1_

- [x] 10. Integration with main application
  - [x] 10.1 Add VoiceTransfer component to main app
    - Import VoiceTransfer component into App.jsx
    - Add voice transfer section to main page
    - Ensure RainbowKit wallet connection is available
    - Verify integration with existing UI theme
    - _Requirements: All_
  
  - [ ]* 10.2 Add feature documentation
    - Add user-facing instructions for voice transfer feature
    - Document supported command formats and examples
    - Add troubleshooting guide for common issues
    - _Requirements: 7.1_

- [ ] 11. End-to-end testing and final validation
  - [ ] 11.1 Manual testing of complete flow
    - Test happy path: record → transcribe → parse → confirm → execute → transaction confirmed
    - Test with various command phrasings and amounts
    - Test error scenarios (invalid address, insufficient balance, user rejection, etc.)
    - Test wallet disconnection during various stages of the flow
    - Verify balance updates after successful transaction
    - Test on Ethereum mainnet or testnet with real MNEE tokens
    - _Requirements: All_
  
  - [ ] 11.2 Run all automated tests
    - Run all property-based tests (backend and frontend): `npm test` in both directories
    - Run all unit tests
    - Verify all tests pass without errors
    - Fix any failing tests
    - _Requirements: All_
  
  - [ ] 11.3 Final checkpoint - Ensure everything works
    - Verify all features work end-to-end on testnet
    - Check error handling for all edge cases
    - Confirm UI/UX is polished and intuitive
    - Verify transaction links work correctly
    - Test with different wallet providers (MetaMask, WalletConnect, etc.)
    - Ask the user if questions arise or if ready for production
