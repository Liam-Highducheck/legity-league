/** CSS color-mix(in srgb, a pct%, b) for #rrggbb colours. `amount` is the share of `a`, 0..1. */
export function mixHex(a: string, b: string, amount: number): string {
  const p = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [ar, ag, ab] = p(a)
  const [br, bg, bb] = p(b)
  const m = (x: number, y: number) => Math.round(x * amount + y * (1 - amount))
  return `rgb(${m(ar, br)}, ${m(ag, bg)}, ${m(ab, bb)})`
}
