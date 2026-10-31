/** Deterministic, explicit-fact DSL. Does not judge natural-language consistency. */
const word=/^[A-Za-z_][A-Za-z0-9_-]*$/;
const keyPattern=/^[A-Za-z_][A-Za-z0-9_-]*\.[A-Za-z_][A-Za-z0-9_-]*$/;
const diagnostic=(node,code,message,index=1)=>({code,message,line:node.line,column:node.tokens[index]?.column??1,endColumn:node.tokens[index]?.endColumn??node.raw.length+1});
export function compile(source) {
 if(typeof source!=='string') throw Error('source string required');
 const diagnostics=[],nodes=[];
 for(const [index,raw] of source.split(/\r?\n/).entries()) {
  const text=raw.replace(/\s*\/\/.*$/,'');
  const tokens=[...text.matchAll(/\S+/g)].map(m=>({value:m[0],column:m.index+1,endColumn:m.index+m[0].length+1}));
  if(!tokens.length)continue;
  const node={line:index+1,raw,tokens,op:tokens[0].value,args:tokens.slice(1).map(t=>t.value)};
  const a=node.args;
  const valid= node.op==='scenario'&&a.length===1&&word.test(a[0]) ||
   ['initial','system','private','user'].includes(node.op)&&a.length===2&&keyPattern.test(a[0]) ||
   node.op==='tool'&&a.length===2&&word.test(a[0])&&['mock','live'].includes(a[1]) ||
   node.op==='mock'&&a.length===3&&word.test(a[0])&&keyPattern.test(a[1]) ||
   ['call','learn'].includes(node.op)&&a.length===2&&word.test(a[0])&&keyPattern.test(a[1]) ||
   node.op==='assert'&&a.length===2&&keyPattern.test(a[0]);
  if(!valid)diagnostics.push(diagnostic(node,'E_SYNTAX','unsupported command or argument shape',0));else nodes.push(node);
 }
 const scenarios=nodes.filter(n=>n.op==='scenario');
 if(scenarios.length!==1)diagnostics.push({code:'E_SCENARIO',message:'exactly one scenario required',line:1,column:1,endColumn:1});
 const tools=new Map(),facts=new Map(),privateFacts=new Map(),mocks=new Map();
 for(const node of nodes) {
  const [a,b,c]=node.args;
  if(node.op==='tool') {
   if(tools.has(a)&&tools.get(a)!==b)diagnostics.push(diagnostic(node,'E_MODE_CONFLICT','conflicting tool modes'));
   tools.set(a,b);
  }
  if(['initial','system','private'].includes(node.op)) {
   if(facts.has(a)&&facts.get(a)!==b)diagnostics.push(diagnostic(node,'E_CONTRADICTION','same-time fixture facts disagree'));
   facts.set(a,b);if(node.op==='private')privateFacts.set(a,b);
  }
  if(node.op==='mock') {
   const key=`${a}:${b}`;
   if(mocks.has(key)&&mocks.get(key)!==c)diagnostics.push(diagnostic(node,'E_CONTRADICTION','mock record has conflicting values',2));
   mocks.set(key,c);
  }
 }
 for(const node of nodes.filter(n=>n.op==='mock')) {
  const [tool,key,value]=node.args;
  if(!tools.has(tool))diagnostics.push(diagnostic(node,'E_TOOL','mock refers to undeclared tool'));
  else if(tools.get(tool)==='live')diagnostics.push(diagnostic(node,'E_MODE_MISMATCH','live tools cannot have mock records'));
  if(facts.has(key)&&facts.get(key)!==value)diagnostics.push(diagnostic(node,'E_CONTRADICTION','mock and scenario same-time state disagree',2));
 }
 const externalFacts=new Map();
 for(const node of nodes.filter(n=>n.op==='mock')) {
  const [,key,value]=node.args;
  if(externalFacts.has(key)&&externalFacts.get(key)!==value)diagnostics.push(diagnostic(node,'E_CONTRADICTION','external mocks disagree on the same-time entity fact',2));
  externalFacts.set(key,value);
 }
 const learned=new Map(),called=new Set(),userFacts=new Map();
 for(const node of nodes) {
  const [a,b]=node.args;
  if(['call','learn'].includes(node.op)) {
   if(!tools.has(a))diagnostics.push(diagnostic(node,'E_TOOL','undeclared tool'));
   else if(tools.get(a)==='mock'&&!mocks.has(`${a}:${b}`))diagnostics.push(diagnostic(node,'E_MISSING_MOCK','mocked tool has no requested record',2));
   if(node.op==='call')called.add(`${a}:${b}`);
   else if(!called.has(`${a}:${b}`))diagnostics.push(diagnostic(node,'E_PROVENANCE','learn requires an earlier call',2));
   else if(tools.get(a)==='mock'&&mocks.has(`${a}:${b}`))learned.set(b,mocks.get(`${a}:${b}`));
  }
  if(node.op==='user') {
   if(userFacts.has(a)&&userFacts.get(a)!==b)diagnostics.push(diagnostic(node,'E_CONTRADICTION','user facts disagree'));
   if(privateFacts.has(a)&&learned.get(a)!==b)diagnostics.push(diagnostic(node,'E_LEAK','private fact in user knowledge without prior mocked disclosure'));
   if(learned.has(a)&&learned.get(a)!==b)diagnostics.push(diagnostic(node,'E_CONTRADICTION','user fact conflicts with disclosed value'));
   userFacts.set(a,b);
  }
 }
 return {schemaVersion:1,ok:diagnostics.length===0,diagnostics,program:diagnostics.length?null:{name:scenarios[0].args[0],nodes:nodes.map(({raw,tokens,...rest})=>rest),tools:Object.fromEntries(tools),mocks:Object.fromEntries(mocks)},scope:'explicit same-time symbolic facts only; no Ada integration or natural-language grading'};
}

export function execute(compiled) {
 if(!compiled?.ok||!compiled.program)throw Error('cannot execute rejected scenario');
 const {nodes,tools,mocks}=compiled.program;const observations=[],values=new Map();let unknown=false;
 for(const node of nodes) {
  const [a,b]=node.args;
  if(node.op==='call') {
   if(tools[a]==='live'){unknown=true;observations.push({line:node.line,kind:'call',tool:a,key:b,status:'unknown',reason:'live tools are never executed'});}
   else {values.set(b,mocks[`${a}:${b}`]);observations.push({line:node.line,kind:'call',tool:a,key:b,status:'mocked',value:mocks[`${a}:${b}`]});}
  }
  if(node.op==='assert') {
   const status=!values.has(a)?'unknown':values.get(a)===b?'pass':'fail';
   if(status==='unknown')unknown=true;
   observations.push({line:node.line,kind:'assert',key:a,expected:b,actual:values.get(a)??null,status});
  }
 }
 return {provenance:'authored local mock execution',status:observations.some(o=>o.status==='fail')?'fail':unknown||!observations.some(o=>o.kind==='assert')?'unknown':'pass',observations};
}
