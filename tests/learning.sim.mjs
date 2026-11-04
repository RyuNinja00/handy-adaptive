import { synthesize, exploration, reinforce, REWARD } from '../synth.js';
const motifs = Array.from({length:30},(_,i)=>({id:'m'+i, rate:1.2+0.02*i, amp:45, center:65, strokes:Array.from({length:8},(_,k)=>[350+i*5, k%2? 45+i%5 : 88-i%7])}));
const lib={acts:{blowjob:{rate:{mean:1.4},amp:{mean:45},center:{mean:66},irregularity:.3,asym:1.1,pause_frac:.05,amp_std:10,motifs}}};
const liked=new Set(['m3','m11','m19','m24']);
const prefs={acts:{blowjob:{rateMul:1,ampMul:1,centerShift:0,variation:.35,score:0,n:0,loves:0}},motifs:{},trans:{},exploreBias:1};
let prev=null; const out=[];
for (let round=1; round<=20; round++){
  let likedN=0,total=0,chain=0,afterM3=0;
  for (let k=0;k<6;k++){                      // 6 minutes per round
    const r=synthesize({lib,intent:{act:'blowjob',intensity:.5},prefs,limits:{maxVel:490},durationMs:60000,prevMotif:prev});
    const ph=r.used.filter(u=>u.motif);
    for (let i=0;i<ph.length;i++){
      const m=ph[i].motif, p=i>0?ph[i-1].motif:prev; total++; if(liked.has(m)) likedN++;
      const combo = p==='m3' && m==='m19'; if(combo) chain++; if(p==='m3') afterM3++;
      const pLove = combo ? 0.9 : liked.has(m) ? 0.45 : 0;
      const a=prefs.acts.blowjob;
      if (Math.random()<pLove){ reinforce(prefs.motifs,m,REWARD.love); if(p) reinforce(prefs.trans,p+'>'+m,REWARD.love); a.n++; a.loves++; }
      else if (!liked.has(m) && Math.random()<0.3){ reinforce(prefs.motifs,m,REWARD.nope); if(p) reinforce(prefs.trans,p+'>'+m,REWARD.nope); a.n++; }
      else { reinforce(prefs.motifs,m,REWARD.neutral,0.05); if(p) reinforce(prefs.trans,p+'>'+m,REWARD.neutral,0.05); }
    }
    prev=r.lastMotif;
  }
  out.push({round, liked:Math.round(100*likedN/total), combo: afterM3? Math.round(100*chain/afterM3):null});
}
const pick=r=>out[r-1];
console.log([1,3,5,10,20].map(r=>`r${r}: liked ${pick(r).liked}% after-m3→m19 ${pick(r).combo ?? '-'}%`).join(' | '));
