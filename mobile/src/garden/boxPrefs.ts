import type { BoxVariant } from './BoxScene'

/** Which opening animation the garden plays. Set from the box lab for now (this session only); the default is the gift box. */
let current: BoxVariant = 'gift'
export const getBoxVariant = () => current
export const setBoxVariant = (v: BoxVariant) => {
  current = v
}
