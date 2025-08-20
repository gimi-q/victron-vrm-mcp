import { z } from "zod";

export const toolSchemas = {
  // Existing endpoints
  "vrm_get_user_me": z.object({}).strict(),
  
  "vrm_list_installations": z.object({
    idUser: z.number().optional(),
    extended: z.boolean().optional()
  }).strict(),
  
  "vrm_get_system_overview": z.object({
    siteId: z.number()
  }).strict(),
  
  "vrm_get_stats": z.object({
    siteId: z.number(),
    type: z.enum(["venus", "live_feed", "consumption", "kwh", "solar_yield", "forecast"]),
    interval: z.string().optional(),
    start: z.number().optional(),
    end: z.number().optional()
  }).strict(),
  
  "vrm_get_overall_stats": z.object({
    siteId: z.number(),
    type: z.enum(["custom", "today", "yesterday", "month", "year"]).optional(),
    attributeCodes: z.array(z.string()).min(1),
    start: z.number().optional(),
    end: z.number().optional()
  }).strict(),
  
  "vrm_get_alarms": z.object({
    siteId: z.number(),
    activeOnly: z.boolean().optional(),
    page: z.number().min(1).optional(),
    pageSize: z.number().min(1).max(200).optional()
  }).strict(),
  
  "vrm_get_diagnostics": z.object({
    siteId: z.number(),
    count: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional()
  }).strict(),
  
  "vrm_get_widget_graph": z.object({
    siteId: z.number(),
    attributeCodes: z.array(z.string()).min(1),
    instance: z.number()
  }).strict(),
  
  // Batch 1: Authentication & User Management
  "vrm_auth_login_as_demo": z.object({}).strict(),
  
  "vrm_auth_logout": z.object({}).strict(),
  
  "vrm_get_user_access_tokens": z.object({
    idUser: z.number()
  }).strict(),
  
  "vrm_search_user_installations": z.object({
    idUser: z.number(),
    query: z.string().optional(),
    limit: z.number().min(1).max(100).optional()
  }).strict(),
  
  // Batch 2: Installation Data & Downloads
  "vrm_download_installation_data": z.object({
    siteId: z.number(),
    start: z.number().optional(),
    end: z.number().optional(),
    datatype: z.enum(["log", "benchmark", "kwh"]).optional(),
    format: z.enum(["csv", "excelxml", "xls", "xlsx"]).optional(),
    decode: z.boolean().optional()
  }).strict(),
  
  "vrm_download_gps_data": z.object({
    siteId: z.number(),
    start: z.number().optional(),
    end: z.number().optional()
  }).strict(),
  
  "vrm_get_installation_tags": z.object({
    siteId: z.number()
  }).strict(),
  
  "vrm_get_custom_widget": z.object({
    siteId: z.number()
  }).strict(),
  
  "vrm_get_dynamic_ess_settings": z.object({
    siteId: z.number()
  }).strict(),
  
  // Batch 8: System-Wide Endpoints (High Priority)
  "vrm_get_data_attributes": z.object({
    filter: z.string().optional(),
    sort: z.string().optional(),
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional()
  }).strict(),
  
  "vrm_get_firmwares": z.object({
    type: z.string().optional(),
    version: z.string().optional()
  }).strict(),

  // Batch 3: Installation Management  
  "vrm_get_reset_forecasts": z.object({
    siteId: z.number()
  }).strict(),

  // Batch 4: Widget State Endpoints
  "vrm_get_vebus_state": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_inverter_charger_state": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_charger_relay_state": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_solar_charger_relay_state": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_gateway_relay_state": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_gateway_relay_two_state": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_status_widget": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  // Batch 5: Widget Warnings & Alarms
  "vrm_get_vebus_warnings_alarms": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_inverter_charger_warnings_alarms": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  // Batch 6: Widget Summary Endpoints
  "vrm_get_battery_summary": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_solar_charger_summary": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_ev_charger_summary": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_global_link_summary": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_motor_summary": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_pv_inverter_status": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_tank_summary": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_temp_summary_graph": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_dc_meter": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  // Batch 7: Widget Diagnostics & Data
  "vrm_get_bms_diagnostics": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_lithium_bms": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_historic_data": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict(),

  "vrm_get_io_extender": z.object({
    siteId: z.number(),
    instance: z.number().optional()
  }).strict()
};

export type ToolName = keyof typeof toolSchemas;

export type ToolInputs = {
  [K in ToolName]: z.infer<typeof toolSchemas[K]>;
};

export interface VRMResponse<T = any> {
  ok: boolean;
  source: "vrm";
  endpoint: string;
  requestId: string;
  fetchedAt: string;
  data: T;
  meta: {
    status: number;
    durationMs: number;
    rateLimited: boolean;
    note?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}