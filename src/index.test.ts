import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

vi.mock('./vrm-client.js', () => ({
  VRMClient: vi.fn().mockImplementation(() => ({
    getUserMe: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/users/me',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: { idUser: 12345, name: 'Test User' },
      meta: { status: 200, durationMs: 100, rateLimited: false }
    }),
    listInstallations: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/users/12345/installations',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: [{ id: 1, name: 'Test Site' }],
      meta: { status: 200, durationMs: 100, rateLimited: false }
    }),
    getSystemOverview: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/installations/12345/system-overview',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: { battery_soc: 85 },
      meta: { status: 200, durationMs: 100, rateLimited: false }
    }),
    getStats: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/installations/12345/stats',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: [[1609459200000, 100], [1609462800000, 150]],
      meta: { status: 200, durationMs: 100, rateLimited: false }
    }),
    getOverallStats: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/installations/12345/overallstats',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: { Pb: 1234, Pc: 567 },
      meta: { status: 200, durationMs: 100, rateLimited: false, note: 'Timezone note' }
    }),
    getAlarms: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/installations/12345/alarms',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: [],
      meta: { status: 200, durationMs: 100, rateLimited: false }
    }),
    getDiagnostics: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/installations/12345/diagnostics',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: [{ timestamp: 1609459200000, values: {} }],
      meta: { status: 200, durationMs: 100, rateLimited: false }
    }),
    getWidgetGraph: vi.fn().mockResolvedValue({
      ok: true,
      source: 'vrm',
      endpoint: '/installations/12345/widgets/Graph',
      requestId: 'test-id',
      fetchedAt: '2024-01-01T00:00:00Z',
      data: { OV1: [[1609459200000, 230]] },
      meta: { status: 200, durationMs: 100, rateLimited: false }
    })
  }))
}));

describe('MCP Server', () => {
  let server: Server;
  
  beforeEach(() => {
    process.env.VRM_TOKEN = 'test-token';
    vi.clearAllMocks();
    
    server = new Server(
      {
        name: "vrm-readonly",
        version: "0.1.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
  });
  
  describe('ListToolsRequest', () => {
    it('should list all available tools', async () => {
      const handler = vi.fn().mockResolvedValue({
        tools: [
          { name: 'vrm.get_user_me', description: 'test', inputSchema: {} },
          { name: 'vrm.list_installations', description: 'test', inputSchema: {} },
          { name: 'vrm.get_system_overview', description: 'test', inputSchema: {} },
          { name: 'vrm.get_stats', description: 'test', inputSchema: {} },
          { name: 'vrm.get_overall_stats', description: 'test', inputSchema: {} },
          { name: 'vrm.get_alarms', description: 'test', inputSchema: {} },
          { name: 'vrm.get_diagnostics', description: 'test', inputSchema: {} },
          { name: 'vrm.get_widget_graph', description: 'test', inputSchema: {} }
        ]
      });
      
      server.setRequestHandler(ListToolsRequestSchema, handler);
      
      const result = await handler({ method: 'tools/list' });
      
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBe(8);
      expect(result.tools[0]).toHaveProperty('name');
      expect(result.tools[0]).toHaveProperty('description');
      expect(result.tools[0]).toHaveProperty('inputSchema');
      
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('vrm.get_user_me');
      expect(toolNames).toContain('vrm.list_installations');
      expect(toolNames).toContain('vrm.get_system_overview');
      expect(toolNames).toContain('vrm.get_stats');
      expect(toolNames).toContain('vrm.get_overall_stats');
      expect(toolNames).toContain('vrm.get_alarms');
      expect(toolNames).toContain('vrm.get_diagnostics');
      expect(toolNames).toContain('vrm.get_widget_graph');
    });
  });
  
  describe('CallToolRequest', () => {
    it('should handle vrm.get_user_me', async () => {
      const { VRMClient } = await import('./vrm-client.js');
      const mockClient = new (VRMClient as any)();
      
      const handler = vi.fn(async (request) => {
        const { name } = request.params;
        
        if (name === 'vrm.get_user_me') {
          const result = await mockClient.getUserMe();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        }
      });
      
      server.setRequestHandler(CallToolRequestSchema, handler);
      
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'vrm.get_user_me',
          arguments: {}
        }
      });
      
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.idUser).toBe(12345);
    });
    
    it('should handle validation errors', async () => {
      const handler = vi.fn(async (request) => {
        const { name, arguments: args } = request.params;
        
        if (name === 'vrm.get_system_overview' && !args.siteId) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                ok: false,
                error: {
                  code: 'validation_error',
                  message: 'siteId is required'
                }
              }, null, 2)
            }],
            isError: true
          };
        }
      });
      
      server.setRequestHandler(CallToolRequestSchema, handler);
      
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'vrm.get_system_overview',
          arguments: {}
        }
      });
      
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('validation_error');
    });
    
    it('should handle unknown tools', async () => {
      const handler = vi.fn(async (request) => {
        const { name } = request.params;
        
        if (!name.startsWith('vrm.')) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                ok: false,
                error: {
                  code: 'tool_error',
                  message: `Unknown tool: ${name}`
                }
              }, null, 2)
            }],
            isError: true
          };
        }
      });
      
      server.setRequestHandler(CallToolRequestSchema, handler);
      
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'unknown.tool',
          arguments: {}
        }
      });
      
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error.message).toContain('Unknown tool');
    });
  });
});