import {createState} from '../js/state.js';
import {begin,advanceDay,choose} from '../js/engine.js';
import {news} from '../js/events.js';
import {catalogue,eligibleNews} from '../js/news-scheduler.js';
export function auditNews(seeds=100){
 const result={seeds,daysPerSeed:365,notices:0,uniqueWithinLives:0,duplicates:0,adjacentSameTopic:0,impossible:0,byStage:{},eventIds:[]};const ids=new Set();
 const policy={entry_offer:'apply',contract:'accept',meet_trainee:'befriend',relationship_moment:'cooperate',final:'challenge',retry:'retry',health:'rest',late:'actor',future:'continue',comeback:'steady',acting:'support',production:'coach',student_future:'continue'};
 for(let seed=1;seed<=seeds;seed++){
  const s=begin(createState('QA','랜덤',seed)),seen=new Set();let lastTopic=null,guard=0;
  while(s.day<365&&s.stage!=='ended'&&guard++<2000){if(s.pending){choose(s,policy[s.pending.kind]||s.pending.choices[0].id);continue;}
   const start=s.history.length;advanceDay(s);
   for(const row of s.history.slice(start)){
    const legacy=news.find(n=>n.title===row.title);const id=row.eventId||legacy?.id;if(!id)continue;
    const template=catalogue.find(n=>n.id===id);if(!template||!eligibleNews(s,template))result.impossible++;
    if(row.personIds?.some(pid=>!s.world.people[pid]||s.world.people[pid].agencyId!==s.agency))result.impossible++;
    result.notices++;ids.add(id);if(seen.has(id))result.duplicates++;else{seen.add(id);result.uniqueWithinLives++;}
    const topic=row.topic||legacy?.category;if(topic===lastTopic)result.adjacentSameTopic++;lastTopic=topic;
    result.byStage[row.stage]=(result.byStage[row.stage]||0)+1;
    if(row.newsContext){const c=row.newsContext;if((['student','auditioning'].includes(row.stage)&&(c.agencyId||c.groupId))||(['trainee','debut_candidate','idol'].includes(row.stage)&&!c.agencyId)||(row.stage==='idol'&&(!c.groupId||!c.debuted)))result.impossible++;}
    if(/chart|tour|military/.test(id))result.impossible++;
   }
  }
  if(guard>=2000)throw Error('QA simulation did not progress');
 }
 result.uniqueRatio=result.notices?Number((result.uniqueWithinLives/result.notices).toFixed(4)):1;result.eventIds=[...ids].sort();return result;
}
if(process.argv[1]?.endsWith('qa-news.mjs'))console.log(JSON.stringify(auditNews(),null,2));
