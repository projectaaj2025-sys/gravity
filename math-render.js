// Явные LaTeX-записи вынесенных формул: порядок соответствует тематическим блокам курса.
const displayMath = {
'units-math': [String.raw`[v]=\frac{L}{T},\quad [a]=\frac{L}{T^2},\quad [G]=\frac{L^3}{MT^2}`,String.raw`v=\frac{dr}{dt},\quad a=\frac{dv}{dt}=\frac{d^2r}{dt^2}`,String.raw`v=\lim_{\Delta t\to0}\frac{\Delta x}{\Delta t}`],
forces:[String.raw`\sum F=ma,\quad a=\frac{\sum F}{m}`],
orbits:[String.raw`ma=\frac{GMm}{r^2},\quad a=\frac{v^2}{r}`,String.raw`T^2=\frac{4\pi^2r^3}{GM}`],
'relativity-geometry':[String.raw`ds^2=-c^2dt^2+dx^2+dy^2+dz^2`,String.raw`\Delta t=\gamma\Delta\tau,\quad \gamma=\frac{1}{\sqrt{1-\frac{v^2}{c^2}}}`],
newton:[String.raw`F=\frac{Gm_1m_2}{r^2}`,String.raw`G_{\mu\nu}+\Lambda g_{\mu\nu}=\frac{8\pi G}{c^4}T_{\mu\nu}`,String.raw`\Phi(r)=-\frac{GM}{r},\quad g_r=-\frac{d\Phi}{dr}=-\frac{GM}{r^2}`,String.raw`\nabla^2\Phi=4\pi G\rho`],
toolkit:[String.raw`S_{\mathrm{EH}}=\frac{c^3}{16\pi G}\int d^4x\,\sqrt{-g}\,(R-2\Lambda)+S_{\mathrm m}`,String.raw`T=g^{\mu\nu}T_{\mu\nu}`],
mond:[String.raw`\mu\!\left(\frac{g}{a_0}\right)g=g_{\mathrm N}`,String.raw`v^4=GMa_0,\quad v=(GMa_0)^{\frac14}`,String.raw`g=\frac{g_{\mathrm N}+\sqrt{g_{\mathrm N}^2+4a_0g_{\mathrm N}}}{2}`],
fr:[String.raw`S=\frac{c^3}{16\pi G}\int d^4x\,\sqrt{-g}\,f(R)+S_{\mathrm m}`],
scalar:[String.raw`S\propto\int d^4x\,\sqrt{-g}\!\left[\phi R-\frac{\omega}{\phi}(\partial\phi)^2-V(\phi)\right]+S_{\mathrm m}`],
galaxies:[String.raw`\begin{aligned}v_{\mathrm N}(r)&=\sqrt{\frac{GM}{r}}\\ v_{\mathrm{MOND}}&\approx(GMa_0)^{\frac14}\end{aligned}`],
lensing:[String.raw`\alpha\approx\frac{4GM}{c^2b}`],
cosmology:[String.raw`1+z=\frac{a_0}{a_{\text{изл}}}`],
'ir-scales':[String.raw`\lambda_{g}=\frac{\hbar}{m_g c}`],
'linear-graviton':[String.raw`h_{\mu\nu}\to h_{\mu\nu}+\partial_\mu\xi_\nu+\partial_\nu\xi_\mu`],
'fierz-pauli':[String.raw`\mathcal{L}_{\mathrm{mass}}\propto-m^2(h_{\mu\nu}h^{\mu\nu}-h^2),\quad h=\eta^{\mu\nu}h_{\mu\nu}`],
'stuckelberg-vdvz':[String.raw`\begin{gathered}T_{\mu\nu}T'^{\mu\nu}-\alpha TT'\\ \alpha=\frac12\quad\text{(безмассовый)},\\ \alpha\to\frac13\quad\text{(массивный предел)}\end{gathered}`],
'vainshtein-deep':[String.raw`r_V\sim\left(\frac{r_s}{m^2}\right)^{\frac13},\qquad c=\hbar=1`],
'hamilton-ghost':[String.raw`N_{\text{физ.}}=\frac{N_{\text{фаз.}}-2N_{\text{первого класса}}-N_{\text{второго класса}}}{2}`],
'drgt-eft':[String.raw`m\to0,\quad M_{\mathrm{Pl}}\to\infty,\quad \Lambda_3=(m^2M_{\mathrm{Pl}})^{\frac13}=\mathrm{const}`],
'field-equations':[String.raw`FR_{\mu\nu}-\frac12fg_{\mu\nu}-(\nabla_\mu\nabla_\nu-g_{\mu\nu}\Box)F=\kappa T_{\mu\nu}`,String.raw`3\Box F+FR-2f=\kappa T`],
friedmann:[String.raw`H^2=H_0^2\!\left(\Omega_{m0}a^{-3}+\Omega_{\Lambda0}\right),\quad \Omega_{m0}+\Omega_{\Lambda0}=1`,String.raw`a_{\text{переход}}^3=\frac{\Omega_{m0}}{2\Omega_{\Lambda0}}`],
'brane-dgp':[String.raw`H^2-\frac{\varepsilon H}{r_c}=\frac{8\pi G}{3}\rho,\qquad c=1`],
'gauss-bonnet':[String.raw`\mathcal G=R^2-4R_{\mu\nu}R^{\mu\nu}+R_{\mu\nu\rho\sigma}R^{\mu\nu\rho\sigma}`],
'loop-bounce':[String.raw`H^2=\frac{8\pi G}{3}\rho\left(1-\frac{\rho}{\rho_c}\right)`],
'conformal-gravity':[String.raw`S_{\mathrm W}\propto\int d^4x\,\sqrt{-g}\,C_{\mu\nu\rho\sigma}C^{\mu\nu\rho\sigma}`]
};

// В текстовых узлах оформляем простые дроби и единицы; сложные случаи задаём явно.
const fractionToken=String.raw`(?:\([^()\n/]{1,35}\)|√\([^()\n/]{1,35}\)|√[A-Za-zΑ-Ωα-ω0-9₀-₉²³⁴]+|(?:км|кг|м|с|Н)[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*|[A-Za-zȧäΑ-Ωα-ωΔ∇∂ΦΛΩρπ0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+(?:[,.][0-9]+)?(?:_[A-Za-zΑ-Ωα-ω0-9]+)?)`;
const fractionPattern=new RegExp(`(${fractionToken})\\s*\\/\\s*(${fractionToken})`,'gu');
function fractionTex(token){
 const subs={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
 const supers={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
 const greek={'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\varepsilon','η':'\\eta','θ':'\\theta','κ':'\\kappa','λ':'\\lambda','μ':'\\mu','ν':'\\nu','ξ':'\\xi','π':'\\pi','ρ':'\\rho','σ':'\\sigma','τ':'\\tau','φ':'\\phi','ω':'\\omega','Δ':'\\Delta','Φ':'\\Phi','Λ':'\\Lambda','Ω':'\\Omega','∂':'\\partial','∇':'\\nabla','−':'-','·':'\\cdot '};
 let out='',i=0;while(i<token.length){const ch=token[i];const unit=token.slice(i).match(/^(км|кг|м|с|Н)/u);if(unit){out+=`\\text{${unit[0]}}`;i+=unit[0].length;continue}if(ch==='ȧ'||ch==='ä'){out+=ch==='ȧ'?'\\dot{a}':'\\ddot{a}';i++;continue}if(ch==='_'){let m=token.slice(i+1).match(/^[A-Za-zΑ-Ωα-ω0-9]+/u);if(!m)return null;out+=`_{${fractionTex(m[0])}}`;i+=m[0].length+1;continue}if(subs[ch]){let v='';while(subs[token[i]])v+=subs[token[i++]];out+=`_{${v}}`;continue}if(supers[ch]){let v='';while(supers[token[i]])v+=supers[token[i++]];out+=`^{${v}}`;continue}if(ch==='√'){i++;if(token[i]==='('){let end=token.indexOf(')',i);if(end<0)return null;out+=`\\sqrt{${fractionTex(token.slice(i+1,end))}}`;i=end+1}else{let found=token.slice(i).match(/^[A-Za-zΑ-Ωα-ω0-9₀-₉²³⁴]+/u);if(!found)return null;out+=`\\sqrt{${fractionTex(found[0])}}`;i+=found[0].length}continue}out+=greek[ch]?greek[ch]+' ':ch;i++}return out;
}
function renderExplicitMath(root){
 if(!root || typeof katex==='undefined')return;
 root.querySelectorAll('[data-tex], [data-tex-display]').forEach(node=>{
  if(node.dataset.mathRendered) return;
  const display=node.hasAttribute('data-tex-display');
  const source=display?node.dataset.texDisplay:node.dataset.tex;
  try{
   katex.render(source,node,{throwOnError:true,displayMode:display,output:'htmlAndMathml'});
   node.dataset.mathRendered='true';
   if(display){node.tabIndex=0;node.setAttribute('role','group');node.setAttribute('aria-label','Формула; прокрутите по горизонтали при необходимости')}
  }catch(error){if(!node.textContent)node.textContent=source;console.error('Ошибка оформления формулы',error)}
 });
}
function renderInlineFractions(root){
 if(!root || typeof katex==='undefined')return;
 renderExplicitMath(root);
 renderInlineEquations(root);
 // Сохраняем индексы знаменателя, если они оформлены соседним HTML sub.
 for(const sub of root.querySelectorAll('sub')){const prev=sub.previousSibling;if(prev?.nodeType===Node.TEXT_NODE && /\/[A-Za-zΑ-Ωα-ω0-9]+$/u.test(prev.nodeValue) && /^[A-Za-zΑ-Ωα-ω0-9]+$/u.test(sub.textContent)){prev.nodeValue += '_'+sub.textContent;sub.remove()}}
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||p.closest('.formula,.katex,.practice-score,script,style,code,svg,sup,sub,button kbd'))return NodeFilter.FILTER_REJECT;return n.nodeValue.includes('/')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){let text=node.nodeValue;fractionPattern.lastIndex=0;let match,last=0,fragment=document.createDocumentFragment(),changed=false;while((match=fractionPattern.exec(text))){const numerator=match[1],denominator=match[2];const before=text[match.index-1]||'',after=text[match.index+match[0].length]||'';if(/[\p{L}\p{N}_]/u.test(before)||/[\p{L}\p{N}_]/u.test(after))continue;if((numerator==='http'||numerator==='https')||(!/[A-Za-zȧäА-Яа-яΑ-Ωα-ωΔ∂ΦΛΩρπ0-9]/u.test(numerator))||(!/[A-Za-zȧäА-Яа-яΑ-Ωα-ωΔ∂ΦΛΩρπ0-9]/u.test(denominator)))continue;let n=fractionTex(numerator),d=fractionTex(denominator);if(!n||!d)continue;let span=document.createElement('span');span.className='inline-fraction';try{katex.render(`\\dfrac{${n}}{${d}}`,span,{throwOnError:true,displayMode:false,output:'htmlAndMathml'});}catch{continue}fragment.append(document.createTextNode(text.slice(last,match.index)),span);last=match.index+match[0].length;changed=true}if(changed){fragment.append(document.createTextNode(text.slice(last)));node.replaceWith(fragment)}}
 requestAnimationFrame(()=>root.querySelectorAll('.inline-math, .inline-fraction').forEach(el=>{if(el.scrollWidth>el.clientWidth+2){el.tabIndex=0;el.title='Длинную формулу можно прокрутить горизонтально'}}));
}
function renderCourseMath(lessonId){
 if(typeof katex==='undefined')return;
 renderExplicitMath(document.getElementById('app'));
 if(lessonId){let nodes=document.querySelectorAll('.article-body .formula:not([data-tex-display])');let expressions=displayMath[lessonId]||[];if(nodes.length!==expressions.length){console.error('Несовпадение формул урока',lessonId,nodes.length,expressions.length);return}nodes.forEach((node,i)=>{if(expressions[i]){node.tabIndex=0;node.setAttribute('role','group');node.setAttribute('aria-label','Формула; прокрутите по горизонтали при необходимости');try{katex.render(expressions[i],node,{throwOnError:true,displayMode:true,output:'htmlAndMathml'})}catch(error){console.error('Ошибка оформления формулы',lessonId,i,error)}}});}
 renderInlineFractions(document.getElementById('app'));
}
