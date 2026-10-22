import type { Hono } from 'hono';
import type { AppEnv } from './app.js';
import { rotaDonoCriarGrupo } from './rotas/dono/criar-grupo.js';
import { rotaDonoGrupo } from './rotas/dono/grupo.js';
import { rotaDonoPainel } from './rotas/dono/painel.js';
import { rotaSessaoEntrar } from './rotas/sessao-entrar.js';
import { rotaSessaoEsqueciSenha } from './rotas/sessao-esqueci-senha.js';
import { rotaSessaoAvisoPrivacidade } from './rotas/sessao-aviso-privacidade.js';
import { rotaSessaoEu } from './rotas/sessao-eu.js';
import { rotaSessaoTrocarSenha } from './rotas/sessao-trocar-senha.js';
import { rotaSessaoSair } from './rotas/sessao-sair.js';
import { rotaDonoSituacao } from './rotas/dono/situacao.js';
import { rotaDonoArquivar, rotaDonoReativar } from './rotas/dono/arquivamento.js';
import { rotaDonoResolverPedido } from './rotas/dono/pedidos-reset.js';
import { rotaDonoRedefinirSenha } from './rotas/dono/redefinir-senha.js';
import { rotaGrupoLer } from './rotas/grupos/ler.js';
import { rotaGrupoEditar } from './rotas/grupos/editar.js';
import { rotaAdminsListar } from './rotas/grupos/admins/listar.js';
import { rotaAdminsAdicionar } from './rotas/grupos/admins/adicionar.js';
import { rotaAdminsRemover } from './rotas/grupos/admins/remover.js';
import { rotaAdminsRedefinirSenha } from './rotas/grupos/admins/redefinir-senha.js';
import { rotaAdminsFinanceiro } from './rotas/grupos/admins/financeiro.js';
import { rotaJogadoresListar } from './rotas/grupos/jogadores/listar.js';
import { rotaJogadorLer } from './rotas/grupos/jogadores/ler.js';
import { rotaJogadorPeriodoCorrigir } from './rotas/grupos/jogadores/periodos-corrigir.js';
import { rotaJogadorPeriodosListar } from './rotas/grupos/jogadores/periodos-listar.js';
import { rotaJogadorPeriodoPrevia } from './rotas/grupos/jogadores/periodos-previa.js';
import { rotaJogadorCriar } from './rotas/grupos/jogadores/criar.js';
import { rotaJogadorEditar } from './rotas/grupos/jogadores/editar.js';
import { rotaJogadorInicioEditar, rotaJogadorInicioPrevia } from './rotas/grupos/jogadores/inicio.js';
import { rotaJogadorInativar, rotaJogadorReativar } from './rotas/grupos/jogadores/situacao.js';
import { rotaJogadorReativarPrevia } from './rotas/grupos/jogadores/reativar-previa.js';
import { rotaJogadorExcluir } from './rotas/grupos/jogadores/excluir.js';
import { rotaPesosLer, rotaPesosSalvar } from './rotas/grupos/pesos/pesos.js';
import { rotaPartidasListar } from './rotas/grupos/partidas/listar.js';
import { rotaPartidaNova } from './rotas/grupos/partidas/nova.js';
import { rotaPartidaLer } from './rotas/grupos/partidas/ler.js';
import { rotaPartidaEditar, rotaPartidaExcluir, rotaPartidaSalvar } from './rotas/grupos/partidas/escrever.js';
import { rotaPublicoRanking } from './rotas/publico/ranking.js';
import { rotaPublicoEventos } from './rotas/publico/eventos.js';
import { rotaPublicoPdf } from './rotas/publico/pdf.js';
import { rotaGrupoUso } from './rotas/grupos/uso.js';
import { rotaHabilidadesListar } from './rotas/grupos/habilidades/listar.js';
import { rotaHabilidadeCriar } from './rotas/grupos/habilidades/criar.js';
import { rotaHabilidadeRenomear } from './rotas/grupos/habilidades/renomear.js';
import { rotaHabilidadeExcluir } from './rotas/grupos/habilidades/excluir.js';
import { rotaNotaSalvar } from './rotas/grupos/jogadores/nota-salvar.js';
import { rotaSimuladorContexto } from './rotas/grupos/simulador/contexto.js';
import { rotaSimuladorPrevia } from './rotas/grupos/simulador/previa.js';
import { rotaSimuladorSugerir } from './rotas/grupos/simulador/sugerir.js';
import { rotaSimuladorAvaliar } from './rotas/grupos/simulador/avaliar.js';
import { rotaEscalacaoConfirmar } from './rotas/grupos/escalacoes/confirmar.js';
import { rotaFinanceiroMes } from './rotas/grupos/financeiro/mes.js';
import { rotaFinanceiroConfig } from './rotas/grupos/financeiro/config.js';
import { rotaPagamentoMarcar } from './rotas/grupos/financeiro/pagamentos.js';
import { rotaPagamentoDesmarcar } from './rotas/grupos/financeiro/pagamentos-desmarcar.js';
import { rotaLancamentoCriar } from './rotas/grupos/financeiro/lancamentos/criar.js';
import { rotaLancamentoLer } from './rotas/grupos/financeiro/lancamentos/ler.js';
import { rotaLancamentoEditar } from './rotas/grupos/financeiro/lancamentos/editar.js';
import { rotaLancamentoExcluir } from './rotas/grupos/financeiro/lancamentos/excluir.js';

/** Todas as rotas de negócio. Cada rota nova entra aqui, depois dos middlewares do app (ADR-005). */
export const ROTAS: readonly Hono<AppEnv>[] = [
  rotaSessaoEntrar,
  rotaSessaoEsqueciSenha,
  rotaSessaoEu,
  rotaSessaoSair,
  rotaSessaoTrocarSenha,
  rotaSessaoAvisoPrivacidade,
  rotaDonoPainel,
  rotaDonoGrupo,
  rotaDonoCriarGrupo,
  rotaDonoSituacao,
  rotaDonoArquivar,
  rotaDonoReativar,
  rotaDonoResolverPedido,
  rotaDonoRedefinirSenha,
  rotaGrupoLer,
  rotaGrupoEditar,
  rotaAdminsListar,
  rotaAdminsAdicionar,
  rotaAdminsRemover,
  rotaAdminsRedefinirSenha,
  rotaAdminsFinanceiro,
  rotaJogadoresListar,
  rotaJogadorLer,
  rotaJogadorPeriodosListar,
  rotaJogadorPeriodoPrevia,
  rotaJogadorPeriodoCorrigir,
  rotaJogadorCriar,
  rotaJogadorEditar,
  rotaJogadorInicioPrevia,
  rotaJogadorInicioEditar,
  rotaJogadorInativar,
  rotaJogadorReativar,
  rotaJogadorReativarPrevia,
  rotaJogadorExcluir,
  rotaPesosLer,
  rotaPesosSalvar,
  rotaPartidasListar,
  rotaPartidaNova,
  rotaPartidaLer,
  rotaPartidaSalvar,
  rotaPartidaEditar,
  rotaPartidaExcluir,
  rotaPublicoRanking,
  rotaPublicoEventos,
  rotaPublicoPdf,
  rotaGrupoUso,
  rotaHabilidadesListar,
  rotaHabilidadeCriar,
  rotaHabilidadeRenomear,
  rotaHabilidadeExcluir,
  rotaNotaSalvar,
  rotaSimuladorContexto,
  rotaSimuladorPrevia,
  rotaSimuladorSugerir,
  rotaSimuladorAvaliar,
  rotaEscalacaoConfirmar,
  rotaFinanceiroMes,
  rotaFinanceiroConfig,
  rotaPagamentoMarcar,
  rotaPagamentoDesmarcar,
  rotaLancamentoCriar,
  rotaLancamentoLer,
  rotaLancamentoEditar,
  rotaLancamentoExcluir,
];
