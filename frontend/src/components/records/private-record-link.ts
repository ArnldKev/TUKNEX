export type PrivateRecordTarget={kind:'none'}|{kind:'invalid'}|{kind:'record';id:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A link is a lookup into an already authorized list, never an access grant. */
export function privateRecordTarget(search:string,parameter:string):PrivateRecordTarget{
 const values=new URLSearchParams(search).getAll(parameter);
 if(!values.length)return{kind:'none'};
 if(values.length!==1||!uuid.test(values[0]))return{kind:'invalid'};
 return{kind:'record',id:values[0].toLowerCase()};
}
export function linkedRecord<T extends{id:string}>(records:readonly T[],target:PrivateRecordTarget):T|undefined{return target.kind==='record'?records.find(record=>record.id.toLowerCase()===target.id):undefined;}
