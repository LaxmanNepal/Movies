(()=>{
  const root=document.documentElement;
  root.style.setProperty('--motion-fast','.18s');
  const reveal=()=>document.querySelectorAll('.section,.join-card,.about-card,.support-strip').forEach((el,i)=>{el.classList.add('reveal-ready');setTimeout(()=>el.classList.add('revealed'),Math.min(i*45,450))});
  const observe=()=>{if(!('IntersectionObserver' in window))return;const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -40px'});document.querySelectorAll('.section,.join-card,.about-card').forEach(el=>{el.classList.add('reveal-ready');io.observe(el)})};
  const ripple=e=>{const b=e.target.closest('.pill,.filter,.favorites-btn,.theme-btn,.clear-history,.category');if(!b)return;const r=document.createElement('span');r.className='ui-ripple';const box=b.getBoundingClientRect();r.style.left=(e.clientX-box.left)+'px';r.style.top=(e.clientY-box.top)+'px';b.appendChild(r);setTimeout(()=>r.remove(),500)};
  document.addEventListener('click',ripple,{passive:true});
  const updateScroll=()=>document.body.classList.toggle('has-scrolled',scrollY>24);window.addEventListener('scroll',updateScroll,{passive:true});updateScroll();
  const init=()=>{reveal();observe();document.querySelectorAll('.category,.service,.join-card,.about-card').forEach(el=>el.addEventListener('pointerenter',()=>el.style.setProperty('--hover-x','50%'),{passive:true}))};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();