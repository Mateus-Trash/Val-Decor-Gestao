import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface ImportarPedidosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXEMPLO = `Cliente: João Silva
Data: 25/07/2026
Colaborador: Mateus
Rua: Rua das Flores
Numero: 123
Bairro: Centro
Taxa: 50,00
Itens:
- 2x Toalha de Mesa Vermelha (R$ 15,00 cada)
- 1x Cadeira Tiffany (R$ 8,00 cada)
Kits:
- 1x Kit Casamento Premium (R$ 500,00 cada)
Observacoes: Entregar antes das 14h

---
Cliente: Maria Santos
Data: 28/07/2026
Colaborador: Maria Eduarda
Rua: Av. Brasil
Numero: 456
Bairro: Jardim Paulista
Itens:
- 5x Toalha de Mesa Vermelha (R$ 15,00 cada)
- 3x Cadeira Tiffany (R$ 8,00 cada)`;

interface PreviewItem {
  nome: string;
  quantidade: number;
  valorCentavos: number;
  jaExiste: boolean;
}

interface PreviewPedido {
  cliente: string;
  data: string;
  colaborador: string;
  colaboradorEncontrado: string | null;
  rua: string;
  numero: string;
  bairro: string;
  taxaEntrega: number;
  observacoes: string;
  itens: PreviewItem[];
  kits: PreviewItem[];
}

export default function ImportarPedidosDialog({ open, onOpenChange }: ImportarPedidosDialogProps) {
  const [texto, setTexto] = useState("");
  const [previewData, setPreviewData] = useState<PreviewPedido[] | null>(null);
  const [step, setStep] = useState<"input" | "preview" | "done">("input");

  const utils = trpc.useUtils();

  const previewMutation = trpc.importacao.preview.useMutation({
    onSuccess: (data) => {
      if (data.length === 0) {
        toast.error("Nenhum pedido válido encontrado no texto. Verifique o formato.");
        return;
      }
      setPreviewData(data);
      setStep("preview");
    },
    onError: (error) => toast.error(`Erro ao analisar texto: ${error.message}`),
  });

  const importarMutation = trpc.importacao.importar.useMutation({
    onSuccess: (data) => {
      const criados = data.resultados.filter((r) => r.pedidoId > 0).length;
      const comErros = data.resultados.filter((r) => r.erros.length > 0);
      const totalItensCriados = data.resultados.reduce((acc, r) => acc + r.itensCriados.length, 0);
      const totalKitsCriados = data.resultados.reduce((acc, r) => acc + r.kitsCriados.length, 0);

      toast.success(`${criados} pedido(s) importado(s)!${totalItensCriados > 0 ? ` ${totalItensCriados} item(ns) criado(s).` : ""}${totalKitsCriados > 0 ? ` ${totalKitsCriados} kit(s) criado(s).` : ""}`);

      if (comErros.length > 0) {
        toast.warning(`${comErros.length} pedido(s) com erro. Veja o resumo.`);
      }

      utils.pedidos.list.invalidate();
      utils.itens.list.invalidate();
      utils.kits.list.invalidate();
      utils.dashboard.getPedidosCalendario.invalidate();
      utils.dashboard.getKPIs.invalidate();

      setStep("done");
    },
    onError: (error) => toast.error(`Erro ao importar: ${error.message}`),
  });

  function handlePreview() {
    if (!texto.trim()) {
      toast.error("Cole o texto com os pedidos primeiro");
      return;
    }
    previewMutation.mutate({ texto });
  }

  function handleImportar() {
    if (!texto.trim()) return;
    importarMutation.mutate({ texto });
  }

  function handleFechar() {
    setTexto("");
    setPreviewData(null);
    setStep("input");
    onOpenChange(false);
  }

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleFechar(); }}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Upload className="h-5 w-5" />
            Importar Pedidos por Texto
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm space-y-1">
              <p className="font-semibold">Como usar:</p>
              <p>Cole abaixo o texto com os pedidos. Cada pedido deve ter os campos <strong>Cliente</strong>, <strong>Data</strong> (dd/mm/aaaa), <strong>Rua</strong>, <strong>Numero</strong>, <strong>Bairro</strong> e pelo menos itens ou kits.</p>
              <p>Itens e kits que não existem no catálogo serão <strong>criados automaticamente</strong>.</p>
              <p>Separe múltiplos pedidos com uma linha <code className="bg-background px-1 rounded">---</code> ou linha em branco.</p>
            </div>

            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={EXEMPLO}
              className="min-h-[300px] font-mono text-xs sm:text-sm"
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleFechar} className="text-sm">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handlePreview}
                disabled={previewMutation.isPending || !texto.trim()}
                className="text-sm"
              >
                {previewMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
                ) : (
                  <><FileText className="h-4 w-4 mr-2" /> Analisar Texto</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && previewData && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <strong>{previewData.length}</strong> pedido(s) encontrado(s). Confira os detalhes abaixo antes de importar.
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {previewData.map((pedido, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{pedido.cliente}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(pedido.data)} • {pedido.bairro} • {pedido.rua}, {pedido.numero}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Colaborador: {pedido.colaboradorEncontrado || <span className="text-red-500">{pedido.colaborador || "não informado"}</span>}
                      </p>
                      {pedido.taxaEntrega > 0 && (
                        <p className="text-xs text-muted-foreground">Taxa: {pedido.taxaEntrega.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                      )}
                    </div>
                  </div>

                  {pedido.itens.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Itens:</p>
                      {pedido.itens.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs pl-3">
                          <span>{item.quantidade}x {item.nome}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(item.valorCentavos)}</span>
                            {item.jaExiste ? (
                              <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                                existe
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                novo
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {pedido.kits.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Kits:</p>
                      {pedido.kits.map((kit, i) => (
                        <div key={i} className="flex items-center justify-between text-xs pl-3">
                          <span>{kit.quantidade}x {kit.nome}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(kit.valorCentavos)}</span>
                            {kit.jaExiste ? (
                              <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                                existe
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                novo
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setStep("input")} className="text-sm">
                Voltar e Editar
              </Button>
              <Button
                type="button"
                onClick={handleImportar}
                disabled={importarMutation.isPending}
                className="text-sm"
              >
                {importarMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Confirmar Importação</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && importarMutation.data && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-lg">Importação Concluída!</p>
              <p className="text-sm text-muted-foreground">
                {importarMutation.data.resultados.filter((r) => r.pedidoId > 0).length} de {importarMutation.data.totalPedidos} pedido(s) criado(s) com sucesso.
              </p>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {importarMutation.data.resultados.map((r, idx) => (
                <div key={idx} className={`border rounded-lg p-3 ${r.erros.length > 0 ? "border-red-300 bg-red-50 dark:bg-red-900/20" : "border-green-300 bg-green-50 dark:bg-green-900/20"}`}>
                  <div className="flex items-center gap-2">
                    {r.erros.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                    <span className="font-medium text-sm">{r.cliente}</span>
                    {r.pedidoId > 0 && <Badge className="text-[10px] px-1.5">#{r.pedidoId}</Badge>}
                  </div>
                  {r.itensCriados.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 pl-6">
                      Itens criados: {r.itensCriados.join(", ")}
                    </p>
                  )}
                  {r.kitsCriados.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 pl-6">
                      Kits criados: {r.kitsCriados.join(", ")}
                    </p>
                  )}
                  {r.erros.length > 0 && (
                    <p className="text-xs text-red-500 mt-1 pl-6">
                      {r.erros.join("; ")}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleFechar} className="text-sm">
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
