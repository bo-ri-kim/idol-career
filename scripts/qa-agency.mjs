import {createState,validState} from '../js/state.js';
import {begin,choose,nextDecision,advanceDay} from '../js/engine.js';
import {getOffer,contractDecision} from '../js/agency.js';
import {getContract,getRivals} from '../js/world.js';
export function auditAgency(seeds=100){
 const report={seeds,signed:0,declined:0,consultations:0,holds:0,byAgency:{},byRoute:{},identityMismatches:0,invalidStates:0,noContract:0,comparison:[]};let snapshot=null;
 for(let seed=1;seed<=seeds;seed++){
  const s=begin(createState('계약 QA','랜덤',seed));let declined=false,held=false;
  for(let turn=0;turn<150&&s.day<1200&&!s.contract;turn++){
   nextDecision(s);if(!validState(s))report.invalidStates++;const p=s.pending;if(!p)break;let id;
   if(p.kind==='contract'){
    const o=getOffer(s);snapshot??=structuredClone(s);
    if(p.data.offerId!==o.id||p.data.agencyId!==o.agencyId||!p.title.includes(s.world.agencies[o.agencyId].name))report.identityMismatches++;
    if(seed%5===0&&!declined){id='decline';declined=true;report.declined++;}
    else if(seed%3===0&&!held){id='hold';held=true;report.holds++;}
    else if(!o.consulted){id='consult';report.consultations++;}
    else id='accept';
    const agency=o.agencyId;if(!choose(s,id))throw Error('Invalid contract QA action');
    if(id==='accept'){report.signed++;report.byAgency[agency]=(report.byAgency[agency]||0)+1;report.byRoute[o.routeId]=(report.byRoute[o.routeId]||0)+1;if(s.agency!==agency||getContract(s).agencyId!==agency||getContract(s).offerId!==o.id)report.identityMismatches++;}
   }else{ id=({entry_offer:'apply',student_activity:['dance','music','video'][(seed-1)%3],student_showcase:'public',student_future:'continue',health:'rest'})[p.kind]||p.choices[0].id;if(!choose(s,id))throw Error('Invalid QA choice');}
   if(!validState(s))report.invalidStates++;
  }
  if(!s.contract)report.noContract++;
 }
 for(const agencyId of ['orbit','dawn']){
  const s=structuredClone(snapshot),o=getOffer(s);o.agencyId=agencyId;s.pending.data.agencyId=agencyId;for(const h of s.history)if(h.offerId===o.id)h.agencyId=agencyId;Object.assign(s.pending,contractDecision(s));choose(s,'consult');nextDecision(s);choose(s,'accept');s.queue=[];s.policy='balanced';const dance=s.stats.댄스,rap=s.stats.랩,rivals=getRivals(s).reduce((v,p)=>v+p.score,0)/s.rivals.length;for(let i=0;i<31;i++)advanceDay(s);
  const round=n=>Math.round(n*1000)/1000;report.comparison.push({agencyId,days:31,policy:'balanced',danceGrowth:round(s.stats.댄스-dance),rapGrowth:round(s.stats.랩-rap),rivalMeanChange:round(getRivals(s).reduce((v,p)=>v+p.score,0)/s.rivals.length-rivals)});
 }
 return report;
}
if(process.argv[1]?.endsWith('qa-agency.mjs'))console.log(JSON.stringify(auditAgency(),null,2));
