import 'server-only';

import net from 'node:net';
import { createInterface, type Interface as ReadlineInterface } from 'node:readline';
import tls from 'node:tls';

type SmtpErrorType = 'configuration'|'connection'|'tls'|'authentication'|'timeout'|'protocol';

export type SmtpVerification =
  | { ok:true; status:'SMTP CONNECTED / AUTH OK' }
  | { ok:false; errorType:SmtpErrorType };

export type SmtpDelivery =
  | { ok:true; status:'EMAIL SENT' }
  | { ok:false; errorType:SmtpErrorType };

class SafeSmtpError extends Error {
  constructor(readonly errorType:SmtpErrorType) {
    super(errorType);
  }
}

function smtpConfig(){
  const server=process.env.SMTP_SERVER?.trim();
  const portText=process.env.SMTP_PORT?.trim();
  const user=process.env.EMAIL_USER?.trim();
  const pass=process.env.EMAIL_PASS?.replace(/\s+/g,'');
  const port=Number(portText);
  if(!server||!portText||!Number.isInteger(port)||port<1||port>65535||!user||!pass) throw new SafeSmtpError('configuration');
  return {server,port,user,pass};
}

function timeout<T>(promise:Promise<T>,ms:number):Promise<T>{
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new SafeSmtpError('timeout')),ms);
    promise.then((value)=>{clearTimeout(timer);resolve(value)},(error)=>{clearTimeout(timer);reject(error)});
  });
}

function openConnection(server:string,port:number):Promise<net.Socket>{
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:server,port});
    const fail=()=>reject(new SafeSmtpError('connection'));
    socket.once('error',fail);
    socket.once('connect',()=>{socket.off('error',fail);socket.on('error',()=>{});resolve(socket)});
  });
}

function startTls(socket:net.Socket,server:string):Promise<tls.TLSSocket>{
  return new Promise((resolve,reject)=>{
    const secure=tls.connect({socket,servername:server,minVersion:'TLSv1.2',rejectUnauthorized:true});
    const fail=()=>reject(new SafeSmtpError('tls'));
    secure.once('error',fail);
    secure.once('secureConnect',()=>{secure.off('error',fail);secure.on('error',()=>{});resolve(secure)});
  });
}

function responseReader(socket:net.Socket|tls.TLSSocket){
  const lines=createInterface({input:socket,crlfDelay:Infinity});
  const iterator=lines[Symbol.asyncIterator]();
  return {
    lines,
    async read(expected:number,errorType:SmtpErrorType='protocol'){
      for(;;){
        const item=await iterator.next();
        if(item.done) throw new SafeSmtpError(errorType);
        const match=/^(\d{3})([ -])/.exec(String(item.value));
        if(!match) continue;
        const code=Number(match[1]);
        if(match[2]==='-') continue;
        if(code!==expected) throw new SafeSmtpError(errorType);
        return;
      }
    },
  };
}

function command(socket:net.Socket|tls.TLSSocket,value:string){
  socket.write(`${value}\r\n`);
}

,async function authenticatedSession(){
  const config=smtpConfig();
  let socket:net.Socket|tls.TLSSocket|undefined;
  let responses:ReturnType<typeof responseReader>|undefined;
  try{
    socket=await timeout(openConnection(config.server,config.port),10_000);
    responses=responseReader(socket);
    await timeout(responses.read(220,'connection'),10_000);
    command(socket,'EHLO localhost'); await timeout(responses.read(250),10_000);
    command(socket,'STARTTLS'); await timeout(responses.read(220,'tls'),10_000);
    responses.lines.close();
    socket=await timeout(startTls(socket,config.server),10_000);
    responses=responseReader(socket);
    command(socket,'EHLO localhost'); await timeout(responses.read(250),10_000);
    command(socket,'AUTH LOGIN'); await timeout(responses.read(334,'authentication'),10_000);
    command(socket,Buffer.from(config.user).toString('base64')); await timeout(responses.read(334,'authentication'),10_000);
    command(socket,Buffer.from(config.pass).toString('base64')); await timeout(responses.read(235,'authentication'),10_000);
    return {config,socket,responses};
  }catch(error){
    responses?.lines.close(); socket?.destroy(); throw error;
  }
}

export async function verificarTransporteSmtp():Promise<SmtpVerification>{
  let socket:net.Socket|tls.TLSSocket|undefined;
  let reader:ReadlineInterface|undefined;
  try{
    const config=smtpConfig();
    socket=await timeout(openConnection(config.server,config.port),10_000);
    let responses=responseReader(socket); reader=responses.lines;
    await timeout(responses.read(220,'connection'),10_000);
    command(socket,'EHLO localhost');
    await timeout(responses.read(250),10_000);
    command(socket,'STARTTLS');
    await timeout(responses.read(220,'tls'),10_000);
    reader.close();
    socket=await timeout(startTls(socket,config.server),10_000);
    responses=responseReader(socket); reader=responses.lines;
    command(socket,'EHLO localhost');
    await timeout(responses.read(250),10_000);
    command(socket,'AUTH LOGIN');
    await timeout(responses.read(334,'authentication'),10_000);
    command(socket,Buffer.from(config.user).toString('base64'));
    await timeout(responses.read(334,'authentication'),10_000);
    command(socket,Buffer.from(config.pass).toString('base64'));
    await timeout(responses.read(235,'authentication'),10_000);
    command(socket,'QUIT');
    return {ok:true,status:'SMTP CONNECTED / AUTH OK'};
  }catch(error){
    return {ok:false,errorType:error instanceof SafeSmtpError?error.errorType:'protocol'};
  }finally{
    reader?.close();
    socket?.destroy();
  }
}

export async function enviarCorreoSmtp(input:{to:string;subject:string;text:string}):Promise<SmtpDelivery>{
  let socket:net.Socket|tls.TLSSocket|undefined;
  let reader:ReadlineInterface|undefined;
  try{
    const session=await authenticatedSession();
    socket=session.socket; reader=session.responses.lines;
    const destinatario=input.to.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) throw new SafeSmtpError('configuration');
    command(socket,`MAIL FROM:<${session.config.user}>`); await timeout(session.responses.read(250),10_000);
    command(socket,`RCPT TO:<${destinatario}>`); await timeout(session.responses.read(250),10_000);
    command(socket,'DATA'); await timeout(session.responses.read(354),10_000);
    const subject=Buffer.from(input.subject.replace(/[\r\n]/g,' '),'utf8').toString('base64');
    const body=input.text.replace(/\r?\n/g,'\r\n').replace(/^\./gm,'..');
    socket.write(`From: ALEMSI <${session.config.user}>\r\nTo: <${destinatario}>\r\nSubject: =?UTF-8?B?${subject}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${body}\r\n.\r\n`);
    await timeout(session.responses.read(250),10_000);
    command(socket,'QUIT');
    return {ok:true,status:'EMAIL SENT'};
  }catch(error){
    return {ok:false,errorType:error instanceof SafeSmtpError?error.errorType:'protocol'};
  }finally{
    reader?.close(); socket?.destroy();
  }
}
