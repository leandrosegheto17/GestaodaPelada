/** `AAAA-MM-DD` de São Paulo, o mesmo "hoje" do resto do sistema. */
export const hojeEmSaoPaulo = (agora: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
