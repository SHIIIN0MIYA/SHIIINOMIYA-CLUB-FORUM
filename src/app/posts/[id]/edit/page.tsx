// src/app/posts/[id]/edit/page.tsx
import { auth } from '../../../../auth';
import { db } from '../../../../lib/db';
import { notFound, redirect } from 'next/navigation';
import EditForm from './EditForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const post = await db.post.findUnique({ where: { id } });
  if (!post) notFound();

  // 权限：作者本人或管理员
  if (post.authorId !== session.user.id && session.user.role !== 'admin') {
    redirect('/posts');
  }

  return (
    <div className="relative z-10 min-h-screen px-6 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">编辑帖子</h1>
        <EditForm postId={post.id} title={post.title} content={post.content} tags={post.tags} />
      </div>
    </div>
  );
}