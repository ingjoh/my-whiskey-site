import { adminDb } from '../firebase-admin';
import { WorkspaceRepository, WorkspaceDocument } from '../db/workspaceRepository';
import { WorkspaceMembershipRepository, WorkspaceMembershipDocument } from '../db/workspaceMembershipRepository';
import { WorkspaceBindingRepository, WorkspaceBindingDocument } from '../db/workspaceBindingRepository';

export interface RequestContext {
  workspaceId: string;
  actorId: string;          // The active participant Person ID
  channel: 'web' | 'mobile' | 'api' | 'agent';
  locale?: string;
  impersonatorId?: string;  // Supporting admin impersonation audits
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
    visibleModules: Array<{
      moduleId: string;
      state: 'active' | 'read-only' | 'locked' | 'closed';
    }>;
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

const ROLE_ACTIONS_MAP: Record<string, string[]> = {
  owner: ['inviteMembers', 'revokeMembership', 'bindEntity', 'archiveWorkspace', 'sendMessage', 'vote', 'editBudget'],
  coordinator: ['inviteMembers', 'revokeMembership', 'bindEntity', 'sendMessage', 'vote', 'editBudget'],
  member: ['sendMessage', 'vote'],
  viewer: []
};

// Modules visibility rules mapping roles to allowed modules
const ROLE_MODULES_MAP: Record<string, string[]> = {
  owner: ['chat', 'calendar', 'voting', 'budget'],
  coordinator: ['chat', 'calendar', 'voting', 'budget'],
  member: ['chat', 'calendar', 'voting'],
  viewer: ['chat', 'calendar']
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

  // Authoritative, deterministic, and side-effect free context resolution
  static async resolveContext(context: RequestContext): Promise<ResolvedContextPackage> {
    const { workspaceId, actorId, impersonatorId } = context;

    // 1. Retrieve Workspace
    const ws = await WorkspaceRepository.findById(workspaceId);
    if (!ws || (ws.status !== 'active' && ws.status !== 'archived')) {
      throw new Error('Workspace not found or inactive');
    }

    // 2. Impersonator Authorization Check (must not grant authority by itself)
    if (impersonatorId) {
      const isAdmin = await this.isPlatformAdmin(impersonatorId);
      if (!isAdmin) {
        throw new Error('Unauthorized: Impersonator does not have Platform Admin permissions');
      }
    }

    // 3. Retrieve membership for the target actorId
    const membership = await WorkspaceMembershipRepository.findByWorkspaceAndPerson(workspaceId, actorId);
    if (!membership || membership.status !== 'active') {
      throw new Error('Unauthorized: Actor has no active membership in this workspace');
    }

    const role = membership.role;

    // 4. Resolve visible modules
    const activeWorkspaceModules = ws.status === 'archived' ? ['chat'] : ['chat', 'calendar', 'voting', 'budget'];
    const allowedModulesForRole = ROLE_MODULES_MAP[role] || [];
    
    const visibleModules = activeWorkspaceModules
      .filter(modId => allowedModulesForRole.includes(modId))
      .map(modId => ({
        moduleId: modId,
        // If archived, set all modules to read-only
        state: ws.status === 'archived' ? ('read-only' as const) : ('active' as const)
      }));

    // 5. Resolve allowed actions
    const allowedActions = ws.status === 'archived' ? [] : (ROLE_ACTIONS_MAP[role] || []);

    // 6. Retrieve and filter entity bindings
    const allBindings = await WorkspaceBindingRepository.listByWorkspace(workspaceId);
    const filteredBindings = allBindings
      .filter(binding => {
        const visibility = binding.config?.visibility;
        // Default: visible to everyone
        if (!visibility || visibility.includes('*')) return true;
        // Check if role is authorized
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
}
