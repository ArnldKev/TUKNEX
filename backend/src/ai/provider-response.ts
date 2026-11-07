// Close rejected upstream streams without replacing the original, sanitized failure.
export async function cancelProviderBody(body:{cancel():Promise<unknown>}|null|undefined){
 if(!body)return;
 try{await body.cancel();}catch{/* Cancellation can fail after an upstream disconnect. */}
}
