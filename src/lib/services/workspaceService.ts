import { WorkspaceRepository, WorkspaceDocument } from '../db/workspaceRepository';
import { WorkspaceMembershipRepository, WorkspaceMembershipDocument } from '../db/workspaceMembershipRepository';
import { WorkspaceBindingRepository, WorkspaceBindingDocument } from '../db/workspaceBindingRepository';
import { WorkspaceAuditEventRepository, WorkspaceAuditEventDocument } from '../db/workspaceAuditEventRepository';
import * as fs from 'fs';
import * as path from 'path';
import { adminDb } from '../firebase-admin';

// Helper to generate UUIDs
function generateUUID(prefix: string): string {
  const tst = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}_${tst}`;
}

export class WorkspaceService {
  // Parses knowledge/index.yaml to find registered concepts
  static validateEntityTypeAgainstRegistry(entityType: string): boolean {
    try {
      const registryPath = path.resolve(process.cwd(), 'knowledge/index.yaml');
      if (!fs.existsSync(registryPath)) return false;
      const content = fs.readFileSync(registryPath, 'utf8');
      const lines = content.split('\n');
      
      const concepts = new Set<string>();
      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const indent = line.length - line.trimStart().length;
        if (indent === 0) {
          const key = trimmed.split(':')[0].trim();
          if (key) concepts.add(key);
        }
      }
      
      return concepts.has(entityType);
    } catch (err) {
      console.error('Failed to validate entity type against registry:', err);
      return false;
    }
  }

  // Verifies that the target entity actually exists in Firestore
  static async verifyEntityExists(entityType: string, entityId: string): Promise<boolean> {
    let collectionName = entityType.toLowerCase() + 's';
    if (entityType === 'Person') {
      collectionName = 'people';
    } else if (entityType === 'ItineraryTemplate') {
      collectionName = 'itinerary_templates';
    } else if (entityType === 'OperationalItinerary') {
      collectionName = 'operational_itineraries';
    } else if (entityType === 'InventoryAllocation') {
      collectionName = 'inventory_allocations';
    } else if (entityType === 'RoleAssignment') {
      collectionName = 'role_assignments';
    }

    try {
      const doc = await adminDb.collection(collectionName).doc(entityId).get();
      return doc.exists;
    } catch (err) {
      console.error(`Error verifying entity existence for ${entityType}/${entityId}:`, err);
      return false;
    }
  }

  // Intent: create workspace
  static async createWorkspace(ownerPersonId: string, templateId?: string, governance?: Partial<WorkspaceDocument['governance']>): Promise<string> {
    const wsId = generateUUID('ws');
    const now = new Date().toISOString();

    const gov: WorkspaceDocument['governance'] = {
      privacy: governance?.privacy || 'private',
      allowAiAgents: governance?.allowAiAgents ?? false,
      allowExternalInvites: governance?.allowExternalInvites ?? true
    };
    if (governance?.dataRetentionDays !== undefined) {
      gov.dataRetentionDays = governance.dataRetentionDays;
    }

    const workspaceDoc: WorkspaceDocument = {
      id: wsId,
      createdAt: now,
      updatedAt: now,
      objectiveTemplate: templateId,
      governance: gov,
      status: 'active'
    };

    // Create workspace
    await WorkspaceRepository.create(workspaceDoc);

    // Automatically join the creator as 'owner' / 'active'
    const membershipId = generateUUID('wsm');
    const membershipDoc: WorkspaceMembershipDocument = {
      id: membershipId,
      workspaceId: wsId,
      personId: ownerPersonId,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    await WorkspaceMembershipRepository.create(membershipDoc);

    // Record audit event
    await WorkspaceAuditEventRepository.create({
      id: generateUUID('wsa'),
      workspaceId: wsId,
      eventType: 'WorkspaceCreated',
      actorId: ownerPersonId,
      details: { objectiveTemplate: templateId, governance: workspaceDoc.governance },
      timestamp: now
    });

    return wsId;
  }

  // Intent: invite member
  static async inviteMember(workspaceId: string, inviterId: string, targetPersonId: string, role: WorkspaceMembershipDocument['role']): Promise<string> {
    // Verify inviter is active and has authority (coordinator or owner)
    const inviterMembership = await WorkspaceMembershipRepository.findByWorkspaceAndPerson(workspaceId, inviterId);
    if (!inviterMembership || inviterMembership.status !== 'active' || (inviterMembership.role !== 'owner' && inviterMembership.role !== 'coordinator')) {
      throw new Error('Unauthorized: actor cannot invite members to this workspace');
    }

    // Verify workspace exists
    const ws = await WorkspaceRepository.findById(workspaceId);
    if (!ws || ws.status !== 'active') {
      throw new Error('Workspace not found or inactive');
    }

    // Verify target Person exists
    const personExists = await this.verifyEntityExists('Person', targetPersonId);
    if (!personExists) {
      throw new Error(`Person with ID ${targetPersonId} does not exist in Platform Kernel`);
    }

    // Check if membership already exists
    const existing = await WorkspaceMembershipRepository.findByWorkspaceAndPerson(workspaceId, targetPersonId);
    if (existing) {
      if (existing.status === 'active') {
        throw new Error('Person is already an active member of this workspace');
      }
      // Re-invite
      const now = new Date().toISOString();
      await WorkspaceMembershipRepository.update(existing.id, {
        status: 'pending',
        role,
        updatedAt: now
      });

      await WorkspaceAuditEventRepository.create({
        id: generateUUID('wsa'),
        workspaceId,
        eventType: 'MemberInvited',
        actorId: inviterId,
        details: { targetPersonId, role, membershipId: existing.id },
        timestamp: now
      });

      return existing.id;
    }

    const membershipId = generateUUID('wsm');
    const now = new Date().toISOString();
    const membershipDoc: WorkspaceMembershipDocument = {
      id: membershipId,
      workspaceId,
      personId: targetPersonId,
      role,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    await WorkspaceMembershipRepository.create(membershipDoc);

    await WorkspaceAuditEventRepository.create({
      id: generateUUID('wsa'),
      workspaceId,
      eventType: 'MemberInvited',
      actorId: inviterId,
      details: { targetPersonId, role, membershipId },
      timestamp: now
    });

    return membershipId;
  }

  // Intent: accept invitation
  static async acceptInvitation(membershipId: string, personId: string): Promise<void> {
    const membership = await WorkspaceMembershipRepository.findById(membershipId);
    if (!membership) {
      throw new Error('Membership record not found');
    }
    if (membership.personId !== personId) {
      throw new Error('Unauthorized: this invitation belongs to another person');
    }
    if (membership.status !== 'pending') {
      throw new Error('Membership is not in pending state');
    }

    const now = new Date().toISOString();
    await WorkspaceMembershipRepository.update(membershipId, {
      status: 'active',
      updatedAt: now
    });

    await WorkspaceAuditEventRepository.create({
      id: generateUUID('wsa'),
      workspaceId: membership.workspaceId,
      eventType: 'MemberJoined',
      actorId: personId,
      details: { membershipId },
      timestamp: now
    });
  }

  // Intent: revoke membership
  static async revokeMembership(membershipId: string, actorId: string): Promise<void> {
    const targetMembership = await WorkspaceMembershipRepository.findById(membershipId);
    if (!targetMembership) {
      throw new Error('Membership record not found');
    }

    // Verify actor is either the target person themselves (leaving) or a workspace coordinator/owner
    const actorMembership = await WorkspaceMembershipRepository.findByWorkspaceAndPerson(targetMembership.workspaceId, actorId);
    
    const isSelf = targetMembership.personId === actorId;
    const isOwnerOrCoord = actorMembership && actorMembership.status === 'active' && 
      (actorMembership.role === 'owner' || actorMembership.role === 'coordinator');

    if (!isSelf && !isOwnerOrCoord) {
      throw new Error('Unauthorized to revoke this membership');
    }

    // Cannot revoke the last owner
    if (targetMembership.role === 'owner') {
      const allMembers = await WorkspaceMembershipRepository.listByWorkspace(targetMembership.workspaceId);
      const activeOwners = allMembers.filter(m => m.role === 'owner' && m.status === 'active');
      if (activeOwners.length <= 1 && targetMembership.status === 'active') {
        throw new Error('Cannot revoke membership of the last active workspace owner');
      }
    }

    const now = new Date().toISOString();
    await WorkspaceMembershipRepository.update(membershipId, {
      status: 'revoked',
      updatedAt: now
    });

    await WorkspaceAuditEventRepository.create({
      id: generateUUID('wsa'),
      workspaceId: targetMembership.workspaceId,
      eventType: 'MembershipRevoked',
      actorId,
      details: { membershipId, targetPersonId: targetMembership.personId },
      timestamp: now
    });
  }

  // Intent: bind entity
  static async bindEntity(workspaceId: string, actorId: string, entityType: string, entityId: string, config?: WorkspaceBindingDocument['config']): Promise<string> {
    // Validate actor has permissions
    const actorMembership = await WorkspaceMembershipRepository.findByWorkspaceAndPerson(workspaceId, actorId);
    if (!actorMembership || actorMembership.status !== 'active' || (actorMembership.role !== 'owner' && actorMembership.role !== 'coordinator')) {
      throw new Error('Unauthorized: actor cannot bind entities to this workspace');
    }

    // Validate entityType against Registry
    const isValidType = this.validateEntityTypeAgainstRegistry(entityType);
    if (!isValidType) {
      throw new Error(`Invalid entity type '${entityType}': not registered in Platform Registry`);
    }

    // Validate entityId exists in database
    const exists = await this.verifyEntityExists(entityType, entityId);
    if (!exists) {
      throw new Error(`Target ${entityType} entity with ID ${entityId} does not exist in Platform Kernel`);
    }

    // Check if already bound
    const existing = await WorkspaceBindingRepository.findByWorkspaceAndEntity(workspaceId, entityType, entityId);
    if (existing) {
      throw new Error(`Entity ${entityType}/${entityId} is already bound to this workspace`);
    }

    const bindingId = generateUUID('wsb');
    const now = new Date().toISOString();
    const bindingDoc: WorkspaceBindingDocument = {
      id: bindingId,
      workspaceId,
      entityType,
      entityId,
      config: {
        visibility: config?.visibility || ['*'],
        presentation: config?.presentation || {},
        commercial: config?.commercial || {},
        operational: config?.operational || {},
        policy: config?.policy || {}
      },
      createdAt: now,
      updatedAt: now
    };

    await WorkspaceBindingRepository.create(bindingDoc);

    await WorkspaceAuditEventRepository.create({
      id: generateUUID('wsa'),
      workspaceId,
      eventType: 'BindingCreated',
      actorId,
      details: { bindingId, entityType, entityId },
      timestamp: now
    });

    return bindingId;
  }

  // Intent: archive workspace
  static async archiveWorkspace(workspaceId: string, actorId: string): Promise<void> {
    const actorMembership = await WorkspaceMembershipRepository.findByWorkspaceAndPerson(workspaceId, actorId);
    if (!actorMembership || actorMembership.status !== 'active' || actorMembership.role !== 'owner') {
      throw new Error('Unauthorized: only the workspace owner can archive the workspace');
    }

    const now = new Date().toISOString();
    await WorkspaceRepository.update(workspaceId, {
      status: 'archived',
      updatedAt: now
    });

    await WorkspaceAuditEventRepository.create({
      id: generateUUID('wsa'),
      workspaceId: workspaceId,
      eventType: 'GovernanceChanged',
      actorId,
      details: { status: 'archived' },
      timestamp: now
    });
  }
}
