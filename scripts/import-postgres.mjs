import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const data = JSON.parse(
  await readFile(".data/sqlite-export.json", "utf8")
);

const withDates = (records, fields) =>
  records.map((record) => ({
    ...record,
    ...Object.fromEntries(fields.map((field) => [field, new Date(record[field])])),
  }));

try {
  await prisma.user.createMany({
    data: withDates(data.users, ["createdAt", "updatedAt"]),
    skipDuplicates: true,
  });
  await prisma.post.createMany({
    data: withDates(data.posts, ["createdAt", "updatedAt"]),
    skipDuplicates: true,
  });
  await prisma.comment.createMany({
    data: withDates(data.comments, ["createdAt", "updatedAt"]),
    skipDuplicates: true,
  });
  await prisma.like.createMany({
    data: withDates(data.likes, ["createdAt"]),
    skipDuplicates: true,
  });
  await prisma.userNotification.createMany({
    data: withDates(data.notifications, ["createdAt"]),
    skipDuplicates: true,
  });

  console.log(
    `Imported ${data.users.length} users, ${data.posts.length} posts, ` +
      `${data.comments.length} comments, ${data.likes.length} likes, ` +
      `${data.notifications.length} notifications.`
  );
} finally {
  await prisma.$disconnect();
}
