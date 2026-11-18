import {choose,nextDecision} from '../../js/engine.js';
// Existing scenario fixtures now complete the real consultation before accepting.
// New offer guard tests call raw choose directly to verify that bypass is impossible.
export function chooseWithReview(s,id,decisionId=s.pending?.id){
 if(id==='accept'&&s.pending?.kind==='contract'&&s.pending.choices.find(c=>c.id==='accept')?.disabled){
  const offerId=s.pending.data.offerId;if(!choose(s,'consult',decisionId))return false;nextDecision(s);
  if(s.pending?.kind!=='contract'||s.pending.data.offerId!==offerId)throw Error('Consultation did not return to the same offer');
  decisionId=s.pending.id;
 }
 return choose(s,id,decisionId);
}
