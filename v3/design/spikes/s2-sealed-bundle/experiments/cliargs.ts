console.log("embedded:", ((Bun as any).embeddedFiles??[]).map((f:File)=>f.name));
