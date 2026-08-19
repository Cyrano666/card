import cloudbase from '@cloudbase/js-sdk'

// CloudBase PostgreSQL mode. Auth uses the SDK; data uses its PostgREST API.
const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'fx-d8gsy0r867fcba5ca'
const region = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai'
const publishableKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY || ''
const gateway = `https://${envId}.api.tcloudbasegateway.com`
const dbEndpoint = `${gateway}/v1/rdb/rest`
const app = cloudbase.init({env:envId,region,accessKey:publishableKey||undefined})
const auth = app.auth()
let sessionCache:any = null

type Result<T=any>={data:T|null;error:any}
const ok=<T,>(data:T):Result<T>=>({data,error:null})
const fail=(error:any):Result=>({data:null,error})
function asError(body:any,status:number){return {message:body?.message||body?.error_description||body?.error||`请求失败（${status}）`,status,details:body}}

async function getAccessToken(){
  if(sessionCache?.access_token)return sessionCache.access_token
  try{const current=await auth.getSession() as any;sessionCache=current?.data?.session||null;return sessionCache?.access_token||''}catch{return ''}
}
async function request(path:string,init:RequestInit={},accept='application/json'){
  const token=await getAccessToken(),headers=new Headers(init.headers)
  headers.set('Accept',accept)
  if(!headers.has('Content-Type')&&init.body)headers.set('Content-Type','application/json')
  if(token)headers.set('Authorization',`Bearer ${token}`)
  if(publishableKey)headers.set('apikey',publishableKey)
  const response=await fetch(`${dbEndpoint}${path}`,{...init,headers}),text=await response.text()
  let body:any=null;try{body=text?JSON.parse(text):null}catch{body=text}
  if(!response.ok)throw asError(body,response.status)
  return body
}

class Query implements PromiseLike<Result>{
  private op:'select'|'insert'|'update'='select'; private fields='*'; private filters:string[]=[]; private orderByValue=''; private body:any; private one=false; private maybe=false
  constructor(private table:string){}
  select(fields='*'){this.fields=fields;return this}
  eq(field:string,value:any){this.filters.push(`${encodeURIComponent(field)}=eq.${encodeURIComponent(String(value))}`);return this}
  gte(field:string,value:any){this.filters.push(`${encodeURIComponent(field)}=gte.${encodeURIComponent(String(value))}`);return this}
  lte(field:string,value:any){this.filters.push(`${encodeURIComponent(field)}=lte.${encodeURIComponent(String(value))}`);return this}
  order(field:string,opts?:{ascending?:boolean}){this.orderByValue=`&order=${encodeURIComponent(field)}.${opts?.ascending===false?'desc':'asc'}`;return this}
  single(){this.one=true;return this}
  maybeSingle(){this.maybe=true;return this}
  insert(data:any){this.op='insert';this.body=data;return this}
  update(data:any){this.op='update';this.body=data;return this}
  async execute():Promise<Result>{
    try{
      if(this.op==='select'){
        const query=`?select=${encodeURIComponent(this.fields)}${this.filters.length?'&'+this.filters.join('&'):''}${this.orderByValue}`
        const rows=await request(`/${this.table}${query}`)
        return this.one||this.maybe?ok(Array.isArray(rows)?(rows[0]||null):rows):ok(rows)
      }
      const query=this.filters.length?'?'+this.filters.join('&'):''
      const rows=await request(`/${this.table}${query}`,{method:this.op==='insert'?'POST':'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(this.body)})
      return this.one||this.maybe?ok(Array.isArray(rows)?(rows[0]||null):rows):ok(rows)
    }catch(error){return fail(error)}
  }
  then<TResult1=Result,TResult2=never>(onfulfilled?:((value:Result)=>TResult1|PromiseLike<TResult1>)|null,onrejected?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null){return this.execute().then(onfulfilled,onrejected)}
}

function mapUser(user:any){return user?{...user,id:user.id||user.uid,user_metadata:user.user_metadata||user.metadata||{}}:null}
function mapSession(raw:any){return raw?{...raw,user:mapUser(raw.user)}:null}
const cloudAuth={
  async getSession(){try{const result=await auth.getSession() as any;sessionCache=result?.data?.session||null;return ok(mapSession(sessionCache))}catch(error){return fail(error)}},
  onAuthStateChange(callback:(event:string,session:any)=>void){return auth.onAuthStateChange((event:any,state:any)=>{const raw=state?.session||state?.data?.session||null;sessionCache=raw;callback(event,mapSession(raw))})},
  // The current free PG environment has username/password login enabled.
  // CloudBase usernames accept an email-shaped value, so the existing email
  // field remains familiar to users without requiring email verification.
  async signInWithPassword(params:{email:string;password:string}){try{const result=await auth.signInWithPassword({username:params.email,password:params.password}) as any;sessionCache=result?.data?.session||null;return {data:{user:mapUser(result?.data?.user),session:mapSession(sessionCache)},error:result?.error||null}}catch(error){return fail(error)}},
  async signUp(params:{email:string;password:string;options?:{data?:Record<string,any>}}){try{const result=await auth.signUp({username:params.email,password:params.password}) as any;sessionCache=result?.data?.session||null;return {data:{user:mapUser(result?.data?.user),session:mapSession(sessionCache)},error:result?.error||null}}catch(error){return fail(error)}},
  async signOut(){try{await auth.signOut();sessionCache=null}catch{}},
}
function storage(bucket:string){const bucketApi=(app as any).storage.from(bucket);return {async upload(path:string,file:File){try{const r=await bucketApi.upload(path,file);return ok({path:r?.data?.path||path,id:r?.data?.id,fullPath:r?.data?.fullPath})}catch(error){return fail(error)}},async createSignedUrl(path:string,expiresIn:number){try{const r=await bucketApi.createSignedUrl(path,expiresIn);return ok({signedUrl:r?.data?.fullSignedURL||r?.data?.signedUrl})}catch(error){return fail(error)}}}}
const channels=new Set<any>()
function channel(_name:string){let callback:(()=>void)|null=null;let timer:number|undefined;const value={on(_event:string,_filter:any,fn:()=>void){callback=fn;return value},subscribe(){timer=window.setInterval(()=>callback?.(),10000);return value},close(){if(timer)window.clearInterval(timer)}};channels.add(value);return value}
export const configured=true
export const supabase={auth:cloudAuth,from:(table:string)=>new Query(table),rpc:async(name:string,args:any)=>{try{return ok(await request(`/rpc/${name}`,{method:'POST',body:JSON.stringify(args)}))}catch(error){return fail(error)}},storage:{from:storage},channel,removeChannel:(value:any)=>{value?.close?.();channels.delete(value)}}
