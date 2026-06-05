'use client';

import ContentItemEditor from '../[id]/page';
import { use } from 'react';

export default function NewContentItemPage({ params }: { params: Promise<{ type: string }> }) {
  const resolvedParams = use(params);
  
  const wrappedParams = Promise.resolve({
    type: resolvedParams.type,
    id: 'new'
  });
  
  return <ContentItemEditor params={wrappedParams} />;
}
