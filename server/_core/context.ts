import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, Colaborador } from "../../drizzle/schema";
import { getUserById, getColaboradorByUserId } from "../db";
import { verifyToken } from "./authUtils";
import { COOKIE_NAME } from "../../shared/const";
import cookie from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  colaborador: Colaborador | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let colaborador: Colaborador | null = null;

  try {
    const cookies = cookie.parse(opts.req.headers.cookie || "");
    const token = cookies[COOKIE_NAME];
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const found = await getUserById(payload.userId);
        if (found) {
          user = found;
          const col = await getColaboradorByUserId(found.id);
          if (col) colaborador = col;
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    colaborador,
  };
}
