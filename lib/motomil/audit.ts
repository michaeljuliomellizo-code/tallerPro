import { createClient } from '@/lib/supabase/client';
export async function auditEvent(params:{organizationId:string;eventType:string;entityType:string;entityId?:string|null;details?:Record<string,unknown>}){
  const s=createClient();
  const {error}=await s.from('audit_logs').insert({organization_id:params.organizationId,event_type:params.eventType,entity_type:params.entityType,entity_id:params.entityId??null,details:params.details??{}});
  if(error) throw error;
}
