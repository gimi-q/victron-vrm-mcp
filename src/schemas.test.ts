import { describe, it, expect } from 'vitest';
import { toolSchemas } from './schemas';

describe('Tool Schemas', () => {
  describe('vrm.get_user_me', () => {
    it('should accept empty object', () => {
      const result = toolSchemas['vrm_get_user_me'].parse({});
      expect(result).toEqual({});
    });
    
    it('should reject additional properties', () => {
      expect(() => {
        toolSchemas['vrm_get_user_me'].parse({ extra: 'field' });
      }).toThrow();
    });
  });
  
  describe('vrm.list_installations', () => {
    it('should accept empty object', () => {
      const result = toolSchemas['vrm_list_installations'].parse({});
      expect(result).toEqual({});
    });
    
    it('should accept idUser', () => {
      const result = toolSchemas['vrm_list_installations'].parse({ idUser: 12345 });
      expect(result).toEqual({ idUser: 12345 });
    });
    
    it('should accept extended flag', () => {
      const result = toolSchemas['vrm_list_installations'].parse({ extended: true });
      expect(result).toEqual({ extended: true });
    });
    
    it('should reject invalid idUser type', () => {
      expect(() => {
        toolSchemas['vrm_list_installations'].parse({ idUser: "string" });
      }).toThrow();
    });
  });
  
  describe('vrm.get_system_overview', () => {
    it('should accept valid siteId', () => {
      const result = toolSchemas['vrm_get_system_overview'].parse({ siteId: 67890 });
      expect(result).toEqual({ siteId: 67890 });
    });
    
    it('should reject missing siteId', () => {
      expect(() => {
        toolSchemas['vrm_get_system_overview'].parse({});
      }).toThrow();
    });
    
    it('should reject invalid siteId type', () => {
      expect(() => {
        toolSchemas['vrm_get_system_overview'].parse({ siteId: "invalid" });
      }).toThrow();
    });
  });
  
  describe('vrm.get_stats', () => {
    it('should accept minimum required fields', () => {
      const result = toolSchemas['vrm_get_stats'].parse({
        siteId: 12345,
        type: 'venus'
      });
      expect(result).toEqual({
        siteId: 12345,
        type: 'venus'
      });
    });
    
    it('should accept all valid types', () => {
      const types = ['venus', 'live_feed', 'consumption', 'kwh', 'solar_yield', 'forecast'];
      types.forEach(type => {
        const result = toolSchemas['vrm_get_stats'].parse({
          siteId: 12345,
          type
        });
        expect(result.type).toBe(type);
      });
    });
    
    it('should accept time range parameters', () => {
      const result = toolSchemas['vrm_get_stats'].parse({
        siteId: 12345,
        type: 'consumption',
        interval: 'hours',
        start: 1609459200000,
        end: 1609545600000
      });
      expect(result).toEqual({
        siteId: 12345,
        type: 'consumption',
        interval: 'hours',
        start: 1609459200000,
        end: 1609545600000
      });
    });
    
    it('should reject invalid type', () => {
      expect(() => {
        toolSchemas['vrm_get_stats'].parse({
          siteId: 12345,
          type: 'invalid_type'
        });
      }).toThrow();
    });
  });
  
  describe('vrm.get_overall_stats', () => {
    it('should accept minimum required fields', () => {
      const result = toolSchemas['vrm_get_overall_stats'].parse({
        siteId: 12345,
        attributeCodes: ['Pb', 'Pc']
      });
      expect(result).toEqual({
        siteId: 12345,
        attributeCodes: ['Pb', 'Pc']
      });
    });
    
    it('should accept all period types', () => {
      const types = ['custom', 'today', 'yesterday', 'month', 'year'];
      types.forEach(type => {
        const result = toolSchemas['vrm_get_overall_stats'].parse({
          siteId: 12345,
          type,
          attributeCodes: ['kwh']
        });
        expect(result.type).toBe(type);
      });
    });
    
    it('should accept custom time range', () => {
      const result = toolSchemas['vrm_get_overall_stats'].parse({
        siteId: 12345,
        type: 'custom',
        attributeCodes: ['Pb', 'Bc', 'Pc', 'kwh'],
        start: 1609459200000,
        end: 1609545600000
      });
      expect(result.start).toBe(1609459200000);
      expect(result.end).toBe(1609545600000);
    });
    
    it('should reject empty attributeCodes', () => {
      expect(() => {
        toolSchemas['vrm_get_overall_stats'].parse({
          siteId: 12345,
          attributeCodes: []
        });
      }).toThrow();
    });
  });
  
  describe('vrm.get_alarms', () => {
    it('should accept minimum required fields', () => {
      const result = toolSchemas['vrm_get_alarms'].parse({
        siteId: 12345
      });
      expect(result).toEqual({
        siteId: 12345
      });
    });
    
    it('should accept pagination parameters', () => {
      const result = toolSchemas['vrm_get_alarms'].parse({
        siteId: 12345,
        activeOnly: true,
        page: 2,
        pageSize: 50
      });
      expect(result).toEqual({
        siteId: 12345,
        activeOnly: true,
        page: 2,
        pageSize: 50
      });
    });
    
    it('should reject invalid pageSize', () => {
      expect(() => {
        toolSchemas['vrm_get_alarms'].parse({
          siteId: 12345,
          pageSize: 300
        });
      }).toThrow();
    });
  });
  
  describe('vrm.get_diagnostics', () => {
    it('should accept minimum required fields', () => {
      const result = toolSchemas['vrm_get_diagnostics'].parse({
        siteId: 12345
      });
      expect(result).toEqual({
        siteId: 12345
      });
    });
    
    it('should accept count and offset', () => {
      const result = toolSchemas['vrm_get_diagnostics'].parse({
        siteId: 12345,
        count: 500,
        offset: 100
      });
      expect(result).toEqual({
        siteId: 12345,
        count: 500,
        offset: 100
      });
    });
    
    it('should reject count over 1000', () => {
      expect(() => {
        toolSchemas['vrm_get_diagnostics'].parse({
          siteId: 12345,
          count: 1500
        });
      }).toThrow();
    });
  });
  
  describe('vrm.get_widget_graph', () => {
    it('should accept all required fields', () => {
      const result = toolSchemas['vrm_get_widget_graph'].parse({
        siteId: 12345,
        attributeCodes: ['OV1', 'S'],
        instance: 276
      });
      expect(result).toEqual({
        siteId: 12345,
        attributeCodes: ['OV1', 'S'],
        instance: 276
      });
    });
    
    it('should reject missing instance', () => {
      expect(() => {
        toolSchemas['vrm_get_widget_graph'].parse({
          siteId: 12345,
          attributeCodes: ['OV1']
        });
      }).toThrow();
    });
    
    it('should reject empty attributeCodes', () => {
      expect(() => {
        toolSchemas['vrm_get_widget_graph'].parse({
          siteId: 12345,
          attributeCodes: [],
          instance: 276
        });
      }).toThrow();
    });
  });
});