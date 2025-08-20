import { fetch } from "undici";
import { ToolInputs, VRMResponse } from "./schemas.js";

const ALLOWED_PATHS = [
  "/users/me",
  /^\/users\/\d+\/installations$/,
  /^\/installations\/\d+\/system-overview$/,
  /^\/installations\/\d+\/stats$/,
  /^\/installations\/\d+\/overallstats$/,
  /^\/installations\/\d+\/alarms$/,
  /^\/installations\/\d+\/diagnostics$/,
  /^\/installations\/\d+\/widgets\/Graph$/
];

export class VRMClient {
  private baseUrl: string;
  private token: string;
  private tokenKind: string;
  
  constructor() {
    this.baseUrl = process.env.VRM_BASE_URL || "https://vrmapi.victronenergy.com/v2";
    this.token = process.env.VRM_TOKEN || "";
    this.tokenKind = process.env.VRM_TOKEN_KIND || "Token";
    
    if (!this.token) {
      throw new Error("VRM_TOKEN environment variable is required");
    }
  }
  
  private getAuthHeaders() {
    return {
      "X-Authorization": `${this.tokenKind} ${this.token}`,
      "Accept": "application/json"
    };
  }
  
  private isAllowedPath(path: string): boolean {
    return ALLOWED_PATHS.some(pattern => {
      if (typeof pattern === "string") {
        return path === pattern;
      }
      return pattern.test(path);
    });
  }
  
  private async vrmGet(path: string, queryParams?: URLSearchParams): Promise<VRMResponse> {
    if (!this.isAllowedPath(path)) {
      throw new Error(`Disallowed path: ${path}`);
    }
    
    const url = `${this.baseUrl}${path}${queryParams ? `?${queryParams}` : ""}`;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders()
      });
      
      const durationMs = Date.now() - startTime;
      const body = await response.json().catch(() => ({})) as any;
      
      if (!response.ok) {
        let errorCode = "unknown_error";
        let errorMessage = `HTTP ${response.status}`;
        
        if (response.status === 401 || response.status === 403) {
          errorCode = "auth";
          errorMessage = "Authentication failed. Please check your VRM_TOKEN.";
        } else if (response.status === 404) {
          errorCode = "not_found";
          errorMessage = `Resource not found: ${path}`;
        } else if (response.status === 422 || response.status === 400) {
          errorCode = "bad_request";
          errorMessage = body.message || "Invalid request parameters";
        } else if (response.status === 429) {
          errorCode = "rate_limited";
          errorMessage = "Rate limited. Please try again later.";
        }
        
        return {
          ok: false,
          source: "vrm",
          endpoint: path,
          requestId,
          fetchedAt: new Date().toISOString(),
          data: body,
          meta: {
            status: response.status,
            durationMs,
            rateLimited: response.status === 429
          },
          error: {
            code: errorCode,
            message: errorMessage
          }
        };
      }
      
      return {
        ok: true,
        source: "vrm",
        endpoint: path,
        requestId,
        fetchedAt: new Date().toISOString(),
        data: body?.records || body,
        meta: {
          status: response.status,
          durationMs,
          rateLimited: false
        }
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        ok: false,
        source: "vrm",
        endpoint: path,
        requestId,
        fetchedAt: new Date().toISOString(),
        data: null,
        meta: {
          status: 0,
          durationMs,
          rateLimited: false
        },
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network request failed"
        }
      };
    }
  }
  
  async getUserMe(): Promise<VRMResponse> {
    return this.vrmGet("/users/me");
  }
  
  async listInstallations(params: ToolInputs["vrm.list_installations"]): Promise<VRMResponse> {
    let idUser = params.idUser;
    
    if (!idUser) {
      const userResponse = await this.getUserMe();
      if (!userResponse.ok || !userResponse.data?.idUser) {
        return {
          ...userResponse,
          error: {
            code: "user_fetch_failed",
            message: "Failed to fetch user ID"
          }
        };
      }
      idUser = userResponse.data.idUser;
    }
    
    const queryParams = new URLSearchParams();
    if (params.extended) {
      queryParams.append("extended", "1");
    }
    
    return this.vrmGet(`/users/${idUser}/installations`, queryParams);
  }
  
  async getSystemOverview(params: ToolInputs["vrm.get_system_overview"]): Promise<VRMResponse> {
    return this.vrmGet(`/installations/${params.siteId}/system-overview`);
  }
  
  async getStats(params: ToolInputs["vrm.get_stats"]): Promise<VRMResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("type", params.type);
    
    const interval = params.interval || "15mins";
    queryParams.append("interval", interval);
    if (params.start !== undefined) {
      queryParams.append("start", params.start.toString());
    }
    if (params.end !== undefined) {
      queryParams.append("end", params.end.toString());
    }
    
    return this.vrmGet(`/installations/${params.siteId}/stats`, queryParams);
  }
  
  async getOverallStats(params: ToolInputs["vrm.get_overall_stats"]): Promise<VRMResponse> {
    const queryParams = new URLSearchParams();
    
    const type = params.type || "custom";
    queryParams.append("type", type);
    
    params.attributeCodes.forEach(code => {
      queryParams.append("attributeCodes[]", code);
    });
    
    if (params.start !== undefined && type === "custom") {
      queryParams.append("start", params.start.toString());
    }
    if (params.end !== undefined && type === "custom") {
      queryParams.append("end", params.end.toString());
    }
    
    const response = await this.vrmGet(`/installations/${params.siteId}/overallstats`, queryParams);
    
    if (response.ok && (type === "today" || type === "yesterday" || type === "month" || type === "year")) {
      response.meta.note = "Time periods like 'today' may be calculated relative to UTC or server timezone, not the installation's local timezone.";
    }
    
    return response;
  }
  
  async getAlarms(params: ToolInputs["vrm.get_alarms"]): Promise<VRMResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.activeOnly) {
      queryParams.append("activeOnly", "true");
    }
    if (params.page !== undefined) {
      queryParams.append("page", params.page.toString());
    }
    if (params.pageSize !== undefined) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    
    return this.vrmGet(`/installations/${params.siteId}/alarms`, queryParams);
  }
  
  async getDiagnostics(params: ToolInputs["vrm.get_diagnostics"]): Promise<VRMResponse> {
    const queryParams = new URLSearchParams();
    
    const count = params.count || 200;
    queryParams.append("count", count.toString());
    if (params.offset !== undefined) {
      queryParams.append("offset", params.offset.toString());
    }
    
    return this.vrmGet(`/installations/${params.siteId}/diagnostics`, queryParams);
  }
  
  async getWidgetGraph(params: ToolInputs["vrm.get_widget_graph"]): Promise<VRMResponse> {
    const queryParams = new URLSearchParams();
    
    params.attributeCodes.forEach(code => {
      queryParams.append("attributeCodes[]", code);
    });
    queryParams.append("instance", params.instance.toString());
    
    const response = await this.vrmGet(`/installations/${params.siteId}/widgets/Graph`, queryParams);
    
    if (response.ok && (!response.data || Object.keys(response.data).length === 0)) {
      response.meta.note = "Widget returned empty data. Consider using get_diagnostics or get_stats for this data instead.";
    }
    
    return response;
  }
}