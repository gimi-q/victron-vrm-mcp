#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VRMClient } from "./vrm-client.js";
import { toolSchemas, ToolName } from "./schemas.js";

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
  return {
    tools: [
      {
        name: "vrm.get_user_me",
        description: "Return the authenticated VRM user's profile (includes idUser).",
        inputSchema: toolSchemas["vrm.get_user_me"]
      },
      {
        name: "vrm.list_installations",
        description: "List installations for a user (uses /users/me if idUser omitted).",
        inputSchema: toolSchemas["vrm.list_installations"]
      },
      {
        name: "vrm.get_system_overview",
        description: "High-level snapshot for a site.",
        inputSchema: toolSchemas["vrm.get_system_overview"]
      },
      {
        name: "vrm.get_stats",
        description: "Time-series stats for a site (venus, live_feed, consumption, kwh, solar_yield, forecast).",
        inputSchema: toolSchemas["vrm.get_stats"]
      },
      {
        name: "vrm.get_overall_stats",
        description: "Aggregated totals for attribute codes over a period.",
        inputSchema: toolSchemas["vrm.get_overall_stats"]
      },
      {
        name: "vrm.get_alarms",
        description: "Retrieve alarms for a site.",
        inputSchema: toolSchemas["vrm.get_alarms"]
      },
      {
        name: "vrm.get_diagnostics",
        description: "Most recent diagnostic datapoints (raw).",
        inputSchema: toolSchemas["vrm.get_diagnostics"]
      },
      {
        name: "vrm.get_widget_graph",
        description: "Widget Graph data for device instance (attributeCodes[] + instance).",
        inputSchema: toolSchemas["vrm.get_widget_graph"]
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const toolName = name as ToolName;
    
    if (!(toolName in toolSchemas)) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    const schema = toolSchemas[toolName];
    const validatedArgs = schema.parse(args);
    
    let result;
    
    switch (toolName) {
      case "vrm.get_user_me":
        result = await vrmClient.getUserMe();
        break;
        
      case "vrm.list_installations":
        result = await vrmClient.listInstallations(validatedArgs as any);
        break;
        
      case "vrm.get_system_overview":
        result = await vrmClient.getSystemOverview(validatedArgs as any);
        break;
        
      case "vrm.get_stats":
        result = await vrmClient.getStats(validatedArgs as any);
        break;
        
      case "vrm.get_overall_stats":
        result = await vrmClient.getOverallStats(validatedArgs as any);
        break;
        
      case "vrm.get_alarms":
        result = await vrmClient.getAlarms(validatedArgs as any);
        break;
        
      case "vrm.get_diagnostics":
        result = await vrmClient.getDiagnostics(validatedArgs as any);
        break;
        
      case "vrm.get_widget_graph":
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
    const errorCode = error instanceof z.ZodError ? "validation_error" : "tool_error";
    
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
}

main().catch(console.error);