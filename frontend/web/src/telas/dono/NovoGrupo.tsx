import { LIMITES } from '@pelada/contrato';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BarraAcao } from '../../componentes/barras/BarraAcao';
import { Botao } from '../../componentes/basicos/Botao';
import { ErroEnvio } from '../../componentes/basicos/ErroEnvio';
import { Voltar } from '../../componentes/basicos/Voltar';
import { CampoHora } from '../../componentes/campos/CampoHora';
import { CampoSeletor } from '../../componentes/campos/CampoSeletor';
import { CampoTexto } from '../../componentes/campos/CampoTexto';
import { ResumoErros } from '../../componentes/campos/ResumoErros';
import { DialogoSenha } from '../../componentes/dialogos-padrao';
import { Segmentado } from '../../componentes/escolhas/Segmentado';
import { DuasColunas } from '../../componentes/pagina/DuasColunas';
import { Formulario } from '../../componentes/pagina/Formulario';
import { TituloPagina } from '../../componentes/pagina/TituloPagina';
import { useCriarGrupo } from '../../dados/dono/criar-grupo';
import { ErroApi } from '../../dados/erros';
import { deErroApi, type ErrosDeCampos } from '../../dados/errosDeCampos';
import { ORDEM_DIA_SEMANA, ORDEM_FREQUENCIA, ROTULO_DIA_SEMANA, ROTULO_FREQUENCIA } from '../../rotulos';
import { CAMPOS_NOVO_GRUPO } from './camposNovoGrupo';
import estilos from './dono.module.css';
import { caminhoAreaDono, caminhoGrupoDono, estadoVinculo } from './navegacao';

const DIAS = [
  { valor: '', rotulo: 'Escolha' },
  ...ORDEM_DIA_SEMANA.map((d) => ({ valor: d, rotulo: ROTULO_DIA_SEMANA[d] })),
];
const FREQUENCIAS = ORDEM_FREQUENCIA.map((f) => ({ valor: f, rotulo: ROTULO_FREQUENCIA[f] }));

/** T27: cria o grupo e o primeiro admin. Quem valida é a API; a tela mostra os erros por campo. */
export function Component() {
  const navegar = useNavigate();
  const criar = useCriarGrupo();
  const [nome, setNome] = useState('');
  const [dia, setDia] = useState('');
  const [horario, setHorario] = useState('');
  const [frequencia, setFrequencia] = useState('semanal');
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [erros, setErros] = useState<ErrosDeCampos>({});
  const [semConexao, setSemConexao] = useState(false);
  const [senha, setSenha] = useState<{ nome: string; senha: string; grupoId: string } | null>(null);

  const itens = CAMPOS_NOVO_GRUPO.filter((c) => erros[c.chave]).map((c) => ({ idCampo: c.id, rotulo: c.rotulo }));
  const umSoErro = itens.length === 1;

  const enviar = () => {
    setErros({});
    setSemConexao(false);
    criar.mutate(
      { nome, diaSemana: dia, frequencia, horario, adminNome, adminEmail },
      {
        onSuccess: (criado) => {
          if (criado.primeiroAdmin.contaNova) {
            setSenha({
              nome: criado.primeiroAdmin.nome,
              senha: criado.primeiroAdmin.senhaTemporaria,
              grupoId: criado.grupo.id,
            });
          } else {
            criar.reset();
            void navegar(caminhoGrupoDono(criado.grupo.id), { replace: true, state: estadoVinculo });
          }
        },
        onError: (erro) => {
          const doCampo = erro instanceof ErroApi && erro.status === 422 ? deErroApi(erro) : null;
          if (doCampo) setErros(doCampo);
          else setSemConexao(true);
        },
      },
    );
  };

  const aoFecharSenha = () => {
    const destino = senha ? caminhoGrupoDono(senha.grupoId) : caminhoAreaDono;
    setSenha(null);
    criar.reset();
    void navegar(destino, { replace: true });
  };

  return (
    <div className={estilos.estreito}>
      <title>Novo grupo</title>
      <Voltar para={caminhoAreaDono} rotulo="Área do dono" />
      <TituloPagina>Novo grupo</TituloPagina>
      <Formulario
        aoEnviar={() => {
          if (!criar.isPending) enviar();
        }}
        enviando={criar.isPending}
      >
        <ResumoErros erros={itens} />
        <CampoTexto
          id="ng-nome"
          rotulo="Nome do grupo"
          ajuda="O link do ranking será criado a partir do nome e não muda depois."
          maxLength={LIMITES.nomeGrupo.max}
          erro={erros.nome}
          erroComoAlerta={umSoErro}
          valor={nome}
          aoMudar={setNome}
        />
        <DuasColunas>
          <CampoSeletor
            id="ng-dia"
            rotulo="Dia da semana"
            erro={erros.diaSemana}
            erroComoAlerta={umSoErro}
            valor={dia}
            aoMudar={setDia}
            opcoes={DIAS}
          />
          <CampoHora
            id="ng-horario"
            rotulo="Horário"
            erro={erros.horario}
            erroComoAlerta={umSoErro}
            valor={horario}
            aoMudar={setHorario}
          />
        </DuasColunas>
        <Segmentado
          legenda="Frequência"
          legendaVisivel
          valor={frequencia}
          aoMudar={setFrequencia}
          opcoes={FREQUENCIAS}
        />
        <h2 className={estilos.subtitulo}>Primeiro admin</h2>
        <CampoTexto
          id="ng-admin-nome"
          rotulo="Nome"
          erro={erros.adminNome}
          erroComoAlerta={umSoErro}
          valor={adminNome}
          aoMudar={setAdminNome}
        />
        <CampoTexto
          id="ng-admin-email"
          rotulo="E-mail"
          tipo="email"
          ajuda="Se o e-mail já for de um admin, ele só é vinculado ao grupo."
          erro={erros.adminEmail}
          erroComoAlerta={umSoErro}
          valor={adminEmail}
          aoMudar={setAdminEmail}
        />
        {semConexao ? <ErroEnvio /> : null}
        <BarraAcao>
          <Botao type="submit" carregando={criar.isPending} rotuloCarregando="Criando…">
            Criar grupo
          </Botao>
        </BarraAcao>
      </Formulario>
      {senha ? <DialogoSenha nome={senha.nome} senha={senha.senha} aoFechar={aoFecharSenha} /> : null}
    </div>
  );
}
