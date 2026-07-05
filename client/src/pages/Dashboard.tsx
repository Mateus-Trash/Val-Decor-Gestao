import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  DollarSign,
  Award,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const dashboardItems = [
    {
      title: "Clientes",
      description: "Gerenciar clientes",
      icon: Users,
      href: "/clientes",
      color: "bg-blue-500",
    },
    {
      title: "Colaboradores",
      description: "Equipe de trabalho",
      icon: Users,
      href: "/colaboradores",
      color: "bg-green-500",
    },
    {
      title: "Itens",
      description: "Catálogo de itens",
      icon: Package,
      href: "/itens",
      color: "bg-purple-500",
    },
    {
      title: "Kits",
      description: "Pacotes de aluguel",
      icon: ShoppingCart,
      href: "/kits",
      color: "bg-orange-500",
    },
    {
      title: "Pedidos",
      description: "Pedidos de aluguel",
      icon: ShoppingCart,
      href: "/pedidos",
      color: "bg-red-500",
    },
    {
      title: "Entregas/Coletas",
      description: "Logística",
      icon: Truck,
      href: "/entregas-coletas",
      color: "bg-cyan-500",
    },
    {
      title: "Financeiro",
      description: "Transações financeiras",
      icon: DollarSign,
      href: "/financeiro",
      color: "bg-emerald-500",
    },
    {
      title: "Comissões",
      description: "Comissões de colaboradores",
      icon: Award,
      href: "/comissoes",
      color: "bg-indigo-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Bem-vindo, {user?.name || "Usuário"}! Gerencie seu sistema de aluguéis.
            </p>
          </div>
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens Disponíveis</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Módulos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboardItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.href}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(item.href)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                      <div className={`${item.color} p-2 rounded-lg`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
