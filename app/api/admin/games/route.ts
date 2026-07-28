import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const games = await prisma.game.findMany({
    include: {
      currentVersion: true,
      tagRelations: { include: { tag: true } },
      _count: { select: { analyticsEvents: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ games });
}

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(2).max(30),
  shortDescription: z.string().max(60),
  description: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  try {
    const body = createSchema.parse(await request.json());
    const game = await prisma.game.create({
      data: {
        slug: body.slug,
        title: body.title,
        shortDescription: body.shortDescription,
        description: body.description || "",
        status: "DRAFT",
      },
    });
    return NextResponse.json({ game }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "创建失败" },
      { status: 400 },
    );
  }
}
