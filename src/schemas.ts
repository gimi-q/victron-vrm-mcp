import { z } from "zod";

export const toolSchemas = {
  "vrm.get_user_me": z.object({}).strict(),
  
  "vrm.list_installations": z.object({
    idUser: z.number().optional(),
    extended: z.boolean().optional()
  }).strict(),
  
  "vrm.get_system_overview": z.object({
    siteId: z.number()
  }).strict(),
  
  "vrm.get_stats": z.object({
    siteId: z.number(),
    type: z.enum(["venus", "live_feed", "consumption", "kwh", "solar_yield", "forecast"]),
    interval: z.string().optional(),
    start: z.number().optional(),
    end: z.number().optional()
  }).strict(),
  
  "vrm.get_overall_stats": z.object({
    siteId: z.number(),
    type: z.enum(["custom", "today", "yesterday", "month", "year"]).optional(),
    attributeCodes: z.array(z.string()).min(1),
    start: z.number().optional(),
    end: z.number().optional()
  }).strict(),
  
  "vrm.get_alarms": z.object({
    siteId: z.number(),
    activeOnly: z.boolean().optional(),
    page: z.number().min(1).optional(),
    pageSize: z.number().min(1).max(200).optional()
  }).strict(),
  
  "vrm.get_diagnostics": z.object({
    siteId: z.number(),
    count: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional()
  }).strict(),
  
  "vrm.get_widget_graph": z.object({
    siteId: z.number(),
    attributeCodes: z.array(z.string()).min(1),
    instance: z.number()
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