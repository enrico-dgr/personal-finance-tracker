import { describe, expect, it } from 'vitest';

import { parseCsvTransactions } from './csv.js';

describe('parseCsvTransactions', () => {
  it('parses Mediolanum exports with preamble and split debit-credit columns', () => {
    const content = [
      'Nickname;IBAN;Saldo contabile;Saldo disponibile',
      '-;IT00X0000000000000000000000;2.281,88 €;2.281,88 €',
      'Numero del conto 001/00000000/00;;;Intestato a: Mario Rossi',
      '"',
      '"',
      'Operazione;Valuta;Tipologia Operazione;Descrizione;Uscite;Entrate',
      '29/04/2026;26/04/2026;Prelievi - Pagamenti;Pagamenti paesi UE DEL 26/04/26 Valuta EUR Paese Italia C/O PETROL COMPANY SAN GREGORIO CA;-30.00 €;',
      '24/04/2026;24/04/2026;Bonifici;BONIFICO - SEPA ISTANTANEO A VS FAVORE PEOPLE FIRST SRL NOTE: STIPENDIO MARZO 2026;;2206.00 €'
    ].join('\n');

    const result = parseCsvTransactions(content);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      originalDescription:
        'Pagamenti paesi UE DEL 26/04/26 Valuta EUR Paese Italia C/O PETROL COMPANY SAN GREGORIO CA',
      amount: -30
    });
    expect(result[1]).toMatchObject({
      originalDescription:
        'BONIFICO - SEPA ISTANTANEO A VS FAVORE PEOPLE FIRST SRL NOTE: STIPENDIO MARZO 2026',
      amount: 2206
    });
  });
});
