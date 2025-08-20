#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { VRMClient } from "./vrm-client.js";

const server = new Server(
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

const vrmClient = new VRMClient();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
      {
        name: "vrm_get_user_me",
        description: "Get your VRM account information and user profile.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "vrm_list_installations",
        description: "List all your Victron energy installations/sites (solar systems, batteries, etc.).",
        inputSchema: {
          type: "object",
          properties: {
            idUser: { type: "number", description: "User ID (optional - will auto-detect if not provided)" },
            extended: { type: "boolean", description: "Include extended information about installations" }
          },
          additionalProperties: false
        }
      },
      {
        name: "vrm_get_system_overview",
        description: "Get current status of your energy system including battery level, solar production, consumption, and grid usage.",
        inputSchema: {
          type: "object",
          required: ["siteId"],
          properties: {
            siteId: { type: "number", description: "Installation/site ID to get overview for" }
          },
          additionalProperties: false
        }
      },
      {
        name: "vrm_get_stats",
        description: "Get time-series data for solar production, battery usage, consumption, energy yield, and forecasts over time.",
        inputSchema: {
          type: "object",
          required: ["siteId", "type"],
          properties: {
            siteId: { type: "number", description: "Installation/site ID" },
            type: { type: "string", enum: ["venus", "live_feed", "consumption", "kwh", "solar_yield", "forecast"], description: "Type of stats to retrieve" },
            interval: { type: "string", description: "Time interval (e.g., '15mins', 'hours', 'days')", default: "15mins" },
            start: { type: "number", description: "Start time as epoch milliseconds" },
            end: { type: "number", description: "End time as epoch milliseconds" }
          },
          additionalProperties: false
        }
      },
      {
        name: "vrm_get_overall_stats",
        description: "Get aggregated energy totals (daily, monthly, yearly) for solar yield, consumption, battery performance, etc.",
        inputSchema: {
          type: "object",
          required: ["siteId", "attributeCodes"],
          properties: {
            siteId: { type: "number", description: "Installation/site ID" },
            type: { type: "string", enum: ["custom", "today", "yesterday", "month", "year"], description: "Time period type", default: "custom" },
            attributeCodes: { type: "array", items: { type: "string" }, minItems: 1, description: "Array of attribute codes to get totals for (e.g., ['Pb', 'Pc', 'kwh'])" },
            start: { type: "number", description: "Start time as epoch milliseconds (for custom type)" },
            end: { type: "number", description: "End time as epoch milliseconds (for custom type)" }
          },
          additionalProperties: false
        }
      },
      {
        name: "vrm_get_alarms",
        description: "Check for any system alarms or alerts from your solar/battery installation.",
        inputSchema: {
          type: "object",
          required: ["siteId"],
          properties: {
            siteId: { type: "number", description: "Installation/site ID" },
            activeOnly: { type: "boolean", description: "Show only active alarms", default: false },
            page: { type: "number", minimum: 1, description: "Page number for pagination" },
            pageSize: { type: "number", minimum: 1, maximum: 200, description: "Number of alarms per page" }
          },
          additionalProperties: false
        }
      },
      {
        name: "vrm_get_diagnostics",
        description: "Get detailed diagnostic data and technical readings from your energy system devices.",
        inputSchema: {
          type: "object",
          required: ["siteId"],
          properties: {
            siteId: { type: "number", description: "Installation/site ID" },
            count: { type: "number", minimum: 1, maximum: 1000, description: "Number of diagnostic records to retrieve", default: 200 },
            offset: { type: "number", minimum: 0, description: "Offset for pagination" }
          },
          additionalProperties: false
        }
      },
      {
        name: "vrm_get_widget_graph",
        description: "Get specific device performance graphs (battery voltage, inverter output, solar panel data, etc.).",
        inputSchema: {
          type: "object",
          required: ["siteId", "attributeCodes", "instance"],
          properties: {
            siteId: { type: "number", description: "Installation/site ID" },
            attributeCodes: { type: "array", items: { type: "string" }, minItems: 1, description: "Array of attribute codes for the graph data" },
            instance: { type: "number", description: "Device instance ID" }
          },
          additionalProperties: false
        }
      }
    ];
  
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const toolName = name;
    
    // List of valid tool names
    const validTools = [
      "vrm_get_user_me",
      "vrm_list_installations", 
      "vrm_get_system_overview",
      "vrm_get_stats",
      "vrm_get_overall_stats",
      "vrm_get_alarms",
      "vrm_get_diagnostics",
      "vrm_get_widget_graph"
    ];
    
    if (!validTools.includes(toolName)) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    // Use args directly since JSON Schema validation is handled by MCP
    const validatedArgs = args || {};
    
    let result;
    
    switch (toolName) {
      case "vrm_get_user_me":
        result = await vrmClient.getUserMe();
        break;
        
      case "vrm_list_installations":
        result = await vrmClient.listInstallations(validatedArgs as any);
        break;
        
      case "vrm_get_system_overview":
        result = await vrmClient.getSystemOverview(validatedArgs as any);
        break;
        
      case "vrm_get_stats":
        result = await vrmClient.getStats(validatedArgs as any);
        break;
        
      case "vrm_get_overall_stats":
        result = await vrmClient.getOverallStats(validatedArgs as any);
        break;
        
      case "vrm_get_alarms":
        result = await vrmClient.getAlarms(validatedArgs as any);
        break;
        
      case "vrm_get_diagnostics":
        result = await vrmClient.getDiagnostics(validatedArgs as any);
        break;
        
      case "vrm_get_widget_graph":
        result = await vrmClient.getWidgetGraph(validatedArgs as any);
        break;
        
      default:
        throw new Error(`Unhandled tool: ${name}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = "tool_error";
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ok: false,
            error: {
              code: errorCode,
              message: errorMessage
            }
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("VRM MCP Server started");
  
  // Handle process termination gracefully
  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully');
    process.exit(0);
  });
  
  // Handle unhandled errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Failed to start VRM MCP Server:', error);
  process.exit(1);
});