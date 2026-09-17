export function padNumber(value, digits) {
  return String(Math.max(0, Math.floor(value))).padStart(digits, '0');
}

export function hudFields(session, characterName) {
  return [
    { label: characterName, value: padNumber(session.score, 6) },
    { label: 'MONEDAS', value: `×${padNumber(session.coins, 2)}` },
    { label: 'MUNDO', value: '1-1' },
    { label: 'TIEMPO', value: padNumber(session.time, 3) },
    { label: 'VIDAS', value: `×${session.lives}` }
  ];
}
