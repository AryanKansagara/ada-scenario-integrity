import {readFile} from 'node:fs/promises';
import {compile,execute} from './compiler.mjs';
import {clean,broken} from './fixtures.mjs';
if(process.argv[2]) {
 const result=compile(await readFile(process.argv[2],'utf8'));
 console.log(JSON.stringify({...result,execution:result.ok?execute(result):null},null,2));
 if(!result.ok)process.exitCode=1;
} else console.log(JSON.stringify({provenance:'executed authored corpus',vendorIntegration:false,clean:{...compile(clean),execution:execute(compile(clean))},broken:compile(broken)},null,2));
