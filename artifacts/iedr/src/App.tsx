import React from "react";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { LanguageProvider } from "@/lib/language";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Registries from "@/pages/Registries";
import RegistryDetail from "@/pages/RegistryDetail";
import About from "@/pages/About";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/registries" component={Registries} />
        <Route path="/registries/:id" component={RegistryDetail} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <WouterRouter>
        <Router />
      </WouterRouter>
    </LanguageProvider>
  );
}

export default App;
