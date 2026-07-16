// src/components/NavbarServer.tsx
import { auth } from "../auth";
import NavbarClient from "./NavbarClient";
import { getUnreadMessageCount } from "../lib/conversation-data";

export default async function NavbarServer() {
  const session = await auth();

  // 将会话信息传给客户端组件
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        role: session.user.role,
      }
    : null;
  const unreadMessages = session?.user?.id
    ? await getUnreadMessageCount(session.user.id)
    : 0;

  return <NavbarClient user={user} unreadMessages={unreadMessages} />;
}
