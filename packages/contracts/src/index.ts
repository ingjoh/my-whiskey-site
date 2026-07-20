export type ContextType = 'workspace' | 'assignment' | 'traveler_trip';
export type ClientType = 'native_mobile' | 'web' | 'iot' | 'api' | 'agent';
export type Surface = 'supply_app' | 'consumer_app' | 'concierge_console' | 'operator_web';
export type Channel = 'interactive' | 'headless' | 'api' | 'agent';

export type AllowedAction =
  | 'inviteMembers'
  | 'revokeMembership'
  | 'bindEntity'
  | 'archiveWorkspace'
  | 'sendMessage'
  | 'vote'
  | 'editBudget';

export interface VisibleModule {
  moduleId: string;
  state: 'active' | 'read-only' | 'locked' | 'closed';
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ActorContext {
  type: 'person' | 'device';
  id: string;
}

export interface SelectorContext {
  type: ContextType;
  id: string;
}

export interface PresentationContext {
  clientType: ClientType;
  surface: Surface;
  channel: Channel;
  locale?: string;
}

export interface GeneralResolveRequest {
  actor: ActorContext;
  context: SelectorContext;
  presentationContext: PresentationContext;
  impersonatorId?: string;
}

export interface ResolveContextRequest {
  context: {
    type: ContextType;
    id: string;
  };
  clientType: ClientType;
  surface: Surface;
  channel: Channel;
  locale?: string;
}

export interface ResolvedContextPackage {
  workspace: {
    id: string;
    objectiveTemplate?: string;
    governance: {
      privacy: 'private' | 'shared' | 'public';
      allowAiAgents: boolean;
    };
  };
  perspective: {
    role: 'owner' | 'coordinator' | 'member' | 'viewer';
    visibleModules: VisibleModule[];
    allowedActions: string[];
  };
  bindings: Array<{
    bindingId: string;
    entityType: string;
    entityId: string;
    config: {
      presentation?: Record<string, any>;
      commercial?: Record<string, any>;
      operational?: Record<string, any>;
    };
  }>;
}
