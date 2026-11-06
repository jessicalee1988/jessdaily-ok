(function(root){'use strict';
 const prices={lesson:{ppt:1000000,ppt_word:1500000},SKKN:{full:1500000},BCBP:{word:1000000,word_ppt:1500000}};
 const labels={lesson:'Bài giảng',SKKN:'SKKN',BCBP:'BCBP'};
 function fee(type,pkg){return prices[type]?.[pkg]??null}
 function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T12:00:00');return d.getFullYear()===+s.slice(0,4)&&d.getMonth()+1===+s.slice(5,7)&&d.getDate()===+s.slice(8,10)}
 function errors(p){const e=[],req=(v,name)=>{if(!String(v??'').trim())e.push('Vui lòng điền '+name+'.')};
 if(fee(p.jobType,p.package)==null)e.push('Gói dịch vụ không hợp lệ.');
 for(const [k,name] of [['name','họ tên'],['zalo','tên Zalo'],['contact','số điện thoại hoặc email'],['school','trường / đơn vị'],['province','tỉnh / thành phố'],['subject','môn học'],['book','bộ sách và lớp'],['context','đặc điểm trường / lớp']])req(p[k],name);
 if(!validDate(p.requestedDate))e.push('Ngày mong muốn nhận bài chưa hợp lệ.');if(!['vi','en'].includes(p.language))e.push('Chọn ngôn ngữ viết.');
 if(p.jobType==='lesson'){req(p.lesson,'Unit / bài / Lesson / tiết');req(p.duration,'thời lượng tiết dạy');if(!Number.isInteger(p.studentCount)||p.studentCount<1)e.push('Nhập số học sinh cụ thể.');}
 else{if(!p.helpTopic)req(p.topic,'chủ đề');if(!['TH','THCS','THPT'].includes(p.level))e.push('Chọn cấp học.');if(!Number.isInteger(p.studentCount)||p.studentCount<1)e.push('Số học sinh phải là số nguyên lớn hơn 0.');
 if(p.missingData)req(p.missingReason,'ghi chú số liệu còn thiếu');else{const n=p.level==='TH'?3:4;for(const [k,name]of [['before','trước'],['after','sau']]){const a=p[k];if(!Array.isArray(a)||a.length!==n||!a.every(x=>Number.isInteger(x)&&x>=0))e.push('Nhập đủ số học sinh '+name+' áp dụng.');else if(a.reduce((s,x)=>s+x,0)!==p.studentCount)e.push('Tổng số học sinh '+name+' áp dụng phải bằng '+p.studentCount+'.')}}}
 if(!p.acceptTerms)e.push('Cần xác nhận thông tin và quy định chỉnh sửa.');return e;
 }
 function newOrder(request,options={}){const p=request.payload;return {id:'intake-'+request.id,zalo:p.zalo,kind:labels[p.jobType],detail:[p.jobType==='lesson'?p.lesson:(p.helpTopic?'Nhờ Jess chọn giúp':p.topic),p.package==='ppt_word'?'PPT + hướng dẫn + giáo án Word':p.package==='ppt'?'PPT + hướng dẫn':p.package==='word_ppt'?'Word + PPT':p.package==='word'?'Word':'SKKN trọn bộ'].join(' · '),amount:Number(options.amount??request.fee_amount),paid:options.paid===true,paymentStatus:options.paid?'Đã chuyển khoản':'Chưa chuyển khoản',hours:Number(options.hours??(p.jobType==='lesson'?2:3)),deadline:options.deadline||'',receivedAt:options.paid?(options.receivedAt||''):'',status:options.deadline?'Chưa giao':'Chờ xếp lịch',waiting:!options.deadline,requestedDate:p.requestedDate,intakeId:request.id,intakePayload:p,intakeFiles:request.files||[],createdAt:new Date().toISOString()}}
 const model={prices,fee,errors,validDate,newOrder};if(typeof module==='object'&&module.exports)module.exports=model;else root.JessicaIntakeModel=model;
})(typeof window==='object'?window:globalThis);
