import fs from 'fs';
import { synthesize, STARTER_LIBRARY } from '../synth.js';
const lib = JSON.parse(fs.readFileSync(new URL('./fixtures/motion_library.json', import.meta.url)));
function stats(acts){ let moves=0,dur=0,amp=0,c=0,maxv=0,minp=100,maxp=0;
  for(let i=1;i<acts.length;i++){const dt=acts[i].at-acts[i-1].at, dp=Math.abs(acts[i].pos-acts[i-1].pos);
    minp=Math.min(minp,acts[i].pos);maxp=Math.max(maxp,acts[i].pos);
    if(dp>=5){moves++;dur+=dt;amp+=dp;c+=(acts[i].pos+acts[i-1].pos)/2; maxv=Math.max(maxv,dp/dt*1000);} }
  return `rate ${(moves/2/(dur/1000)).toFixed(2)}/s amp ${(amp/moves).toFixed(0)} center ${(c/moves).toFixed(0)} range ${minp}-${maxp} maxVel ${maxv.toFixed(0)}%/s`; }
const lim={floor:0,ceil:100,maxVel:490,minMs:60};
const run=(label,intent,prefs={acts:{},motifs:{}},l=lib)=>{const r=synthesize({lib:l,intent,prefs,limits:lim,durationMs:60000,startPos:50});
  console.log(label.padEnd(34), stats(r.actions), '| motif phrases', r.used.filter(u=>u.motif).length+'/'+r.used.length);};
run('blowjob i=0.5',{act:'blowjob',intensity:0.5});
run('blowjob i=0.9',{act:'blowjob',intensity:0.9});
run('blowjob i=0.5 depth=-0.8',{act:'blowjob',intensity:0.5,depth:-0.8});
run('blowjob + user likes slower/tip',{act:'blowjob',intensity:0.5},{acts:{blowjob:{rateMul:0.7,ampMul:0.8,centerShift:10,variation:0.3}},motifs:{}});
run('doggy i=0.5',{act:'doggy',intensity:0.5});
run('doggy i=1.0 (speed cap test)',{act:'doggy',intensity:1,speedMul:2});
run('blowjob blend doggy:1',{act:'blowjob',intensity:0.5,blend:{doggy:1}});
run('starter deepthroat (untrained)',{act:'deepthroat',intensity:0.4},undefined,STARTER_LIBRARY);
const a=synthesize({lib,intent:{act:'blowjob',intensity:0.5},prefs:{acts:{},motifs:{}},limits:lim,durationMs:4000}).actions;
const b=synthesize({lib,intent:{act:'blowjob',intensity:0.5},prefs:{acts:{},motifs:{}},limits:lim,durationMs:4000}).actions;
console.log('two runs differ:', JSON.stringify(a.slice(1,5).map(x=>x.pos)), 'vs', JSON.stringify(b.slice(1,5).map(x=>x.pos)));
