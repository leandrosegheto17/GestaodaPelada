import { email as esquemaEmail } from '@pelada/contrato';
import { redefinirSenha } from '../api/src/aplicacao/acesso/senhas.ts';
import { criarDb, emTransacao, fecharDb } from '../api/src/infraestrutura/db/index.ts';
import * as auditoria from '../api/src/infraestrutura/db/repositorios/auditoria.ts';
import * as contas from '../api/src/infraestrutura/db/repositorios/contas.ts';
import { gerarSenhaTemporaria } from '../api/src/infraestrutura/seguranca/senha-temporaria.ts';
import { exigirHostPermitido, HostRecusado } from '../api/src/infraestrutura/seguranca/trava-host.ts';
import { argumento, confirmarHost, perguntar } from './comum/argumentos.ts';

/**
 * Conta do dono da plataforma (única): `criar` na implantação e `redefinir-senha` na recuperação.
 * Uso: tsx backend/scripts/dono.ts <criar|redefinir-senha> [--alvo producao|teste]
 * Variáveis: DATABASE_URL e DONO_EMAIL. A senha temporária é impressa uma única vez.
 */
class Abortar extends Error {}

function exigirEmailDoDono(): string {
  const lido = esquemaEmail.safeParse(process.env['DONO_EMAIL']);
  if (!lido.success) throw new Abortar('DONO_EMAIL ausente ou inválido.');
  return lido.data;
}

async function principal(): Promise<void> {
  const comando = process.argv[2];
  if (comando !== 'criar' && comando !== 'redefinir-senha') {
    throw new Abortar('Uso: dono.ts <criar|redefinir-senha> [--alvo producao|teste]');
  }
  const emailDoDono = exigirEmailDoDono();
  const url = process.env['DATABASE_URL'];
  await exigirHostPermitido({ url, alvo: argumento('alvo'), ci: process.env['CI'], confirmar: confirmarHost });

  const digitado = esquemaEmail.safeParse(await perguntar('Digite o e-mail do dono para confirmar: '));
  if (!digitado.success || digitado.data !== emailDoDono) {
    throw new Abortar('O e-mail digitado não é o do dono. Nada foi alterado.');
  }

  const promessas: Promise<unknown>[] = [];
  const db = criarDb({ connectionString: url as string }, { waitUntil: (p) => void promessas.push(p) });
  try {
    const agora = new Date();
    const existente = await contas.buscarPorEmail(db, emailDoDono);

    if (comando === 'criar') {
      if (existente) throw new Abortar('Já existe uma conta com o e-mail do dono. Use redefinir-senha.');
      const senha = gerarSenhaTemporaria();
      await emTransacao(db, async (tx) => {
        const id = await contas.criarContaDono(tx, { email: emailDoDono, nome: 'Dono', senha, agora });
        await auditoria.registrar(tx, null, {
          autor: { tipo: 'infraestrutura' },
          acao: 'dono_criado',
          entidade: 'conta',
          entidadeId: id,
          agora,
        });
      });
      console.log(`Conta do dono criada. Senha temporária (exibida uma única vez): ${senha}`);
    } else {
      if (!existente?.eDono) throw new Abortar('Não existe conta de dono para esse e-mail.');
      const r = await redefinirSenha(db, existente.id, { tipo: 'infraestrutura' }, agora);
      console.log(`Senha redefinida. Senha temporária (exibida uma única vez): ${r.senhaTemporaria}`);
    }
  } finally {
    await fecharDb(db);
    await Promise.all(promessas);
  }
}

principal().catch((erro: unknown) => {
  console.error(
    erro instanceof Abortar || erro instanceof HostRecusado ? erro.message : 'Falha ao executar o comando.',
  );
  process.exit(1);
});
