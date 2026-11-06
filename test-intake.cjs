const assert=require('node:assert/strict'),M=require('./intake-model');
for(const [jobType,pkg] of [['lesson','ppt'],['SKKN','full'],['BCBP','word']]){
 const p={jobType,package:pkg,name:'Giáo viên',notes:'Nội dung cần làm',studentCount:null,before:[null,2],after:[]};
 assert.deepEqual(M.errors(p),[]);
 assert.deepEqual(M.errors({...p,name:'',zalo:'Tên Zalo'}),[]);
 assert(M.errors({...p,name:''}).length);
 assert(M.errors({...p,notes:''}).length);
 assert(M.errors({...p,requestedDate:'2026-02-30'}).length);
 assert(M.errors({...p,studentCount:-1}).length);
 const o=M.newOrder({id:'test',payload:p,files:[],fee_amount:M.fee(jobType,pkg)});
 assert.equal(o.zalo,p.name);assert(o.detail.includes(p.notes));assert.equal(o.paid,false);assert.equal(o.id,'intake-test');
}
assert.equal(M.fee('BCBP','ppt'),null);
console.log('PASS: minimal requests for all services, optional and partial information, identity/content checks, dates, fees and order conversion.');
