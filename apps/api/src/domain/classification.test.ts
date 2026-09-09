import { describe, expect, it } from 'vitest';

import { classifyDescription } from './classification.js';

describe('classifyDescription', () => {
  it('extracts a known supermarket from a noisy POS description', () => {
    const result = classifyDescription('PAGAMENTO POS 1234 LIDL CATANIA');

    expect(result.normalizedDescription).toBe('LIDL');
    expect(result.category).toBe('Food');
    expect(result.matchSource).toBe('keyword');
  });

  it('prefers saved merchant rules over keyword matching', () => {
    const result = classifyDescription('PAGAMENTO POS 9999 LIDL CATANIA', [
      {
        pattern: 'LIDL',
        patternType: 'contains',
        normalizedName: 'LIDL VIA ETNEA',
        category: 'Food'
      }
    ]);

    expect(result.normalizedDescription).toBe('LIDL VIA ETNEA');
    expect(result.matchSource).toBe('rule');
  });

  it('recognizes salary transfers as income', () => {
    const result = classifyDescription('BONIFICO STIPENDIO APRILE ACME SPA');

    expect(result.normalizedDescription).toBe('STIPENDIO');
    expect(result.category).toBe('Income');
    expect(result.matchSource).toBe('keyword');
  });

  it('recognizes utility providers and cash withdrawals', () => {
    const utility = classifyDescription('ADDEBITO SDD TIM FISSO APRILE');
    const cash = classifyDescription('PRELIEVO ATM 1234 VIA ETNEA');

    expect(utility.normalizedDescription).toBe('TIM');
    expect(utility.category).toBe('Bills');
    expect(cash.normalizedDescription).toBe('PRELIEVO CONTANTE');
    expect(cash.category).toBe('Cash');
  });

  it('parses Mediolanum card merchants and restaurant categories from real patterns', () => {
    const result = classifyDescription(
      'PAGAMENTI PAESI UE CARTA N. 000 DEL 25/04/26 VALUTA EUR PAESE ITALIA C/O BAR KENNEDY S.R.L. ACIREALE CARTA N. 537572******7612 - CIRCUITO MASTERCARD COD. MCC 5812 000011030440'
    );

    expect(result.normalizedDescription).toBe('BAR KENNEDY');
    expect(result.category).toBe('Dining');
  });

  it('maps real withdrawal and utility transfer descriptions', () => {
    const withdrawal = classifyDescription(
      'PRELIEVI PAESI UE CARTA N. 000 DEL 22/04/26 VALUTA EUR PAESE ITALIA C/O UNICREDIT - CATANIA CATANIA CARTA N. 537572******7612 - CIRCUITO MASTERCARD COD. MCC 6011 000011030440'
    );
    const utilityTransfer = classifyDescription(
      'VOSTRA DISPOSIZIONE A FAV. FREELUCEGAS BONIFICO DISPOSTO IN: INTERNET COOR.BENEF.: IT94 N076 0114 4000 0104 5284 146 BANCA DESTINATARIA: 07601/14400-BPPIITRRXXX DATA ORDINE: 13/04/26 DATA REGOLAMENTO: 14/04/26 CRO: 0000028670612302483421084620IT NOTE: FATTURA E-2026-00094581 DEL 07 04 2026'
    );

    expect(withdrawal.normalizedDescription).toBe('UNICREDIT');
    expect(withdrawal.category).toBe('Cash');
    expect(utilityTransfer.normalizedDescription).toBe('FREELUCEGAS');
    expect(utilityTransfer.category).toBe('Bills');
  });

  it('extracts transfer counterpart for generic incoming bonifici', () => {
    const result = classifyDescription(
      'BONIFICO - SEPA ISTANTANEO A VS FAVORE MARIO ROSSI NOTE: REGALO COMPLEANNO DATA REGOLAMENTO: 25/04/26 CRO: ABC123'
    );

    expect(result.normalizedDescription).toBe('MARIO ROSSI');
    expect(result.category).toBe('Other');
  });
});
