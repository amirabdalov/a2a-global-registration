FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

RUN npm prune --production

EXPOSE 5000

# Start script: restore DB from GCS, then run the app
CMD ["sh", "-c", "node -e \"const f=require('fs'),p=require('path');(async()=>{try{const r=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'}});if(!r.ok)return;const{access_token:t}=await r.json();const d=await fetch('https://storage.googleapis.com/storage/v1/b/a2a-global-data/o/db%2Fdata.db?alt=media',{headers:{Authorization:'Bearer '+t}});if(d.ok){const b=Buffer.from(await d.arrayBuffer());f.writeFileSync('data.db',b);console.log('[RESTORE] DB restored: '+b.length+' bytes');}else console.log('[RESTORE] No backup ('+d.status+')');}catch(e){console.log('[RESTORE] Skip: '+e.message);}})().then(()=>{})\" && node dist/index.cjs"]
