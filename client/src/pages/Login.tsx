import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const CHAVE_LEMBRAR = "valdecor:lembrarLogin";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_LEMBRAR);
    if (salvo) {
      try {
        const { email: emailSalvo, senha: senhaSalva } = JSON.parse(salvo);
        setEmail(emailSalvo ?? "");
        setSenha(senhaSalva ?? "");
        setLembrar(true);
      } catch {
        localStorage.removeItem(CHAVE_LEMBRAR);
      }
    }
  }, []);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      if (lembrar) {
        localStorage.setItem(CHAVE_LEMBRAR, JSON.stringify({ email, senha }));
      } else {
        localStorage.removeItem(CHAVE_LEMBRAR);
      }
      // Navegação completa única (em vez de navigate() + reload() em sequência).
      // No Safari/iOS, disparar um reload logo após o navigate pode competir com
      // o cookie de sessão ainda sendo persistido, fazendo a página recarregada
      // achar que não há sessão. Uma única navegação evita essa corrida.
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ email, senha });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="gap-2 w-full max-w-sm">
        <CardHeader className="text-center">
          <img
            src="/val-decor-logo-transparent.png"
            alt="Val Decor"
            className="w-32 h-32 mx-auto object-contain"
          />
          <CardTitle className="text-2xl font-bold">Val Decor Gestão</CardTitle>
          <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="lembrar"
                checked={lembrar}
                onCheckedChange={(v) => setLembrar(!!v)}
              />
              <Label htmlFor="lembrar" className="text-sm font-normal cursor-pointer">
                Lembrar de mim
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
