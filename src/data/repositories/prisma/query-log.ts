import { PrismaClient } from "@prisma/client";
import { logger } from "../../../utils/logger";

export class QueryLogRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async logQuery(data: {
    userId: string;
    response: any;
    command: string;
    tokenAddress: string | undefined;
    chainId: string | undefined;
    tokenId: string | undefined;
    tokenName: string;
  }): Promise<void> {
    try {
      await this.prisma.queryLog.create({
        data: {
          userId: data.userId,
          response: data.response,
          command: data.command,
          tokenAddress: data.tokenAddress,
          chainId: data.chainId,
          tokenId: data.tokenId,
          tokenName: data.tokenName,
        },
      });
    } catch (error) {
      logger.error("Error logging query:", error);
    }
  }

  async getRecentQueries(
    type: "analyze" | "price",
    tokenAddress?: string,
    tokenId?: string | undefined
  ): Promise<any[]> {
    try {
      return await this.prisma.queryLog.findMany({
        where: {
          command: type,
          tokenAddress,
          tokenId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      logger.error("Error fetching recent queries:", error);
      return [];
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
