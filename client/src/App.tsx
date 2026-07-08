import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Colaboradores from "./pages/Colaboradores";
import Itens from "./pages/Itens";
import Kits from "./pages/Kits";
import Pedidos from "./pages/Pedidos";
import Financeiro from "./pages/Financeiro";
import Calendario from "./pages/Calendario";
import Logistica from "./pages/Logistica";
import Comissoes from "./pages/Comissoes";
import Login from "./pages/Login";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/calendario"} component={Calendario} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/colaboradores"} component={Colaboradores} />
      <Route path={"/itens"} component={Itens} />
      <Route path={"/kits"} component={Kits} />
      <Route path={"/estoque"} component={Estoque} />
      <Route path={"/pedidos"} component={Pedidos} />
      <Route path={"/financeiro"} component={Financeiro} />
      <Route path={"/logistica"} component={Logistica} />
      <Route path={"/comissoes"} component={Comissoes} />
      <Route path={"/login"} component={Login} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
