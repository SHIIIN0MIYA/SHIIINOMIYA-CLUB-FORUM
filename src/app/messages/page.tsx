import { redirect } from 'next/navigation';
import { requireUser } from '../../lib/current-user';
import { getConversationSummaries } from '../../lib/conversation-data';
import ConversationList from './ConversationList';

export default async function MessagesPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect('/login');
  }

  const conversations = await getConversationSummaries(user.id);

  return (
    <div className="relative z-10 h-[calc(100dvh-4rem)] px-0 md:px-6 md:py-6">
      <div className="mx-auto grid h-full max-w-6xl overflow-hidden border-white/10 bg-[#070a11]/75 backdrop-blur-xl md:grid-cols-[340px_1fr] md:rounded-2xl md:border">
        <ConversationList conversations={conversations} />
        <section className="hidden items-center justify-center md:flex">
          <div className="max-w-sm px-8 text-center">
            <p className="text-lg font-medium">选择一个会话</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              私信内容可能由管理员用于社区安全管理，请勿发送敏感个人信息。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
