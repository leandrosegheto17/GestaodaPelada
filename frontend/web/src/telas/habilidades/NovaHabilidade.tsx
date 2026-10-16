import { habilidadeCorpo } from '@pelada/contrato';
import { useRef, useState } from 'react';
import { Botao } from '../../componentes/basicos/Botao';
import { Campo } from '../../componentes/campos/Campo';
import { ErroApi } from '../../dados/erros';
import { deErroApi, deValidacao } from '../../dados/errosDeCampos';
import { useCriarHabilidade } from '../../dados/habilidades';
import estilos from './habilidades.module.css';

const SEM_CONEXAO = 'Não foi possível adicionar. Verifique a conexão e tente de novo.';

/** Formulário "Nova habilidade": valida com o contrato, mostra o 422 no campo e devolve o foco ao campo. */
export function NovaHabilidade({ grupoId }: { grupoId: string }) {
  const criar = useCriarHabilidade(grupoId);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const entrada = useRef<HTMLInputElement>(null);

  const enviar = () => {
    const analise = habilidadeCorpo.safeParse({ nome });
    if (!analise.success) {
      setErro(deValidacao(analise).nome);
      return;
    }
    setErro(undefined);
    criar.mutate(analise.data.nome, {
      onSuccess: () => {
        setNome('');
        entrada.current?.focus();
      },
      onError: (falha) => {
        const doCampo = falha instanceof ErroApi && falha.status === 422 ? deErroApi(falha) : null;
        setErro(doCampo?.['nome'] ?? SEM_CONEXAO);
      },
    });
  };

  return (
    <form
      className={estilos.secao}
      noValidate
      aria-busy={criar.isPending || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <Campo
        id="nova"
        rotulo="Nova habilidade"
        erro={erro}
        erroComoAlerta
        lado={
          <Botao type="submit" carregando={criar.isPending}>
            Adicionar
          </Botao>
        }
      >
        {(propsEntrada) => (
          <input
            {...propsEntrada}
            ref={entrada}
            type="text"
            maxLength={30}
            autoComplete="off"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        )}
      </Campo>
    </form>
  );
}
