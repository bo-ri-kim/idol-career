export const clamp = (n, min=0, max=100) => Math.max(min, Math.min(max,n));
export const integer = (min,max,rng=Math.random) => min+Math.floor(rng()*(max-min+1));
export const chance = (probability,rng=Math.random) => rng()<clamp(probability,0,1);
export function seeded(seed=1){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
