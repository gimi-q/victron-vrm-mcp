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
  });
  
  describe('getWidgetGraph', () => {
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