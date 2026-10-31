import test from 'node:test';
import assert from 'node:assert/strict';
import {compile,execute} from './compiler.mjs';
import {clean,broken} from './fixtures.mjs';
const codes=s=>compile(s).diagnostics.map(d=>d.code);
test('clean repeated fact and legitimate in-conversation disclosure compile and execute',()=>{
 const c=compile(clean+'system order_1.status shipped\n');assert.equal(c.ok,true);assert.equal(execute(c).status,'pass');
});
test('injected contradictions, leak and missing mock have exact source spans',()=>{
 const c=compile(broken);assert.deepEqual(c.diagnostics.map(d=>d.code),['E_CONTRADICTION','E_LEAK','E_MISSING_MOCK']);
 assert.deepEqual(c.diagnostics.map(d=>[d.line,d.column,d.endColumn]),[[3,9,23],[4,6,20],[6,13,27]]);assert.throws(()=>execute(c));
});
test('live tools clean without mock but local execution stays unknown',()=>{
 const c=compile('scenario live\ntool lookup live\ncall lookup order.status\nassert order.status shipped');assert.equal(c.ok,true);assert.equal(execute(c).status,'unknown');
 assert.ok(codes('scenario live\ntool lookup live\nmock lookup order.status shipped').includes('E_MODE_MISMATCH'));
});
test('similar order identities cannot satisfy missing mock or disclose private data',()=>{
 assert.ok(codes('scenario one\ntool lookup mock\nmock lookup order_2.id 123\ncall lookup order_1.id').includes('E_MISSING_MOCK'));
 assert.ok(codes('scenario one\nprivate order_1.id 123\nuser order_1.id 123').includes('E_LEAK'));
});
test('provenance order, mock contradiction and conflicting tool modes rejected',()=>{
 assert.ok(codes('scenario one\ntool lookup mock\nmock lookup order.id 123\nlearn lookup order.id').includes('E_PROVENANCE'));
 assert.ok(codes('scenario one\ninitial order.status shipped\ntool lookup mock\nmock lookup order.status cancelled').includes('E_CONTRADICTION'));
 assert.ok(codes('scenario one\ntool lookup live\ntool lookup mock').includes('E_MODE_CONFLICT'));
});
test('grammar failures retain line positions and never emit executable program',()=>{
 for(const s of ['scenario one\nblah nope','scenario one\nuser no_dot value','scenario one\nscenario two','']){const c=compile(s);assert.equal(c.ok,false);assert.equal(c.program,null);}
 const c=compile('scenario one\n  user bad x');assert.equal(c.diagnostics[0].line,2);assert.equal(c.diagnostics[0].column,3);
});
test('an assertion mismatch fails; unobserved assertion is unknown rather than pass',()=>{
 assert.equal(execute(compile(clean.replace('assert order_1.status shipped','assert order_1.status cancelled'))).status,'fail');
 assert.equal(execute(compile('scenario none\nassert order.status shipped')).status,'unknown');
});

test('cross-tool contradictory mocks rejected; assertion-free run is ungraded',()=>{
 assert.ok(codes('scenario one\ntool a mock\ntool b mock\nmock a order.status shipped\nmock b order.status cancelled').includes('E_CONTRADICTION'));
 assert.equal(execute(compile('scenario one')).status,'unknown');
});
