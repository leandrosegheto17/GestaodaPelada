import { useId, useRef, useState } from 'react';
import { Botao } from '../basicos/Botao';
import { Icone } from '../basicos/Icone';
import { Dialogo } from '../dialogos/Dialogo';
import { DialogoConfirmacao } from './DialogoConfirmacao';
import estilos from './DialogoSenha.module.css';

interface Props {
  nome: string;
  /** Só vive nesta prop: nada é guardado nem registrado. */
  senha: string;
  aoFechar: () => void;
}

/** D1: senha temporária exibida uma única vez. Fechar sem "Já copiei" pede confirmação. */
export function DialogoSenha({ nome, senha, aoFechar }: Props) {
  const idSenha = useId();
  const copiar = useRef<HTMLButtonElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState('');

  if (confirmando) {
    return (
      <DialogoConfirmacao
        titulo="Fechar sem copiar?"
        texto="A senha não será mostrada de novo."
        verbo="Fechar"
        rotuloCancelar="Voltar"
        aoConfirmar={aoFechar}
        aoCancelar={() => setConfirmando(false)}
      />
    );
  }

  const aoCopiar = async () => {
    try {
      await navigator.clipboard.writeText(senha);
      setAviso('Senha copiada');
    } catch {
      setAviso('Não foi possível copiar. Selecione a senha e copie.');
    }
  };

  return (
    <Dialogo titulo={`Senha temporária de ${nome}`} refFocoInicial={copiar} aoFechar={() => setConfirmando(true)}>
      <button type="button" className={estilos.fechar} aria-label="Fechar" onClick={() => setConfirmando(true)}>
        <Icone nome="fechar" />
      </button>
      <div className={estilos.senha}>
        <span id={idSenha}>{senha}</span>
        <Botao ref={copiar} variante="secundario" aria-describedby={idSenha} onClick={() => void aoCopiar()}>
          Copiar
        </Botao>
      </div>
      <p className={estilos.aviso}>
        Esta senha não será mostrada de novo. Envie para a pessoa por um canal privado. Ela terá de trocar no primeiro
        acesso.
      </p>
      <p className="sr" role="status">
        {aviso}
      </p>
      <Botao variante="principal" bloco onClick={aoFechar}>
        Já copiei
      </Botao>
    </Dialogo>
  );
}
