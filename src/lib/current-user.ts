import { auth } from "../auth";
import { db } from "./db";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("请先登录");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user || user.role === "banned") {
    throw new Error("账号不存在或已被封禁");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("仅管理员可执行");
  }
  return user;
}
