import { z } from 'zod';

// O app roda sob CSP sem `unsafe-eval`: sem isto o zod testa `new Function` ao declarar
// os schemas e gera violação a cada carga. Precisa ser o primeiro import do pacote.
z.config({ jitless: true });
