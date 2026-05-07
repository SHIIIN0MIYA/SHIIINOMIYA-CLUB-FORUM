// src/components/NavbarServer.tsx
import { auth } from "../auth";
import NavbarClient from "./NavbarClient";

export default async function NavbarServer() {
  const session = await auth();

  // 将会话信息传给客户端组件
  const user = session?.user
    ? {
        name: session.user.name ?? null,
      }
    : null;

  return <NavbarClient user={user} />;
}