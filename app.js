(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={raw:{},items:[],category:'All',query:'',sort:'name'};
const official=new Set([
  'anidb.app','comick.dev','weebcentral.com','dlive.sx','publiciptv.com'
]);
const slug=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return ''}};
const title=u=>{const h=slug(u);return h?h.split('.')[0].replace(/[-_]+/g,' ').replace(/\b\w/g,x=>x.toUpperCase()):'Catalog entry'};
const escape=s=>String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
async function load(){
  try{
    const res=await fetch('./data.json',{cache:'no-store'}); if(!res.ok)throw Error('data.json unavailable');
    const data=await res.json(); state.raw=data||{};
    state.items=Object.entries(state.raw).flatMap(([category,list])=>(Array.isArray(list)?list:[]).map((x,i)=>({category,url:x?.url||'',logo:x?.logo_url||'',index:i}))).filter(x=>x.url);
    render();
  }catch(e){
    $('#serviceGrid').innerHTML='<div class="empty"><h3>Could not load data.json</h3><p>Make sure data.json is available beside index.html.</p></div>';
  }
}
function verified(x){return official.has(slug(x.url))}
function render(){
  const cats=Object.entries(state.raw);
  const total=state.items.length;
  const safe=state.items.filter(verified);
  $('#totalCount').textContent=total;
  $('#categoryCount').textContent=cats.length;
  $('#visibleCount').textContent=safe.length;
  $('#progressBar').style.width=(total?Math.min(100,(safe.length/total)*100):0)+'%';
  renderCategories(cats); renderFilters(cats); renderServices(); bind();
}
function renderCategories(cats){
  $('#categoryGrid').innerHTML=cats.map(([name,list],i)=>`<article class="category" data-category="${escape(name)}"><span class="arrow">↗</span><div class="num">${String(list?.length||0).padStart(2,'0')}</div><h3>${escape(name)}</h3><p>${list?.length||0} catalog entries</p></article>`).join('');
  $$('.category').forEach(c=>c.onclick=()=>{state.category=c.dataset.category;document.querySelector('#directory').scrollIntoView({behavior:'smooth'});renderFilters(catsFromState());renderServices()});
}
function catsFromState(){return Object.entries(state.raw)}
function renderFilters(cats){
  $('#filters').innerHTML=['All',...cats.map(x=>x[0])].map(c=>`<button class="filter ${state.category===c?'active':''}" data-filter="${escape(c)}">${escape(c)}</button>`).join('');
  $$('.filter').forEach(b=>b.onclick=()=>{state.category=b.dataset.filter;renderFilters(catsFromState());renderServices()});
}
function renderServices(){
  const q=state.query.trim().toLowerCase();
  let list=state.items.filter(x=>(state.category==='All'||x.category===state.category));
  if(q)list=list.filter(x=>x.category.toLowerCase().includes(q)||title(x.url).toLowerCase().includes(q));
  if(state.sort==='name')list.sort((a,b)=>title(a.url).localeCompare(title(b.url)));
  if(state.sort==='category')list.sort((a,b)=>a.category.localeCompare(b.category)||title(a.url).localeCompare(title(b.url)));
  $('#resultCount').textContent=`${list.length} result${list.length===1?'':'s'}`;
  $('#serviceGrid').innerHTML=list.map((x,i)=>{
    const ok=verified(x), name=title(x.url);
    return `<article class="service"><div class="service-top"><div class="service-icon">${escape(name.slice(0,1).toUpperCase())}</div><span class="service .pill">${ok?'Verified':'Catalog'}</span></div><h3>${escape(name)}</h3><p>${escape(x.category)}</p>${ok?`<span class="pill">Official destination available</span>`:'<span class="pill">Stored in data.json</span>'}</article>`
  }).join('');
  $('#empty').classList.toggle('hidden',list.length!==0);
}
function bind(){
  $('#search').oninput=e=>{state.query=e.target.value;$('#clearSearch').style.opacity=state.query?'1':'.35';renderServices()};
  $('#clearSearch').onclick=()=>{$('#search').value='';state.query='';$('#clearSearch').style.opacity='.35';renderServices()};
  $('#sort').onchange=e=>{state.sort=e.target.value;renderServices()};
  $$('[data-scroll]').forEach(b=>b.onclick=()=>$(b.dataset.scroll).scrollIntoView({behavior:'smooth'}));
  $('#themeBtn').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem('moviehub-theme',document.body.classList.contains('light')?'light':'dark')};
  $('#menuBtn').onclick=()=>document.querySelector('.nav-links').classList.toggle('open');
}
if(localStorage.getItem('moviehub-theme')==='light')document.body.classList.add('light');
load();
})();
