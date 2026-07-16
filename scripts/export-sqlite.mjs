import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const legacyImage =
  "/uploads/1778146057590-cg81q9iqyur.png";
const blobImage = process.env.LEGACY_BLOB_URL;

try {
  const [users, posts, comments, likes, notifications] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.post.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.comment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.like.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.userNotification.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const exportedPosts = posts.map((post) => ({
    ...post,
    content: blobImage
      ? post.content.replaceAll(legacyImage, blobImage)
      : post.content,
  }));

  await mkdir(".data", { recursive: true });
  await writeFile(
    ".data/sqlite-export.json",
    JSON.stringify(
      { users, posts: exportedPosts, comments, likes, notifications },
      null,
      2
    )
  );

  console.log(
    `Exported ${users.length} users, ${posts.length} posts, ` +
      `${comments.length} comments, ${likes.length} likes, ` +
      `${notifications.length} notifications.`
  );
} finally {
  await prisma.$disconnect();
}
