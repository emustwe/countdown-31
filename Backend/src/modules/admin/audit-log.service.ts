import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

type TxClient = Prisma.TransactionClient;

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    client: TxClient | PrismaService,
    params: { actorUserId: string; action: string; targetType: string; targetId: string; data: unknown },
  ): Promise<void> {
    const db = client ?? this.prisma;
    await db.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        dataJson: params.data as Prisma.InputJsonValue,
      },
    });
  }
}
