import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('VRMClient', () => {
  let client: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    process.env.VRM_TOKEN = 'test-token';
    process.env.VRM_BASE_URL = 'https://vrmapi.victronenergy.com/v2';
    process.env.VRM_TOKEN_KIND = 'Token';
    
    const { VRMClient } = await import('./vrm-client');
    client = new VRMClient();
  });
  
  describe('constructor', () => {
    it('should throw error if VRM_TOKEN is not set', async () => {
      delete process.env.VRM_TOKEN;
      const { VRMClient } = await import('./vrm-client');
      expect(() => new VRMClient()).toThrow('VRM_TOKEN environment variable is required');
    });
    
    it('should use default values for optional env vars', async () => {
      delete process.env.VRM_BASE_URL;
      delete process.env.VRM_TOKEN_KIND;
      process.env.VRM_TOKEN = 'test-token';
      const { VRMClient } = await import('./vrm-client');
      const testClient = new VRMClient();
      expect(testClient).toBeDefined();
    });
  });
  
  describe('path validation', () => {
    it('should allow valid paths', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ idUser: 12345 })
      });
      
      await client.getUserMe();
      expect(mockFetch).toHaveBeenCalled();
    });
    
    it('should reject invalid paths', async () => {
      // This test doesn't need a fetch mock since it should throw before making a request
      const invalidClient = Object.create(client);
      await expect(invalidClient.vrmGet('/invalid/path')).rejects.toThrow('Disallowed path');
    });
  });
  
  describe('getUserMe', () => {
    it('should return user data on success', async () => {
      const mockUserData = { idUser: 12345, name: 'Test User' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUserData
      });
      
      const result = await client.getUserMe();
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockUserData);
      expect(result.meta.status).toBe(200);
      expect(result.meta.rateLimited).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://vrmapi.victronenergy.com/v2/users/me',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Authorization': 'Token test-token',
            'Accept': 'application/json'
          }
        })
      );
    });
    
    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });
      
      const result = await client.getUserMe();
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('auth');
      expect(result.error?.message).toContain('Authentication failed');
      expect(result.meta.status).toBe(401);
    });
  });
  
  describe('listInstallations', () => {
    it('should fetch user ID if not provided', async () => {
      const mockUserData = { idUser: 12345 };
      const mockInstallations = { records: [{ id: 1, name: 'Site 1' }] };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockUserData
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockInstallations
        });
      
      const result = await client.listInstallations({});
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'Site 1' }]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    
    it('should use provided idUser', async () => {
      const mockInstallations = { records: [{ id: 1, name: 'Site 1' }] };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockInstallations
      });
      
      const result = await client.listInstallations({ idUser: 67890 });
      
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/67890/installations'),
        expect.any(Object)
      );
    });
    
    it('should handle extended parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      });
      
      await client.listInstallations({ idUser: 12345, extended: true });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('?extended=1'),
        expect.any(Object)
      );
    });

    it('should handle installations with extended information', async () => {
      const mockExtendedInstallations = {
        records: [
          { 
            id: 1, 
            name: 'Home Solar System',
            location: 'Amsterdam, Netherlands',
            timezone: 'Europe/Amsterdam',
            devices: 5,
            lastUpdate: '2024-01-15T10:30:00Z'
          },
          { 
            id: 2, 
            name: 'Cabin Off-Grid',
            location: 'Remote Location',
            timezone: 'UTC',
            devices: 3,
            lastUpdate: '2024-01-15T09:45:00Z'
          }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockExtendedInstallations
      });
      
      const result = await client.listInstallations({ 
        idUser: 12345, 
        extended: true 
      });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockExtendedInstallations.records);
      expect(result.data[0]).toHaveProperty('location');
      expect(result.data[0]).toHaveProperty('timezone');
      expect(result.data[0]).toHaveProperty('devices');
    });

    it('should handle user fetch failure when idUser not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });
      
      const result = await client.listInstallations({});
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('user_fetch_failed');
      expect(result.error?.message).toBe('Failed to fetch user ID');
    });

    it('should handle installations fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Access denied' })
      });
      
      const result = await client.listInstallations({ idUser: 12345 });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('auth');
      expect(result.error?.message).toContain('Authentication failed');
    });

    it('should handle empty installations list', async () => {
      const mockEmptyInstallations = { records: [] };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEmptyInstallations
      });
      
      const result = await client.listInstallations({ idUser: 12345 });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
  
  describe('getStats', () => {
    it('should construct correct query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      });
      
      await client.getStats({
        siteId: 12345,
        type: 'consumption',
        interval: 'hours',
        start: 1609459200000,
        end: 1609545600000
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/installations/12345/stats');
      expect(callUrl).toContain('type=consumption');
      expect(callUrl).toContain('interval=hours');
      expect(callUrl).toContain('start=1609459200000');
      expect(callUrl).toContain('end=1609545600000');
    });

    it('should use default interval when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      });
      
      await client.getStats({
        siteId: 12345,
        type: 'venus'
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('interval=15mins');
    });

    it('should handle all valid stat types', async () => {
      const types = ['venus', 'live_feed', 'consumption', 'kwh', 'solar_yield', 'forecast'];
      
      for (const type of types) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ records: [] })
        });
        
        await client.getStats({ siteId: 12345, type: type as any });
        
        const callUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
        expect(callUrl).toContain(`type=${type}`);
      }
    });

    it('should handle stats data with proper format', async () => {
      const mockStatsData = {
        records: {
          consumption: [
            [1609459200000, 1200],
            [1609462800000, 1150]
          ],
          solar: [
            [1609459200000, 800],
            [1609462800000, 750]
          ]
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStatsData
      });
      
      const result = await client.getStats({
        siteId: 12345,
        type: 'consumption'
      });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockStatsData.records);
    });

    it('should handle stats errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ message: 'Invalid time range' })
      });
      
      const result = await client.getStats({
        siteId: 12345,
        type: 'consumption',
        start: 1609545600000,
        end: 1609459200000 // End before start
      });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('bad_request');
      expect(result.error?.message).toBe('Invalid time range');
    });
  });
  
  describe('getOverallStats', () => {
    it('should handle multiple attribute codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: {} })
      });
      
      await client.getOverallStats({
        siteId: 12345,
        type: 'custom',
        attributeCodes: ['Pb', 'Pc', 'kwh']
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      // URL encoding converts [] to %5B%5D
      expect(callUrl).toContain('attributeCodes%5B%5D=Pb');
      expect(callUrl).toContain('attributeCodes%5B%5D=Pc');
      expect(callUrl).toContain('attributeCodes%5B%5D=kwh');
    });
    
    it('should add timezone note for relative periods', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: {} })
      });
      
      const result = await client.getOverallStats({
        siteId: 12345,
        type: 'today',
        attributeCodes: ['kwh']
      });
      
      expect(result.meta.note).toContain('timezone');
    });

    it('should use default type when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: {} })
      });
      
      await client.getOverallStats({
        siteId: 12345,
        attributeCodes: ['kwh']
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('type=custom');
    });

    it('should handle custom time range for custom type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: {} })
      });
      
      await client.getOverallStats({
        siteId: 12345,
        type: 'custom',
        attributeCodes: ['kwh', 'Pb'],
        start: 1609459200000,
        end: 1609545600000
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('start=1609459200000');
      expect(callUrl).toContain('end=1609545600000');
    });

    it('should ignore start/end for non-custom types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: {} })
      });
      
      await client.getOverallStats({
        siteId: 12345,
        type: 'today',
        attributeCodes: ['kwh'],
        start: 1609459200000,
        end: 1609545600000
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).not.toContain('start=');
      expect(callUrl).not.toContain('end=');
    });

    it('should handle all period types correctly', async () => {
      const types = ['custom', 'today', 'yesterday', 'month', 'year'];
      const timezonePeriods = ['today', 'yesterday', 'month', 'year'];
      
      for (const type of types) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ records: {} })
        });
        
        const result = await client.getOverallStats({
          siteId: 12345,
          type: type as any,
          attributeCodes: ['kwh']
        });
        
        expect(result.ok).toBe(true);
        
        if (timezonePeriods.includes(type)) {
          expect(result.meta.note).toContain('timezone');
        } else {
          expect(result.meta.note).toBeUndefined();
        }
      }
    });

    it('should handle overall stats with real data format', async () => {
      const mockOverallStatsData = {
        records: {
          kwh: { total: 1250.5, daily_avg: 41.7 },
          Pb: { total: 45.2, daily_avg: 1.5 },
          Pc: { total: 1205.3, daily_avg: 40.2 }
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOverallStatsData
      });
      
      const result = await client.getOverallStats({
        siteId: 12345,
        type: 'month',
        attributeCodes: ['kwh', 'Pb', 'Pc']
      });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockOverallStatsData.records);
    });

    it('should handle overall stats errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid attribute codes' })
      });
      
      const result = await client.getOverallStats({
        siteId: 12345,
        type: 'custom',
        attributeCodes: ['INVALID_CODE']
      });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('bad_request');
      expect(result.error?.message).toBe('Invalid attribute codes');
    });
  });
  
  describe('getSystemOverview', () => {
    it('should fetch system overview with correct parameters', async () => {
      const mockOverviewData = {
        battery: { level: 85, voltage: 12.4, current: -5.2 },
        solar: { power: 250, voltage: 18.2 },
        grid: { power: 0, voltage: 230 }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOverviewData
      });
      
      const result = await client.getSystemOverview({ siteId: 12345 });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockOverviewData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://vrmapi.victronenergy.com/v2/installations/12345/system-overview',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Authorization': 'Token test-token',
            'Accept': 'application/json'
          }
        })
      );
    });

    it('should handle system overview errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Installation not found' })
      });
      
      const result = await client.getSystemOverview({ siteId: 99999 });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('not_found');
      expect(result.error?.message).toContain('Resource not found');
      expect(result.meta.status).toBe(404);
    });
  });

  describe('getAlarms', () => {
    it('should fetch alarms with minimum required fields', async () => {
      const mockAlarmsData = {
        records: [
          { id: 1, level: 'Warning', description: 'Low battery voltage', timestamp: 1609459200 },
          { id: 2, level: 'Critical', description: 'High temperature', timestamp: 1609462800 }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAlarmsData
      });
      
      const result = await client.getAlarms({ siteId: 12345 });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockAlarmsData.records);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/installations/12345/alarms'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Authorization': 'Token test-token',
            'Accept': 'application/json'
          }
        })
      );
    });

    it('should handle activeOnly parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      });
      
      await client.getAlarms({ siteId: 12345, activeOnly: true });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('activeOnly=true'),
        expect.any(Object)
      );
    });

    it('should handle pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      });
      
      await client.getAlarms({ 
        siteId: 12345, 
        page: 2, 
        pageSize: 50 
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('pageSize=50');
    });

    it('should handle alarms errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ message: 'Invalid page parameter' })
      });
      
      const result = await client.getAlarms({ siteId: 12345, page: -1 });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('bad_request');
      expect(result.error?.message).toBe('Invalid page parameter');
    });
  });

  describe('getDiagnostics', () => {
    it('should fetch diagnostics with minimum required fields', async () => {
      const mockDiagnosticsData = {
        records: [
          { id: 1, parameter: 'battery_voltage', value: 12.4, unit: 'V', timestamp: 1609459200 },
          { id: 2, parameter: 'solar_power', value: 250, unit: 'W', timestamp: 1609459260 }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDiagnosticsData
      });
      
      const result = await client.getDiagnostics({ siteId: 12345 });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockDiagnosticsData.records);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/installations/12345/diagnostics'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Authorization': 'Token test-token',
            'Accept': 'application/json'
          }
        })
      );
    });

    it('should use default count parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      });
      
      await client.getDiagnostics({ siteId: 12345 });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('count=200');
    });

    it('should handle custom count and offset parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ records: [] })
      });
      
      await client.getDiagnostics({ 
        siteId: 12345, 
        count: 500, 
        offset: 100 
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('count=500');
      expect(callUrl).toContain('offset=100');
    });

    it('should handle diagnostics errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Count exceeds limit' })
      });
      
      const result = await client.getDiagnostics({ siteId: 12345, count: 2000 });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('bad_request');
      expect(result.error?.message).toBe('Count exceeds limit');
    });
  });

  describe('getWidgetGraph', () => {
    it('should fetch widget graph with required parameters', async () => {
      const mockGraphData = {
        series: [
          { name: 'Battery Voltage', data: [[1609459200, 12.4], [1609459260, 12.3]] },
          { name: 'Solar Power', data: [[1609459200, 250], [1609459260, 280]] }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGraphData
      });
      
      const result = await client.getWidgetGraph({
        siteId: 12345,
        attributeCodes: ['OV1', 'S'],
        instance: 276
      });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockGraphData);
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/installations/12345/widgets/Graph');
      expect(callUrl).toContain('attributeCodes%5B%5D=OV1');
      expect(callUrl).toContain('attributeCodes%5B%5D=S');
      expect(callUrl).toContain('instance=276');
    });

    it('should add note when data is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      });
      
      const result = await client.getWidgetGraph({
        siteId: 12345,
        attributeCodes: ['OV1', 'S'],
        instance: 276
      });
      
      expect(result.ok).toBe(true);
      expect(result.meta.note).toContain('Widget returned empty data');
    });

    it('should handle multiple attribute codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ series: [] })
      });
      
      await client.getWidgetGraph({
        siteId: 12345,
        attributeCodes: ['OV1', 'S', 'P', 'Pb'],
        instance: 276
      });
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('attributeCodes%5B%5D=OV1');
      expect(callUrl).toContain('attributeCodes%5B%5D=S');
      expect(callUrl).toContain('attributeCodes%5B%5D=P');
      expect(callUrl).toContain('attributeCodes%5B%5D=Pb');
    });

    it('should handle widget graph errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Widget not found' })
      });
      
      const result = await client.getWidgetGraph({
        siteId: 12345,
        attributeCodes: ['INVALID'],
        instance: 999
      });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('not_found');
    });
  });
  
  describe('error handling', () => {
    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({})
      });
      
      const result = await client.getUserMe();
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('rate_limited');
      expect(result.meta.rateLimited).toBe(true);
    });
    
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await client.getUserMe();
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('network_error');
      expect(result.error?.message).toContain('Network error');
    });
    
    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({})
      });
      
      const result = await client.getSystemOverview({ siteId: 99999 });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('not_found');
    });
    
    it('should handle bad request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ message: 'Invalid parameters' })
      });
      
      const result = await client.getStats({ siteId: 12345, type: 'venus' });
      
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('bad_request');
      expect(result.error?.message).toBe('Invalid parameters');
    });
  });
});