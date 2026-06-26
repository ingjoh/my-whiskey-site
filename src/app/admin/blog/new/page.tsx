'use client';

import BlogEditor from '../[id]/page';

export default function NewBlogPostPage() {
  const wrappedParams = Promise.resolve({ id: 'new' });
  return <BlogEditor params={wrappedParams} />;
}
