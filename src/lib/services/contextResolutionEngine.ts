import { adminDb } from '../firebase-admin';
import { WorkspaceRepository, WorkspaceDocument } from '../db/workspaceRepository';
import { WorkspaceMembershipRepository, WorkspaceMembershipDocument } from '../db/workspaceMembershipRepository';
import { WorkspaceBindingRepository, WorkspaceBindingDocument } from '../db/workspaceBindingRepository';

export interface RequestContext {
  workspaceId: string;
  actorId: string;          // The active participant Person ID (or User ID)
  channel: 'web' | 'mobile' | 'api' | 'agent';
  locale?: string;
  impersonatorId?: string;  // Supporting admin impersonation audits
}

import type {
  ActorContext,
  SelectorContext,
  PresentationContext,
  GeneralResolveRequest,
  ResolvedContextPackage
} from '@/contracts/index';

export type {
  ActorContext,
  SelectorContext,
  PresentationContext,
  GeneralResolveRequest,
  ResolvedContextPackage
};

// Custom Typed Domain Errors
export class UnsupportedContextTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedContextTypeError';
  }
}

export class ContextAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextAccessDeniedError';
  }
}

export class ContextNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextNotFoundError';
  }
}

export class ContextInvalidRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextInvalidRequestError';
  }
}

const ROLE_ACTIONS_MAP: Record<string, string[]> = {
  owner: ['inviteMembers', 'revokeMembership', 'bindEntity', 'archiveWorkspace', 'sendMessage', 'vote', 'editBudget'],
  coordinator: ['inviteMembers', 'revokeMembership', 'bindEntity', 'sendMessage', 'vote', 'editBudget'],
  member: ['sendMessage', 'vote'],
  viewer: []
};

const ROLE_MODULES_MAP: Record<string, string[]> = {
  owner: ['chat', 'calendar', 'voting', 'budget'],
  coordinator: ['chat', 'calendar', 'voting', 'budget'],
  member: ['chat', 'calendar', 'voting'],
  viewer: ['chat', 'calendar']
};

const VALID_CLIENT_TYPES = ['native_mobile', 'web', 'iot', 'api', 'agent'];
const VALID_SURFACES = ['supply_app', 'consumer_app', 'concierge_console', 'operator_web'];
const VALID_CHANNELS = ['interactive', 'headless', 'api', 'agent'];

export function validatePresentationContext(pc: PresentationContext) {
  if (!VALID_CLIENT_TYPES.includes(pc.clientType)) {
    throw new ContextInvalidRequestError(`Invalid presentation clientType: ${pc.clientType}`);
  }
  if (!VALID_SURFACES.includes(pc.surface)) {
    throw new ContextInvalidRequestError(`Invalid presentation surface: ${pc.surface}`);
  }
  if (!VALID_CHANNELS.includes(pc.channel)) {
    throw new ContextInvalidRequestError(`Invalid presentation channel: ${pc.channel}`);
  }
}

type ContextResolverFn = (
  actorId: string,
  contextId: string,
  presentationContext: PresentationContext,
  impersonatorId?: string
) => Promise<ResolvedContextPackage>;

const contextResolvers: Record<string, ContextResolverFn> = {
  workspace: resolveWorkspaceContext,
  assignment: resolveAssignmentContext,
};

export class ContextResolutionEngine {
  // Check if a person is a Platform Admin
  private static async isPlatformAdmin(personId: string): Promise<boolean> {
    const snap = await adminDb.collection('role_assignments')
      .where('personId', '==', personId)
      .where('scopeType', '==', 'platform')
      .get();
    
    if (snap.empty) return false;

    return snap.docs.some(doc => {
      const data = doc.data();
      const roleId = data.roleId || '';
      return roleId === 'role_admin' || roleId === 'role_super_admin' || roleId.includes('admin');
    });
  }

  // Legacy wrapper mapping RequestContext to the new generalized resolve method
  static async resolveContext(request: RequestContext): Promise<ResolvedContextPackage> {
    return this.resolve({
      actor: { type: 'person', id: request.actorId },
      context: { type: 'workspace', id: request.workspaceId },
      presentationContext: {
        clientType: request.channel === 'mobile' ? 'native_mobile' : 'web',
        surface: request.channel === 'mobile' ? 'supply_app' : 'operator_web',
        channel: 'interactive',
      },
      impersonatorId: request.impersonatorId
    });
  }

  // Generalized context resolver entry point using context-handler registry
  static async resolve(req: GeneralResolveRequest): Promise<ResolvedContextPackage> {
    // 1. Validate presentation inputs
    validatePresentationContext(req.presentationContext);

    // 2. Dispatch through registered context handler
    const resolver = contextResolvers[req.context.type];
    if (!resolver) {
      throw new UnsupportedContextTypeError(`Context type '${req.context.type}' is not supported.`);
    }

    // Resolve personId if actor type is person and starts with uid
    let actorId = req.actor.id;
    if (req.actor.type === 'person' && !actorId.startsWith('pers_')) {
      const userDoc = await adminDb.collection('users').doc(actorId).get();
      if (userDoc.exists) {
        actorId = userDoc.data()?.personId || actorId;
      }
    }

    return resolver(actorId, req.context.id, req.presentationContext, req.impersonatorId);
  }

  // Explicit security boundary authorization checker for operational assignments
  static async verifyAssignmentAccess(personId: string, assignmentId: string): Promise<boolean> {
    const assignmentSnap = await adminDb.collection('assignments').doc(assignmentId).get();
    if (!assignmentSnap.exists) return false;
    const assignmentData = assignmentSnap.data();
    if (!assignmentData) return false;

    // Enforce: Assignment pending/accepted/active/upcoming (not declined)
    if (assignmentData.status === 'declined') return false;

    // Enforce: Crew Resource still linked and status is active
    const resourceSnap = await adminDb.collection('resources').doc(assignmentData.resourceId).get();
    if (!resourceSnap.exists) return false;
    const resourceData = resourceSnap.data();
    if (!resourceData) return false;
    if (resourceData.type !== 'crew' || resourceData.status !== 'active') return false;
    if (resourceData.humanConfig?.personId !== personId) return false;

    // Enforce: Itinerary not cancelled
    const itinerarySnap = await adminDb.collection('operational_itineraries').doc(assignmentData.itineraryId).get();
    if (!itinerarySnap.exists) return false;
    const itineraryData = itinerarySnap.data();
    if (!itineraryData || itineraryData.status === 'cancelled') return false;

    // Enforce: Assignment access window still valid (+/- 48h grace)
    const stops = itineraryData.stops || [];
    if (stops.length > 0) {
      const sortedArrivals = stops.map((s: any) => new Date(s.targetArrival).getTime()).sort();
      const sortedDepartures = stops.map((s: any) => new Date(s.targetDeparture).getTime()).sort();
      const firstArrival = sortedArrivals[0];
      const lastDeparture = sortedDepartures[sortedDepartures.length - 1];

      const now = Date.now();
      const graceBefore = 48 * 60 * 60 * 1000;
      const graceAfter = 48 * 60 * 60 * 1000;

      if (now < firstArrival - graceBefore || now > lastDeparture + graceAfter) {
        return false;
      }
    }

    return true;
  }
}

// Private Context Resolvers registered above

async function resolveWorkspaceContext(
  personId: string,
  workspaceId: string,
  presentationContext: PresentationContext,
  impersonatorId?: string
): Promise<ResolvedContextPackage> {
  const ws = await WorkspaceRepository.findById(workspaceId);
  if (!ws) {
    throw new ContextNotFoundError('Workspace not found');
  }
  if (ws.status === 'suspended') {
    throw new ContextAccessDeniedError('Workspace is suspended');
  }
  if (ws.status !== 'active' && ws.status !== 'archived' && ws.status !== 'provisioning') {
    throw new ContextAccessDeniedError('Workspace is inactive');
  }

  if (impersonatorId) {
    const isAdmin = await (ContextResolutionEngine as any).isPlatformAdmin(impersonatorId);
    if (!isAdmin) {
      throw new ContextAccessDeniedError('Unauthorized: Impersonator does not have Platform Admin permissions');
    }
  }

  const membership = await WorkspaceMembershipRepository.findByWorkspaceAndPerson(workspaceId, personId);
  
  let role: 'owner' | 'coordinator' | 'member' | 'viewer' | null = null;
  
  if (membership && membership.status === 'active') {
    role = membership.role as 'owner' | 'coordinator' | 'member' | 'viewer';
  } else {
    const configSnap = await adminDb.collection('workspace_configurations').doc(workspaceId).get();
    if (configSnap.exists) {
      const configData = configSnap.data();
      const orgId = configData?.identity?.operatorOrgId || 'org-whiskey';
      
      const roleSnap = await adminDb.collection('role_assignments')
        .where('personId', '==', personId)
        .where('scopeId', '==', orgId)
        .limit(1)
        .get();
        
      if (!roleSnap.empty) {
        const roleData = roleSnap.docs[0].data();
        const roleId = roleData.roleId || '';
        if (roleId === 'role_owner' || roleId.includes('owner')) {
          role = 'owner';
        } else if (roleId === 'role_admin' || roleId.includes('admin') || roleId.includes('coordinator')) {
          role = 'coordinator';
        } else if (roleId.includes('member') || roleId.includes('staff')) {
          role = 'member';
        } else {
          role = 'viewer';
        }
      }
    }
  }

  if (!role) {
    const resourceSnap = await adminDb.collection('resources')
      .where('type', '==', 'crew')
      .where('humanConfig.personId', '==', personId)
      .where('status', '==', 'active')
      .get();

    if (!resourceSnap.empty) {
      const resourceIds = resourceSnap.docs.map(d => d.id);
      const assignmentsSnap = await adminDb.collection('assignments')
        .where('resourceId', 'in', resourceIds)
        .get();

      for (const aDoc of assignmentsSnap.docs) {
        const aData = aDoc.data();
        if (aData && aData.status !== 'declined') {
          const itinerarySnap = await adminDb.collection('operational_itineraries').doc(aData.itineraryId).get();
          if (itinerarySnap.exists) {
            const itineraryData = itinerarySnap.data();
            if (itineraryData && itineraryData.status !== 'cancelled' && itineraryData.bookingId) {
              const bindingsSnap = await adminDb.collection('workspace_bindings')
                .where('workspaceId', '==', workspaceId)
                .where('entityType', '==', 'Booking')
                .where('entityId', '==', itineraryData.bookingId)
                .limit(1)
                .get();

              if (!bindingsSnap.empty) {
                const stops = itineraryData.stops || [];
                if (stops.length > 0) {
                  const sortedArrivals = stops.map((s: any) => new Date(s.targetArrival).getTime()).sort();
                  const sortedDepartures = stops.map((s: any) => new Date(s.targetDeparture).getTime()).sort();
                  const firstArrival = sortedArrivals[0];
                  const lastDeparture = sortedDepartures[sortedDepartures.length - 1];

                  const now = Date.now();
                  const graceBefore = 48 * 60 * 60 * 1000;
                  const graceAfter = 48 * 60 * 60 * 1000;

                  if (now >= firstArrival - graceBefore && now <= lastDeparture + graceAfter) {
                    role = 'viewer';
                    break;
                  }
                } else {
                  role = 'viewer';
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  if (!role) {
    const isPlatformAdminActor = await (ContextResolutionEngine as any).isPlatformAdmin(personId);
    if (isPlatformAdminActor) {
      role = 'owner';
    } else {
      throw new ContextAccessDeniedError('Unauthorized: Actor has no active membership or role in this workspace context');
    }
  }

  const activeWorkspaceModules = ws.status === 'archived' 
    ? ['chat'] 
    : (ws.modules || ['chat', 'calendar', 'voting', 'budget']);
  const allowedModulesForRole = ROLE_MODULES_MAP[role] || [];
  
  const visibleModules = activeWorkspaceModules
    .filter(modId => allowedModulesForRole.includes(modId))
    .map(modId => ({
      moduleId: modId,
      state: ws.status === 'archived' ? ('read-only' as const) : ('active' as const)
    }));

  const allowedActions = ws.status === 'archived' ? [] : (ROLE_ACTIONS_MAP[role] || []);

  const allBindings = await WorkspaceBindingRepository.listByWorkspace(workspaceId);
  const filteredBindings = allBindings
    .filter(binding => {
      const visibility = binding.config?.visibility;
      if (!visibility || visibility.includes('*')) return true;
      return visibility.includes(role);
    })
    .map(binding => ({
      bindingId: binding.id,
      entityType: binding.entityType,
      entityId: binding.entityId,
      config: {
        presentation: binding.config?.presentation || {},
        commercial: binding.config?.commercial || {},
        operational: binding.config?.operational || {}
      }
    }));

  return {
    workspace: {
      id: ws.id,
      objectiveTemplate: ws.objectiveTemplate,
      governance: {
        privacy: ws.governance.privacy,
        allowAiAgents: ws.governance.allowAiAgents
      }
    },
    perspective: {
      role,
      visibleModules,
      allowedActions
    },
    bindings: filteredBindings
  };
}

async function resolveAssignmentContext(
  personId: string,
  assignmentId: string,
  presentationContext: PresentationContext,
  impersonatorId?: string
): Promise<ResolvedContextPackage> {
  const isAuthorized = await ContextResolutionEngine.verifyAssignmentAccess(personId, assignmentId);
  if (!isAuthorized) {
    throw new ContextAccessDeniedError('Unauthorized: Actor does not have active authorized access to this assignment context');
  }

  const assignmentSnap = await adminDb.collection('assignments').doc(assignmentId).get();
  const assignmentData = assignmentSnap.data();
  if (!assignmentData) {
    throw new ContextNotFoundError('Assignment not found');
  }

  const itinerarySnap = await adminDb.collection('operational_itineraries').doc(assignmentData.itineraryId).get();
  const itineraryData = itinerarySnap.data();
  if (!itineraryData) {
    throw new ContextNotFoundError('Operational Itinerary not found');
  }

  return {
    workspace: {
      id: `assignment_${assignmentId}`,
      governance: {
        privacy: 'private',
        allowAiAgents: false
      }
    },
    perspective: {
      role: 'viewer',
      visibleModules: [
        { moduleId: 'chat', state: 'active' },
        { moduleId: 'calendar', state: 'active' }
      ],
      allowedActions: ['sendMessage']
    },
    bindings: [
      {
        bindingId: `binding_itinerary_${assignmentData.itineraryId}`,
        entityType: 'OperationalItinerary',
        entityId: assignmentData.itineraryId,
        config: {
          operational: {
            stops: itineraryData.stops || [],
            vesselId: itineraryData.vesselId
          }
        }
      }
    ]
  };
}
