'use client';

import React from 'react';
import { ChatModule } from './modules/ChatModule';
import { CalendarModule } from './modules/CalendarModule';
import { VotingModule } from './modules/VotingModule';
import { BudgetModule } from './modules/BudgetModule';

export const MODULE_REGISTRY: Record<string, React.ComponentType<{ state: 'active' | 'read-only' | 'locked' | 'closed' }>> = {
  chat: ChatModule,
  calendar: CalendarModule,
  voting: VotingModule,
  budget: BudgetModule,
};
