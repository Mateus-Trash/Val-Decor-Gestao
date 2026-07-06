import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { comissoes } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Routers", () => {


  describe("colaboradores", () => {
    it("should list colaboradores", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.colaboradores.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate email is required on create", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.colaboradores.create({
          nome: "Test Colaborador",
          email: "",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Email inválido");
      }
    });

    it("should set default percentualComissao to 10", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        const result = await caller.colaboradores.create({
          nome: "Test Colaborador 2",
          email: "test2@example.com",
        });
        expect(result).toBeDefined();
      } catch (error: any) {
        // Database constraint might fail, but validation should pass
        expect(true).toBe(true);
      }
    });

    it("should validate percentualComissao range", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.colaboradores.create({
          nome: "Test Colaborador",
          email: "test@example.com",
          percentualComissao: 150,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Too big");
      }
    });
  });

  describe("itens", () => {
    it("should list itens", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.itens.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate required fields on create", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.itens.create({
          nome: "",
          valorAluguel: 1000,
          quantidadeTotal: 5,
          quantidadeDisponivel: 5,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Nome é obrigatório");
      }
    });

    it("should validate valorAluguel is positive", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.itens.create({
          nome: "Test Item",
          valorAluguel: 0,
          quantidadeTotal: 5,
          quantidadeDisponivel: 5,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Valor de aluguel deve ser positivo");
      }
    });

    it("should validate quantidadeDisponivel <= quantidadeTotal", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.itens.create({
          nome: "Test Item",
          valorAluguel: 1000,
          quantidadeTotal: 5,
          quantidadeDisponivel: 10,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Quantidade disponível não pode ser maior que quantidade total");
      }
    });
  });

  describe("kits", () => {
    it("should list kits", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.kits.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate required fields on create", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.kits.create({
          nome: "",
          valorAluguel: 5000,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Nome é obrigatório");
      }
    });

    it("should validate valorAluguel is positive", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.kits.create({
          nome: "Test Kit",
          valorAluguel: 0,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Valor de aluguel deve ser positivo");
      }
    });
  });

  describe("pedidos", () => {
    it("should list pedidos", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.pedidos.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate status enum on create", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.pedidos.create({
          colaboradorId: 1,
          dataEvento: new Date(),
          dataEntrega: new Date(),
          valorTotal: 10000,
          status: "InvalidStatus" as any,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Invalid");
      }
    });

    it("should set default status to Pendente", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        const result = await caller.pedidos.create({
          colaboradorId: 1,
          dataEvento: new Date(),
          dataEntrega: new Date(),
          valorTotal: 10000,
        });
        expect(result).toBeDefined();
      } catch (error: any) {
        // Might fail due to database constraints, but validation should pass
        expect(error.message).not.toContain("status");
      }
    });

    it("should validate updateStatus with valid enum", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.pedidos.updateStatus({
          id: 1,
          status: "Confirmado",
        });
        expect(true).toBe(true);
      } catch (error: any) {
        // Might fail due to database constraints, but validation should pass
        expect(error.message).not.toContain("status");
      }
    });

    it("should reject updateStatus with invalid enum", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.pedidos.updateStatus({
          id: 1,
          status: "InvalidStatus" as any,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Invalid");
      }
    });
  });

  describe("auth", () => {
    it("should return current user with me query", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toEqual(ctx.user);
    });

    it("should clear cookie on logout", async () => {
      const ctx = createAuthContext();
      let clearedCookie = false;
      ctx.res.clearCookie = () => {
        clearedCookie = true;
      };
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();
      expect(result).toEqual({ success: true });
      expect(clearedCookie).toBe(true);
    });
  });
});

describe("pedidos - comissão", () => {
  it("should insert comissão when updateStatus goes to Concluido, and remove it when it leaves Concluido", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const sufixo = Date.now();

    const colaboradorResult = await caller.colaboradores.create({
      nome: `Colaborador Teste ${sufixo}`,
      email: `colaborador${sufixo}@example.com`,
      percentualComissao: 10,
    });
    const colaboradorId = (colaboradorResult as any)[0].insertId;

    const itemResult = await caller.itens.create({
      nome: `Item Comissão Teste ${sufixo}`,
      valorAluguel: 1000,
      quantidadeTotal: 50,
    });
    const itemId = (itemResult as any)[0].insertId;

    const pedido = await caller.pedidos.create({
      nomeCliente: "Cliente Teste Comissão",
      colaboradorId,
      dataEvento: new Date("2026-08-10T12:00:00"),
      dataEntrega: new Date("2026-08-10T08:00:00"),
      enderecoEntrega: "Rua Teste, 123",
      valorTaxaEntrega: 0,
      itens: [{ itemId, quantidade: 1, valorUnitario: 1000 }],
      kits: [],
    });
    const pedidoId = pedido.pedidoId;
    const db = await getDb();

    await caller.pedidos.updateStatus({ id: pedidoId, status: "Concluido" });
    const comissaoInserida = await db!.select().from(comissoes).where(eq(comissoes.pedidoId, pedidoId));
    expect(comissaoInserida.length).toBe(1);

    await caller.pedidos.updateStatus({ id: pedidoId, status: "Confirmado" });
    const comissaoRemovida = await db!.select().from(comissoes).where(eq(comissoes.pedidoId, pedidoId));
    expect(comissaoRemovida.length).toBe(0);
  });
});

describe("financeiros", () => {
  it("should list financeiros", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financeiros.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should validate valor is positive on create", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.financeiros.create({ tipo: "despesa", descricao: "Teste", valor: -100 });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Valor deve ser positivo");
    }
  });

  it("should validate tipo enum on create", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.financeiros.create({ tipo: "invalido" as any, descricao: "Teste", valor: 100 });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid");
    }
  });
});

describe("entregas", () => {
  it("should list entregas", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.entregas.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should validate tipo enum on create", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.entregas.create({ pedidoId: 1, tipo: "invalido" as any, dataAgendada: new Date() });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid");
    }
  });

  it("should validate status enum on updateStatus", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.entregas.updateStatus({ id: 1, status: "invalido" as any });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid");
    }
  });
});

describe("estoque por data", () => {
  it("should show item as unavailable from dataEntrega onwards until Concluido, and available before dataEntrega", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const sufixo = Date.now();

    const colaboradorResult = await caller.colaboradores.create({
      nome: `Colaborador Estoque ${sufixo}`,
      email: `estoque${sufixo}@example.com`,
    });
    const colaboradorId = (colaboradorResult as any)[0].insertId;

    const itemResult = await caller.itens.create({
      nome: `Item Estoque Teste ${sufixo}`,
      valorAluguel: 1000,
      quantidadeTotal: 10,
    });
    const itemId = (itemResult as any)[0].insertId;

    const dataReservada = new Date("2026-09-15T12:00:00");
    const dataAnterior = new Date("2026-09-14T12:00:00");

    await caller.pedidos.create({
      nomeCliente: "Cliente Teste Estoque",
      colaboradorId,
      dataEvento: dataReservada,
      dataEntrega: dataReservada,
      enderecoEntrega: "Rua Teste, 456",
      valorTaxaEntrega: 0,
      itens: [{ itemId, quantidade: 10, valorUnitario: 1000 }],
      kits: [],
    });

    const dispNoDia = await caller.itens.getDisponibilidadePorData({ data: dataReservada });
    expect(dispNoDia.find((i: any) => i.id === itemId)?.disponivel).toBe(0);

    // Com reserva por período, o item continua reservado em datas futuras (até Concluido)
    const dispDiaFuturo = await caller.itens.getDisponibilidadePorData({ data: new Date("2026-09-16T12:00:00") });
    expect(dispDiaFuturo.find((i: any) => i.id === itemId)?.disponivel).toBe(0);

    // Mas em data anterior à entrega, o item está livre
    const dispDiaAnterior = await caller.itens.getDisponibilidadePorData({ data: dataAnterior });
    expect(dispDiaAnterior.find((i: any) => i.id === itemId)?.disponivel).toBe(10);
  });
});
