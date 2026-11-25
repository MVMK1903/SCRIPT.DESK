const {chromium}=require('playwright');const F=process.env.F||process.cwd()+'/www/index.html';let bad=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)bad++};
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1366,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{const V=[{name:'Alpha',voiceURI:'alpha',lang:'en-US',localService:true},{name:'Beta',voiceURI:'beta',lang:'en-GB',localService:true},{name:'Gamma',voiceURI:'gamma',lang:'en-IN',localService:true}];window.__said=[];
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>V,speak(u){window.__said.push([u.text,u.voice&&u.voice.voiceURI]);setTimeout(()=>u.onend&&u.onend(),5)},cancel(){},onvoiceschanged:null},configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t};});
await pg.goto('file://'+F);await pg.waitForTimeout(600);
const r=await pg.evaluate(async()=>{const g=document.getElementById('galock');if(g)g.remove();P=sampleProject();wrFromProject();go('script');await new Promise(r=>setTimeout(r,600));const o={};
 const say=async()=>{window.__said=[];const q=raBuild('h','x','',{heading:'Scene 1. Interior. house.'});q.forEach(i=>{i.el=document.body;i.pb=0;i.pa=0});RA.lang='';RA.on=true;RA.q=q;RA.i=0;raNext();await new Promise(r=>setTimeout(r,200));return window.__said[0]&&window.__said[0][1]};
 document.querySelector('.fs-tools [data-fsx=voice]').click();await new Promise(r=>setTimeout(r,200));
 const sel=document.querySelector('#ov select[data-chv=""]');sel.value='beta';sel.dispatchEvent(new Event('change'));o.beta=await say();
 sel.value='gamma';sel.dispatchEvent(new Event('change'));o.gamma=await say();
 // natural engine selected but model failed: choices must still apply
 VO().engine='natural';TTS.state='error';TTS.raw='x';VO().narrator='gamma';o.fallback=await say();
 o.listIsDevice=(voiceSelHtml('').match(/value="gamma"/)||[]).length===1;return o});
console.log(JSON.stringify(r));ok(r.beta==='beta','narrator change to Beta used');ok(r.gamma==='gamma','narrator change to Gamma used');ok(r.fallback==='gamma','chosen device voice kept when natural voices failed');ok(r.listIsDevice,'list shows device voices after failure');ok(errs.length===0,'no errors '+errs);await b.close();process.exit(bad?1:0)})();
