import { formatOperationNumber, formatMerchantCode } from './code-generator.util';

describe('Code Generator Util', () => {
  it('should format operation number as MB-YYYYMMDD-XXXXX', () => {
    const testDate = new Date('2026-09-04T12:00:00Z');
    const opNumber = formatOperationNumber(testDate, 1);
    expect(opNumber).toBe('MB-20260904-00001');
  });

  it('should pad merchant sequence code correctly', () => {
    expect(formatMerchantCode(42)).toBe('MB-COM-00042');
  });
});
