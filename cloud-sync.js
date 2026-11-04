(function(){
'use strict';
const $=s=>document.querySelector(s),bridge=()=>window.JessicaBridge;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const valid=p=>Array.isArray(p)&&p.every(o=>o&&typeof o.id==='string'&&typeof o.zalo==='string'&&Number.isFinite(o.amount))&&new Set(p.map(o=>o.id)).size===p.length;
const status=s=>{if($('#cloudStatus'))$('#cloudStatus').textContent=s;if($('#syncBadge'))$('#syncBadge').textContent=s};
let sb,session,busy=false,applying=false,timer,meta=null,conflict=null,epoch=0,otherTab=false;
const key=uid=>'jessica-sync-v3:'+uid;
function read(uid){try{return JSON.parse(localStorage.getItem(key(uid))||'null')}catch{return null}}
function write(uid,data){localStorage.setItem(key(uid),JSON.stringify(data));if(session?.user.id===uid)meta=data}
function backup(uid,payload){
 const k='jessica-sync-recovery:'+uid;let history;try{history=JSON.parse(localStorage.getItem(k)||'[]')}catch{history=[]}
 if(!Array.isArray(history))history=[];history.unshift({at:new Date().toISOString(),orders:payload});localStorage.setItem(k,JSON.stringify(history.slice(0,5)));
}
function remember(uid,row,payload){write(uid,{base:payload,updated_at:row?.updated_at||null});localStorage.setItem('jessica-sync-owner',uid)}
function controls(){
 if($('#cloudLogin'))$('#cloudLogin').hidden=!!session;if($('#cloudActions'))$('#cloudActions').hidden=!session;
 for(const b of document.querySelectorAll('[data-cloud-action], [data-resolve]'))b.disabled=busy||otherTab;
 if($('#cloudConflict'))$('#cloudConflict').hidden=!conflict;
}
function clash(row){conflict=row||{payload:[],updated_at:null};status('Có xung đột: thiết bị và đám mây khác nhau. Chưa ghi đè bên nào. Chọn bản cần giữ bên dưới.');controls()}
async function remote(uid){
 const {data,error}=await sb.from('jessica_snapshots').select('payload,updated_at').eq('user_id',uid).maybeSingle();if(error)throw error;
 if(data&&!valid(data.payload))throw Error('Dữ liệu đám mây không hợp lệ hoặc trùng mã order.');return data;
}
async function push(uid,row,payload){
 // Atomic compare-and-swap prevents overwriting another device's newer snapshot.
 const stamp=new Date(Math.max(Date.now(),(Date.parse(row?.updated_at)||0)+1)).toISOString();let result;
 if(row)result=await sb.from('jessica_snapshots').update({payload,updated_at:stamp}).eq('user_id',uid).eq('updated_at',row.updated_at).select('updated_at');
 else result=await sb.from('jessica_snapshots').insert({user_id:uid,payload,updated_at:stamp}).select('updated_at');
 if(result.error){if(result.error.code==='23505')return false;throw result.error}if(result.data?.length!==1)return false;
 remember(uid,{updated_at:result.data[0].updated_at},payload);return true;
}
function apply(uid,row,payload){backup(uid,bridge().getOrders());applying=true;try{bridge().replaceOrders(payload)}finally{applying=false}remember(uid,row,payload)}
function queue(delay=900){clearTimeout(timer);timer=setTimeout(()=>sync(),delay)}
async function sync(choice){
 if(busy||otherTab||!session||!bridge()||(!choice&&conflict))return;
 if(navigator.onLine===false){status('Mất mạng · Thay đổi được lưu trên thiết bị, sẽ đồng bộ khi có mạng.');return}
 const uid=session.user.id,runEpoch=epoch;busy=true;controls();status('Đang đồng bộ…');
 try{
  const row=await remote(uid);if(epoch!==runEpoch)return;
  const local=bridge().getOrders(),cloud=row?.payload||[];
  if(!valid(local))throw Error('Dữ liệu thiết bị không hợp lệ hoặc trùng mã order. Hãy xuất JSON.');
  if(choice==='download'){
   if(!row){status('Đám mây chưa có bản dữ liệu.');return}
   if(!equal(local,cloud)&&!confirm('Dùng '+cloud.length+' order từ đám mây thay cho '+local.length+' order trên thiết bị? Bản thiết bị sẽ được giữ để phục hồi.')){clash(row);return}apply(uid,row,cloud);
  }else if(choice==='upload'){
   if(!equal(local,cloud)&&!confirm('Giữ '+local.length+' order thiết bị và thay bản đám mây ('+cloud.length+' order)? Bản cũ được giữ để phục hồi.')){clash(row);return}
   backup(uid,cloud);if(!await push(uid,row,local)){clash(await remote(uid));return}
  }else if(choice==='merge'){
   const ids=new Set(local.map(o=>o.id)),fresh=cloud.filter(o=>!ids.has(o.id));
   if(!fresh.length){status('Không có order mới. Order trùng mã cần chọn bản cần giữ.');return}
   if(!confirm('Nhập thêm '+fresh.length+' order? Order trùng mã giữ bản thiết bị; cần giải quyết xung đột trước khi tải lên.'))return;
   backup(uid,local);applying=true;try{bridge().replaceOrders([...local,...fresh])}finally{applying=false}clash(row);return;
  }else if(equal(local,cloud))remember(uid,row,local);
  else if(!meta){
   const owner=localStorage.getItem('jessica-sync-owner');
   if(!local.length&&row)apply(uid,row,cloud);
   else if(!row&&(!owner||owner===uid)){if(!await push(uid,null,local)){clash(await remote(uid));return}}
   else{clash(row);return}
  }else{
   const localChanged=!equal(local,meta.base),remoteChanged=!equal(cloud,meta.base);
   if(localChanged&&remoteChanged){clash(row);return}
   if(remoteChanged){if(!row){clash(row);return}apply(uid,row,cloud)}
   else if(localChanged){if(!row&&meta.updated_at){clash(row);return}if(!await push(uid,row,local)){clash(await remote(uid));return}}
   else remember(uid,row,local);
  }
  if(epoch!==runEpoch)return;conflict=null;const current=bridge().getOrders();
  if(!equal(current,meta.base)){status('Có thay đổi mới · Đang chờ đồng bộ…');queue()}
  else status('Đã đồng bộ '+current.length+' order · '+new Date().toLocaleTimeString('vi-VN'));
 }catch(e){status('Chưa đồng bộ · Dữ liệu vẫn trên thiết bị. '+String(e.message||e))}
 finally{busy=false;controls()}
}
async function initialize(){try{
 const r=await fetch('/api/cloud-config',{cache:'no-store'});if(!r.ok)throw Error('Không đọc được cấu hình');const cfg=await r.json();
 if(!cfg.configured){status('Chưa thiết lập đám mây. Dữ liệu vẫn lưu trên thiết bị.');return}
 if(!window.supabase?.createClient)throw Error('Thiếu thư viện đăng nhập');
 sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const adopt=s=>{const previous=session?.user.id;session=s;if(previous!==s?.user.id){epoch++;conflict=null;meta=s?read(s.user.id):null;if(s)queue(0)}controls();if(!s)status('Đã cấu hình kết nối. Đăng nhập để bật đồng bộ tự động.');};
 const {data,error}=await sb.auth.getSession();if(error)throw error;adopt(data.session);sb.auth.onAuthStateChange((_event,s)=>adopt(s));
}catch(e){status('Chưa kết nối được đám mây: '+String(e.message||e))}}
async function auth(signup){if(!sb)return;try{
 const email=$('#cloudEmail').value.trim(),password=$('#cloudPassword').value;if(!email||password.length<8)return status('Nhập email và mật khẩu từ 8 ký tự.');
 const {error}=await sb.auth[signup?'signUp':'signInWithPassword']({email,password});if(error)throw error;$('#cloudPassword').value='';if(signup)status('Kiểm tra email xác minh rồi đăng nhập.');
}catch(e){status('Không đăng nhập được: '+e.message)}}
window.addEventListener('jessica:orders-changed',()=>{if(applying)return;if(session){status(conflict?'Có xung đột · Thay đổi vẫn lưu trên thiết bị.':'Đã lưu trên thiết bị · Đang chờ đồng bộ…');queue()}});
window.addEventListener('online',()=>queue(0));window.addEventListener('offline',()=>status('Mất mạng · Thay đổi được lưu trên thiết bị.'));
window.addEventListener('focus',()=>queue(0));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queue(0)});
window.addEventListener('storage',e=>{if(e.key==='jessica-daily-v1'){otherTab=true;controls();status('Dữ liệu vừa thay đổi trong tab khác. Hãy tải lại trang trước khi sửa tiếp.')}});
window.addEventListener('DOMContentLoaded',()=>{
 const badge=document.createElement('p');badge.id='syncBadge';badge.className='notice';badge.setAttribute('role','status');document.querySelector('header')?.after(badge);
 const panel=document.createElement('div');panel.id='cloudConflict';panel.hidden=true;
 panel.innerHTML='<p>Cả hai bản được giữ nguyên đến khi bạn chọn. Hãy xuất JSON trước nếu cần.</p><div class="actions"><button type="button" data-resolve="download">Giữ bản đám mây</button><button type="button" data-resolve="upload">Giữ bản thiết bị</button></div>';
 $('#cloudAuth')?.append(panel);for(const b of panel.querySelectorAll('[data-resolve]'))b.addEventListener('click',()=>sync(b.dataset.resolve));
 $('#cloudSignIn')?.addEventListener('click',()=>auth(false));$('#cloudSignUp')?.addEventListener('click',()=>auth(true));
 $('#cloudSignOut')?.addEventListener('click',async()=>{if(busy)return;const {error}=await sb.auth.signOut();if(error)status(error.message)});
 for(const b of document.querySelectorAll('[data-cloud-action]'))b.addEventListener('click',()=>sync(b.dataset.cloudAction));
 setInterval(()=>{if(document.visibilityState==='visible')queue(0)},30000);initialize();
});
})();
