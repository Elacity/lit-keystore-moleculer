import { describe, expect, test } from '@jest/globals';
import { KeySystemId, ProtectionType } from '../../../lib/constants/systemId.js';
import createLitEncoder from '../../../lib/encoders/lit-protocol/LitEncoder.js';
import LitEncoderEOA from '../../../lib/encoders/lit-protocol/LitEncoderEOA.js';
import LitEncoderSA from '../../../lib/encoders/lit-protocol/LitEncoderSA.js';

describe('Encryption Workflow - ELACITY-2010 Changes', () => {
  describe('System Constants Validation', () => {
    test('should have correct EOA system identifiers', () => {
      expect(KeySystemId.CencDRM_LitV1).toBe('b785554688e540f8ba99c3e33033fbee');
      expect(ProtectionType.CencDRM_LitV1).toBe('cenc:lit-drm-v1');
    });

    test('should have correct Smart Account system identifiers', () => {
      expect(KeySystemId.CencDRM_LitSAV1).toBe('a17e506d93554710935f1d928eff7594');
      expect(ProtectionType.CencDRM_LitSAV1).toBe('cenc:lit-drm-sa-v1');
    });

    test('should differentiate between EOA and SA configurations', () => {
      expect(KeySystemId.CencDRM_LitV1).not.toBe(KeySystemId.CencDRM_LitSAV1);
      expect(ProtectionType.CencDRM_LitV1).not.toBe(ProtectionType.CencDRM_LitSAV1);
    });
  });

  describe('Factory Pattern Implementation', () => {
    test('should export createLitEncoder factory function', () => {
      expect(createLitEncoder).toBeDefined();
      expect(typeof createLitEncoder).toBe('function');
    });

    test('should create custom encoder factory', () => {
      const customFactory = createLitEncoder({
        keySystemId: KeySystemId.CencDRM_LitV1,
        protectionType: ProtectionType.CencDRM_LitV1,
        actionIpfsId: 'QmTestActionId123',
        accessCheckIpfsId: 'QmTestAccessCheckId123'
      });

      expect(customFactory).toBeDefined();
      expect(typeof customFactory).toBe('function');
    });

    test('should export pre-configured EOA encoder', () => {
      expect(LitEncoderEOA).toBeDefined();
      expect(typeof LitEncoderEOA).toBe('function');
    });

    test('should export pre-configured Smart Account encoder', () => {
      expect(LitEncoderSA).toBeDefined();
      expect(typeof LitEncoderSA).toBe('function');
    });

    test('should create different encoder factories', () => {
      expect(LitEncoderEOA).not.toBe(LitEncoderSA);
    });
  });

  describe('ELACITY-2010 Architectural Validation', () => {
    test('should demonstrate factory pattern separation', () => {
      // This validates the key architectural change in ELACITY-2010:
      // From single LitEncoder class to factory pattern with separate encoders
      
      const eoaFactory = LitEncoderEOA;
      const saFactory = LitEncoderSA;
      const genericFactory = createLitEncoder;
      
      // All should be functions (constructors)
      expect(typeof eoaFactory).toBe('function');
      expect(typeof saFactory).toBe('function'); 
      expect(typeof genericFactory).toBe('function');
      
      // Should be different instances
      expect(eoaFactory).not.toBe(saFactory);
    });

    test('should support configuration flexibility', () => {
      // Test that different configurations can be created
      const config1 = {
        keySystemId: KeySystemId.CencDRM_LitV1,
        protectionType: ProtectionType.CencDRM_LitV1,
        actionIpfsId: 'QmActionId1',
        accessCheckIpfsId: 'QmAccessId1'
      };
      
      const config2 = {
        keySystemId: KeySystemId.CencDRM_LitSAV1,
        protectionType: ProtectionType.CencDRM_LitSAV1,
        actionIpfsId: 'QmActionId2',
        accessCheckIpfsId: 'QmAccessId2'
      };
      
      const factory1 = createLitEncoder(config1);
      const factory2 = createLitEncoder(config2);
      
      expect(factory1).toBeDefined();
      expect(factory2).toBeDefined();
      expect(factory1).not.toBe(factory2);
    });

    test('should maintain interface consistency', () => {
      // Both EOA and SA encoders should follow the same pattern
      // even though they have different configurations
      
      expect(typeof LitEncoderEOA).toBe('function');
      expect(typeof LitEncoderSA).toBe('function');
      
      // They should be constructable (this is a basic check)
      expect(LitEncoderEOA.name).toBeDefined();
      expect(LitEncoderSA.name).toBeDefined();
    });
  });

  describe('Configuration Parameter Validation', () => {
    test('should accept valid factory parameters', () => {
      const validConfig = {
        keySystemId: KeySystemId.CencDRM_LitV1,
        protectionType: ProtectionType.CencDRM_LitV1,
        actionIpfsId: 'QmTestActionIdValid',
        accessCheckIpfsId: 'QmTestAccessCheckIdValid'
      };
      
      expect(() => createLitEncoder(validConfig)).not.toThrow();
    });

    test('should handle different key system configurations', () => {
      const eoaConfig = {
        keySystemId: KeySystemId.CencDRM_LitV1,
        protectionType: ProtectionType.CencDRM_LitV1,
        actionIpfsId: 'QmEOAActionId',
        accessCheckIpfsId: 'QmEOAAccessId'
      };
      
      const saConfig = {
        keySystemId: KeySystemId.CencDRM_LitSAV1,
        protectionType: ProtectionType.CencDRM_LitSAV1,
        actionIpfsId: 'QmSAActionId',
        accessCheckIpfsId: 'QmSAAccessId'
      };
      
      expect(() => createLitEncoder(eoaConfig)).not.toThrow();
      expect(() => createLitEncoder(saConfig)).not.toThrow();
    });
  });

  describe('Module Export Structure', () => {
    test('should export all required components', () => {
      // Validate that ELACITY-2010 refactor exports are available
      expect(createLitEncoder).toBeDefined();
      expect(LitEncoderEOA).toBeDefined();
      expect(LitEncoderSA).toBeDefined();
      expect(KeySystemId).toBeDefined();
      expect(ProtectionType).toBeDefined();
    });

    test('should have proper function signatures', () => {
      // Basic signature validation
      expect(createLitEncoder.length).toBeGreaterThanOrEqual(1); // Takes at least 1 parameter
      expect(LitEncoderEOA.length).toBeGreaterThanOrEqual(2); // Takes service and parameters
      expect(LitEncoderSA.length).toBeGreaterThanOrEqual(2); // Takes service and parameters
    });
  });
});
