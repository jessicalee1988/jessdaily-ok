(function(root){'use strict';
 const prices={lesson:{ppt:1000000,ppt_word:1500000},SKKN:{full:1500000},BCBP:{word:1000000,word_ppt:1500000}};
 const labels={lesson:'Bài giảng',SKKN:'SKKN',BCBP:'BCBP'};
 function fee(type,pkg){return prices[type]?.[pkg]??null}
 function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T12:00:00');return d.getFullYear()===+s.slice(0,4)&&d.getMonth()+1===+s.slice(5,7)&&d.getDate()===+s.slice(8,10)}
 function errors(p){const e=[],req=(v,name)=>{if(!String(v??'').trim())e.push('Vui lòng điền '+name+'.')};
 if(fee(p.jobType,p.package)==null)e.push('Gói dịch vụ không hợp lệ.');
 if(!String(p.name||p.zalo||'').trim())e.push('Vui lòng điền tên hoặc tên Zalo của người đặt.');
 if(![p.lesson,p.topic,p.notes].some(v=>String(v||'').trim())&&!p.helpTopic)e.push('Vui lòng mô tả nội dung cần làm hoặc chọn nhờ Jess chọn chủ đề.');
 if(p.requestedDate&&!validDate(p.requestedDate))e.push('Ngày mong muốn nhận bài chưa hợp lệ.');
 if(p.studentCount!=null&&p.studentCount!==''&&(!Number.isInteger(p.studentCount)||p.studentCount<1||p.studentCount>100000))e.push('Số học sinh phải là số nguyên từ 1 đến 100.000.');
 return e;
 }
 function newOrder(request,options={}){const p=request.payload;return {id:'intake-'+request.id,zalo:p.zalo||p.name,kind:labels[p.jobType],detail:[p.jobType==='lesson'?(p.lesson||p.notes):(p.helpTopic?'Nhờ Jess chọn giúp':(p.topic||p.notes)),p.package==='ppt_word'?'PPT + hướng dẫn + giáo án Word':p.package==='ppt'?'PPT + hướng dẫn':p.package==='word_ppt'?'Word + PPT':p.package==='word'?'Word':'SKKN trọn bộ'].join(' · '),amount:Number(options.amount??request.fee_amount),paid:options.paid===true,paymentStatus:options.paid?'Đã chuyển khoản':'Chưa chuyển khoản',hours:Number(options.hours??(p.jobType==='lesson'?2:3)),deadline:options.deadline||'',receivedAt:options.paid?(options.receivedAt||''):'',status:options.deadline?'Chưa giao':'Chờ xếp lịch',waiting:!options.deadline,requestedDate:p.requestedDate,intakeId:request.id,intakePayload:p,intakeFiles:request.files||[],createdAt:new Date().toISOString()}}
 const model={prices,fee,errors,validDate,newOrder};if(typeof module==='object'&&module.exports)module.exports=model;else root.JessicaIntakeModel=model;
})(typeof window==='object'?window:globalThis);
