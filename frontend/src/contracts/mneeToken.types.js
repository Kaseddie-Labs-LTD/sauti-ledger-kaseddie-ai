/**
 * TypeScript-style type definitions for MNEE Token Contract
 * Using JSDoc comments for type checking in JavaScript
 */

/**
 * @typedef {Object} MNEETokenConfig
 * @property {string} address - Contract address
 * @property {Array} abi - Contract ABI
 */

/**
 * @typedef {Object} MNEEBalance
 * @property {bigint} value - Balance value in wei
 * @property {string} decimals - Number of decimals (usually 18)
 * @property {string} formatted - Human-readable formatted balance
 * @property {string} symbol - Token symbol (MNEE)
 */

/**
 * @typedef {Object} MNEETransferParams
 * @property {string} to - Recipient address (0x...)
 * @property {bigint} amount - Amount to transfer in wei
 */

/**
 * @typedef {Object} MNEETransferResult
 * @property {string} hash - Transaction hash
 * @property {boolean} success - Whether transaction was successful
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {'idle' | 'loading' | 'success' | 'error'} MNEEOperationStatus
 */

/**
 * @typedef {Object} MNEEContractRead
 * @property {bigint} data - The returned data from contract read
 * @property {boolean} isLoading - Whether the read is in progress
 * @property {boolean} isError - Whether an error occurred
 * @property {Error} [error] - Error object if read failed
 * @property {Function} refetch - Function to refetch the data
 */

/**
 * @typedef {Object} MNEEContractWrite
 * @property {Function} write - Function to execute the write
 * @property {Function} writeAsync - Async function to execute the write
 * @property {boolean} isLoading - Whether the write is in progress
 * @property {boolean} isSuccess - Whether the write succeeded
 * @property {boolean} isError - Whether an error occurred
 * @property {Error} [error] - Error object if write failed
 * @property {string} [hash] - Transaction hash if successful
 */

export {};
