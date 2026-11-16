import {integer} from './random.js';
export const stats=['보컬','댄스','랩','연기','스타성','멘탈','체력'];
export const stages={entry:'꿈의 시작',trainee:'연습생',debut:'데뷔 도전',group:'그룹 활동',solo:'솔로 활동',actor:'배우 활동',producer:'제작자 활동',ended:'커리어 종료'};
export const randomName=(rng=Math.random)=>['하린','시온','유진','서우','지안','도윤','수빈','이든'][integer(0,7,rng)];
export function createState(name,gender,rng=Math.random){let age=integer(13,18,rng);return {version:1,name:name.trim().slice(0,16)||randomName(rng),gender:gender==='랜덤'?['남성','여성'][integer(0,1,rng)]:gender,age,startAge:age,month:0,turn:0,stage:'entry',stats:Object.fromEntries(stats.map(s=>[s,integer(18,58,rng)])),appearance:integer(15,95,rng),family:['빠듯한 살림','평범한 가정','여유 있는 가정'][integer(0,2,rng)],money:integer(0,300,rng),popularity:0,peak:0,attempts:0,training:0,credits:0,idolRetired:false,achievements:[],history:[],seen:{},current:null,ending:null};}
const KEY='idol-career-v01';
export function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}}
export function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||s.version!==1||!stages[s.stage]||!s.stats||!Array.isArray(s.history)||!s.seen||!Number.isFinite(s.age)||stats.some(k=>!Number.isFinite(s.stats[k])))return null;return s;}catch{return null;}}
export function clear(){localStorage.removeItem(KEY);}
