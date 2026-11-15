/* the cover editor and the book must fit a standard laptop screen without scrolling */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();let bad=0;
for(const [w,h] of [[1366,768],[1280,720],[1366,650]]){
const pg=await (await b.newContext({viewport:{width:w,height:h}})).newPage();
await pg.goto('file://'+process.env.F);await pg.waitForTimeout(1200);
const r=await pg.evaluate(async()=>{P=sampleProject();P.draft={els:[],tp:{title:'The Night Has No Mercy',author:'A',genre:'Thriller'},at:0,syncedAt:0};go('script');await new Promise(r=>setTimeout(r,400));
bookOpen('pages');await new Promise(r=>setTimeout(r,700));const bk=document.getElementById('bkBook').getBoundingClientRect(),st=document.querySelector('.bk-stage').getBoundingClientRect();
const o={bookFits:bk.top>=st.top-1&&bk.bottom<=st.bottom+1};bookClose();await new Promise(r=>setTimeout(r,300));bookCoverEdit();await new Promise(r=>setTimeout(r,300));
const m=document.querySelector('.modal-b');o.modalNoScroll=m.scrollHeight<=m.clientHeight+1;o.modalInView=document.querySelector('.modal').getBoundingClientRect().bottom<=innerHeight;return o});
console.log(w+'x'+h,JSON.stringify(r));if(!r.bookFits||!r.modalNoScroll||!r.modalInView)bad++}
await b.close();console.log(bad?'FAIL laptop fit':'PASS laptop fit');process.exit(bad?1:0)})()
