import { main } from './restauracao-neon';

// Ponto de entrada do deploy.yml: sempre executa e sai com o código de main.
process.exit(main(process.argv.slice(2)));
