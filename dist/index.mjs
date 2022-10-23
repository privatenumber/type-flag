const C=/-(\w)/g,E=e=>e.replace(C,(t,s)=>s.toUpperCase()),P=/\B([A-Z])/g,O=e=>e.replace(P,"-$1").toLowerCase(),{stringify:y}=JSON,{hasOwnProperty:x}=Object.prototype,d=(e,t)=>x.call(e,t),_=/^--?/,j=/[.:=]/,D=e=>{let t=e.replace(_,""),s;const n=t.match(j);if(n?.index){const r=n.index;s=t.slice(r+1),t=t.slice(0,r)}return{flagName:t,flagValue:s}},I=/[\s.:=]/,T=(e,t)=>{const s=`Invalid flag name ${y(t)}:`;if(t.length===0)throw new Error(`${s} flag name cannot be empty}`);if(t.length===1)throw new Error(`${s} single characters are reserved for aliases`);const n=t.match(I);if(n)throw new Error(`${s} flag name cannot contain the character ${y(n?.[0])}`);let r;if(C.test(t)?r=E(t):P.test(t)&&(r=O(t)),r&&d(e,r))throw new Error(`${s} collides with flag ${y(r)}`)};function L(e){const t=new Map;for(const s in e){if(!d(e,s))continue;T(e,s);const n=e[s];if(n&&typeof n=="object"){const{alias:r}=n;if(typeof r=="string"){if(r.length===0)throw new Error(`Invalid flag alias ${y(s)}: flag alias cannot be empty`);if(r.length>1)throw new Error(`Invalid flag alias ${y(s)}: flag aliases can only be a single-character`);if(t.has(r))throw new Error(`Flag collision: Alias "${r}" is already used`);t.set(r,{name:s,schema:n})}}}return t}const M=e=>!e||typeof e=="function"?!1:Array.isArray(e)||Array.isArray(e.type),z=e=>{const t={};for(const s in e)d(e,s)&&(t[s]=M(e[s])?[]:void 0);return t},A=(e,t)=>e===Number&&t===""?Number.NaN:e===Boolean?t!=="false":t,B=(e,t)=>{for(const s in e){if(!d(e,s))continue;const n=e[s];if(!n)continue;const r=t[s];if(!(r!==void 0&&!(Array.isArray(r)&&r.length===0))&&"default"in n){let u=n.default;typeof u=="function"&&(u=u()),t[s]=u}}},k=(e,t)=>{if(!t)throw new Error(`Missing type on flag "${e}"`);return typeof t=="function"?t:Array.isArray(t)?t[0]:k(e,t.type)},K=/^-[\da-z]+/i,U=/^--[\w-]{2,}/,F="--";function q(e,t=process.argv.slice(2)){const s=L(e),n={flags:z(e),unknownFlags:{},_:Object.assign([],{[F]:[]})};let r;const u=(i,o,a)=>{const l=k(i,o);a=A(l,a),a!==void 0&&!Number.isNaN(a)?Array.isArray(n.flags[i])?n.flags[i].push(l(a)):n.flags[i]=l(a):r=c=>{Array.isArray(n.flags[i])?n.flags[i].push(l(A(l,c||""))):n.flags[i]=l(A(l,c||"")),r=void 0}},b=(i,o)=>{i in n.unknownFlags||(n.unknownFlags[i]=[]),o===void 0&&(o=!0),n.unknownFlags[i].push(o)};for(let i=0;i<t.length;i+=1){const o=t[i];if(o===F){const c=t.slice(i+1);n._[F]=c,n._.push(...c);break}const a=K.test(o);if(U.test(o)||a){r&&r();const c=D(o),{flagValue:w}=c;let{flagName:f}=c;if(a){for(let p=0;p<f.length;p+=1){const v=f[p],h=s.get(v),$=p===f.length-1;h?u(h.name,h.schema,$?w:!0):b(v,$?w:!0)}continue}let g=e[f];if(!g){const p=E(f);g=e[p],g&&(f=p)}if(!g){b(f,w);continue}u(f,g,w)}else r?r(o):n._.push(o)}return r&&r(),B(e,n.flags),n}export{q as default};
