export const clamp = (n,min=0,max=100)=>Math.max(min,Math.min(max,n));
export const integer = (min,max,rng=Math.random)=>min+Math.floor(rng()*(max-min+1));
export const chance = (p,rng=Math.random)=>rng()<clamp(p,0,1);
export function seeded(seed=1){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// RNG state belongs to the saved life, never the animation loop.
export function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
