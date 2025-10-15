import { describe, expect, test } from '@jest/globals';
import { KeySystemId, ProtectionType } from '../../../lib/constants/systemId.js';

describe('System ID Constants', () => {
  test('should have correct KeySystemId values', () => {
    expect(KeySystemId.CencDRM_LitV1).toBeDefined();
    expect(KeySystemId.CencDRM_LitSAV1).toBeDefined();
    expect(typeof KeySystemId.CencDRM_LitV1).toBe('string');
    expect(typeof KeySystemId.CencDRM_LitSAV1).toBe('string');
  });

  test('should have correct ProtectionType values', () => {
    expect(ProtectionType.CencDRM_LitV1).toBeDefined();
    expect(ProtectionType.CencDRM_LitSAV1).toBeDefined();
    expect(typeof ProtectionType.CencDRM_LitV1).toBe('string');
    expect(typeof ProtectionType.CencDRM_LitSAV1).toBe('string');
  });

  test('should have different values for EOA and SA variants', () => {
    expect(KeySystemId.CencDRM_LitV1).not.toBe(KeySystemId.CencDRM_LitSAV1);
    expect(ProtectionType.CencDRM_LitV1).not.toBe(ProtectionType.CencDRM_LitSAV1);
  });

  test('should have correct enum values', () => {
    expect(KeySystemId.CencDRM_LitV1).toBe("b785554688e540f8ba99c3e33033fbee");
    expect(KeySystemId.CencDRM_LitSAV1).toBe("a17e506d93554710935f1d928eff7594");
    expect(ProtectionType.CencDRM_LitV1).toBe("cenc:lit-drm-v1");
    expect(ProtectionType.CencDRM_LitSAV1).toBe("cenc:lit-drm-sa-v1");
  });

  test('should include all protection types', () => {
    expect(ProtectionType.Clearkey).toBe("clearkey");
    expect(ProtectionType.CencDRM_V1).toBe("cenc:web3-drm-v1");
    expect(ProtectionType.CencDRM_LitV1).toBe("cenc:lit-drm-v1");
    expect(ProtectionType.CencDRM_LitSAV1).toBe("cenc:lit-drm-sa-v1");
  });

  test('should include all key system IDs', () => {
    expect(KeySystemId.Clearkey).toBe("e2719d58a985b3c9781ab030af78d30e");
    expect(KeySystemId.CencDRM_V1).toBe("bf8ef85d2c54475d8c1ee27db60332a2");
    expect(KeySystemId.CencDRM_LitV1).toBe("b785554688e540f8ba99c3e33033fbee");
    expect(KeySystemId.CencDRM_LitSAV1).toBe("a17e506d93554710935f1d928eff7594");
  });
});
