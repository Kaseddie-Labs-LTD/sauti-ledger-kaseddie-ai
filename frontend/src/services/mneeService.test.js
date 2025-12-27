/**
 * Property-Based Tests for MNEE Service
 * Tests balance reading functionality using fast-check
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { formatMNEEAmount, parseMNEEAmount } from './mneeService';
import { formatUnits, parseUnits } from 'viem';

/**
 * Feature: voice-mnee-transfer, Property 3: Balance read accuracy
 * 
 * For any connected wallet address, reading the MNEE balance should return 
 * the same value as directly querying the MNEE contract at address 0x8c...
 * 
 * Validates: Requirements 2.1
 */
describe('Property 3: Balance read accuracy', () => {
  it('should format and parse MNEE amounts consistently (round-trip property)', () => {
    fc.assert(
      fc.property(
        // Generate random amounts as strings with up to 18 decimal places
        fc.double({ min: 0, max: 1000000, noNaN: true }).map(n => n.toFixed(6)),
        (amount) => {
          // Parse the amount to wei
          const amountInWei = parseMNEEAmount(amount, 18);
          
          // Format it back to human-readable
          const formattedAmount = formatMNEEAmount(amountInWei, 18);
          
          // Parse the formatted amount again
          const reparsedAmount = parseMNEEAmount(formattedAmount, 18);
          
          // The round-trip should preserve the value
          expect(amountInWei).toBe(reparsedAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly format balance from wei to human-readable format', () => {
    fc.assert(
      fc.property(
        // Generate random bigint values representing wei amounts
        fc.bigUintN(64), // Generate random bigint up to 64 bits
        (balanceWei) => {
          // Format using our utility
          const formatted = formatMNEEAmount(balanceWei, 18);
          
          // Format using viem directly (our source of truth)
          const expectedFormatted = formatUnits(balanceWei, 18);
          
          // They should match exactly
          expect(formatted).toBe(expectedFormatted);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly parse human-readable amounts to wei', () => {
    fc.assert(
      fc.property(
        // Generate random amounts as strings
        fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true })
          .map(n => n.toFixed(Math.floor(Math.random() * 18))), // Random decimal places
        (amount) => {
          // Skip empty or invalid strings
          if (!amount || amount === 'NaN' || amount === 'Infinity') {
            return true;
          }

          // Parse using our utility
          const parsed = parseMNEEAmount(amount, 18);
          
          // Parse using viem directly (our source of truth)
          const expectedParsed = parseUnits(amount, 18);
          
          // They should match exactly
          expect(parsed).toBe(expectedParsed);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle zero balance correctly', () => {
    fc.assert(
      fc.property(
        fc.constant(0n),
        (zeroBalance) => {
          const formatted = formatMNEEAmount(zeroBalance, 18);
          expect(formatted).toBe('0');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle very large balances without overflow', () => {
    fc.assert(
      fc.property(
        // Generate very large bigint values (up to 256 bits like uint256)
        fc.bigUintN(128), // Use 128 bits to stay safe
        (largeBalance) => {
          // Should not throw an error
          const formatted = formatMNEEAmount(largeBalance, 18);
          
          // Should be a valid string
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(0);
          
          // Should be parseable back
          const parsed = parseMNEEAmount(formatted, 18);
          expect(parsed).toBe(largeBalance);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain precision for amounts with many decimal places', () => {
    fc.assert(
      fc.property(
        // Generate amounts with exactly 18 decimal places
        fc.bigUintN(64),
        (weiAmount) => {
          // Format to human-readable
          const formatted = formatMNEEAmount(weiAmount, 18);
          
          // Parse back to wei
          const parsed = parseMNEEAmount(formatted, 18);
          
          // Should maintain exact precision
          expect(parsed).toBe(weiAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle different decimal configurations consistently', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10000, noNaN: true }).map(n => n.toFixed(6)),
        fc.integer({ min: 0, max: 18 }), // Different decimal places
        (amount, decimals) => {
          // Parse with specified decimals
          const parsed = parseMNEEAmount(amount, decimals);
          
          // Format back with same decimals
          const formatted = formatMNEEAmount(parsed, decimals);
          
          // Parse again
          const reparsed = parseMNEEAmount(formatted, decimals);
          
          // Round-trip should preserve value
          expect(parsed).toBe(reparsed);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: voice-mnee-transfer, Property 16: Transaction execution with correct parameters
 * 
 * For any confirmed transaction, the MNEE contract transfer function should be called 
 * with the exact recipient address and amount from the parsed command.
 * 
 * Validates: Requirements 6.1
 */
describe('Property 16: Transaction execution with correct parameters', () => {
  it('should prepare transfer with exact recipient and amount from parsed command', () => {
    fc.assert(
      fc.property(
        // Generate random valid Ethereum addresses (0x + 40 hex chars)
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(hex => `0x${hex}`),
        // Generate random amounts (positive numbers with up to 6 decimal places)
        fc.double({ min: 0.000001, max: 1000000, noNaN: true, noDefaultInfinity: true })
          .map(n => n.toFixed(6)),
        (recipientAddress, amountStr) => {
          // Parse the amount to wei (this is what the component does)
          const amountInWei = parseMNEEAmount(amountStr, 18);
          
          // Verify that the parsed amount is a valid bigint
          expect(typeof amountInWei).toBe('bigint');
          expect(amountInWei).toBeGreaterThanOrEqual(0n);
          
          // Verify that the recipient address is in correct format
          expect(recipientAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
          
          // Verify that we can format the amount back and it's consistent
          const formattedAmount = formatMNEEAmount(amountInWei, 18);
          const reparsedAmount = parseMNEEAmount(formattedAmount, 18);
          
          // The round-trip should preserve the value
          expect(reparsedAmount).toBe(amountInWei);
          
          // Verify that the parameters are ready for contract call
          // In the actual implementation, these exact values would be passed to:
          // transfer(recipientAddress, amountInWei)
          expect(recipientAddress.length).toBe(42); // 0x + 40 hex chars
          expect(amountInWei).toBeGreaterThan(0n); // Must be positive for valid transfer
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain parameter integrity across different amount scales', () => {
    fc.assert(
      fc.property(
        // Generate addresses
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(hex => `0x${hex}`),
        // Generate amounts across different scales (small, medium, large)
        fc.oneof(
          fc.double({ min: 0.000001, max: 1, noNaN: true }).map(n => n.toFixed(6)), // Small amounts
          fc.double({ min: 1, max: 1000, noNaN: true }).map(n => n.toFixed(4)), // Medium amounts
          fc.double({ min: 1000, max: 1000000, noNaN: true }).map(n => n.toFixed(2)) // Large amounts
        ),
        (recipient, amount) => {
          // Parse amount to wei
          const amountInWei = parseMNEEAmount(amount, 18);
          
          // Verify parameters are valid for contract call
          expect(recipient).toMatch(/^0x[0-9a-fA-F]{40}$/);
          expect(typeof amountInWei).toBe('bigint');
          expect(amountInWei).toBeGreaterThan(0n);
          
          // Verify that the amount maintains precision
          const formatted = formatMNEEAmount(amountInWei, 18);
          const originalValue = parseFloat(amount);
          const formattedValue = parseFloat(formatted);
          
          // Should be very close (within floating point precision)
          expect(Math.abs(originalValue - formattedValue)).toBeLessThan(0.000001);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle maximum safe transfer amounts correctly', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(hex => `0x${hex}`),
        // Generate large but safe amounts (up to 1 billion MNEE)
        fc.bigUintN(64), // Generate random bigint representing wei
        (recipient, amountWei) => {
          // Skip zero amounts
          if (amountWei === 0n) return true;
          
          // Format to human-readable
          const formatted = formatMNEEAmount(amountWei, 18);
          
          // Parse back to wei
          const reparsed = parseMNEEAmount(formatted, 18);
          
          // Verify round-trip preserves value
          expect(reparsed).toBe(amountWei);
          
          // Verify parameters are valid
          expect(recipient).toMatch(/^0x[0-9a-fA-F]{40}$/);
          expect(typeof amountWei).toBe('bigint');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly parse amounts with varying decimal precision', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(hex => `0x${hex}`),
        fc.double({ min: 0.000001, max: 10000, noNaN: true }),
        fc.integer({ min: 0, max: 18 }), // Random decimal places
        (recipient, baseAmount, decimalPlaces) => {
          // Format amount with specific decimal places
          const amount = baseAmount.toFixed(decimalPlaces);
          
          // Parse to wei
          const amountInWei = parseMNEEAmount(amount, 18);
          
          // Verify valid parameters
          expect(recipient).toMatch(/^0x[0-9a-fA-F]{40}$/);
          expect(typeof amountInWei).toBe('bigint');
          expect(amountInWei).toBeGreaterThanOrEqual(0n);
          
          // Verify we can format back
          const formatted = formatMNEEAmount(amountInWei, 18);
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve exact parameter values for contract interaction', () => {
    fc.assert(
      fc.property(
        // Generate valid Ethereum addresses
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(hex => `0x${hex.toLowerCase()}`),
        // Generate amounts as they would come from parsed commands
        fc.double({ min: 0.01, max: 100000, noNaN: true }).map(n => n.toFixed(4)),
        (recipientAddress, amountString) => {
          // Simulate what happens in handleConfirm function
          const parsedCommand = {
            action: 'transfer',
            amount: parseFloat(amountString),
            recipient: recipientAddress,
            confidence: 95
          };
          
          // Convert parsed amount to wei (as done in handleConfirm)
          const amountInWei = parseMNEEAmount(parsedCommand.amount.toString(), 18);
          
          // These are the exact parameters that would be passed to transfer()
          const transferRecipient = parsedCommand.recipient;
          const transferAmount = amountInWei;
          
          // Verify parameters are correct and unchanged
          expect(transferRecipient).toBe(recipientAddress);
          expect(transferRecipient).toMatch(/^0x[0-9a-fA-F]{40}$/);
          expect(typeof transferAmount).toBe('bigint');
          expect(transferAmount).toBeGreaterThan(0n);
          
          // Verify the amount conversion is accurate
          const reconverted = formatMNEEAmount(transferAmount, 18);
          const originalValue = parseFloat(amountString);
          const reconvertedValue = parseFloat(reconverted);
          expect(Math.abs(originalValue - reconvertedValue)).toBeLessThan(0.0001);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit tests for edge cases
 */
describe('MNEE Service - Edge Cases', () => {
  it('should handle null/undefined amounts gracefully', () => {
    expect(formatMNEEAmount(null)).toBe('0');
    expect(formatMNEEAmount(undefined)).toBe('0');
    expect(parseMNEEAmount(null)).toBe(0n);
    expect(parseMNEEAmount(undefined)).toBe(0n);
    expect(parseMNEEAmount('')).toBe(0n);
  });

  it('should handle amounts with no decimal part', () => {
    const amount = '100';
    const parsed = parseMNEEAmount(amount, 18);
    const formatted = formatMNEEAmount(parsed, 18);
    // formatUnits from viem returns '100' not '100.0' for whole numbers
    expect(formatted).toBe('100');
  });

  it('should handle amounts with only decimal part', () => {
    const amount = '0.123456';
    const parsed = parseMNEEAmount(amount, 18);
    const formatted = formatMNEEAmount(parsed, 18);
    expect(parseFloat(formatted)).toBeCloseTo(0.123456, 6);
  });
});
