/* FILMSTER Spotify Premium bridge — Authorization Code + PKCE, no client secret. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const store={
  get(k){try{return sessionStorage.getItem('filmster-spotify-'+k)||''}catch(_){return ''}},
  set(k,v){try{sessionStorage.setItem('filmster-spotify-'+k,String(v))}catch(_){}},
  del(k){try{sessionStorage.removeItem('filmster-spotify-'+k)}catch(_){}}
 };
 const prefs={
  get(k){try{return localStorage.getItem('filmster-spotify-'+k)||''}catch(_){return ''}},
  set(k,v){try{localStorage.setItem('filmster-spotify-'+k,String(v))}catch(_){}},
  del(k){try{localStorage.removeItem('filmster-spotify-'+k)}catch(_){}}
 };
 let manual=false, startedOnSpotify=false;
 const trackCache=new Map();
 const albumCache=new Map();
 const apiLog=[];
 const rememberApi=(path,method,status)=>{apiLog.push({at:new Date().toLocaleTimeString('pl-PL'),method,path:path.split('?')[0],status});if(apiLog.length>25)apiLog.shift();};
 const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const rememberDevice=d=>{if(d&&d.id&&d.id!=='__active__'){prefs.set('device-id',d.id);prefs.set('device-name',d.name||'Spotify');}};
 const redirectUri=()=>location.origin+location.pathname;
 const status=(s)=>{if($('spotifyStatus'))$('spotifyStatus').textContent=s;};
 const feedback=(s)=>{if($('spotifyFeedback'))$('spotifyFeedback').textContent=s;};
 const randomUrl=()=>{const a=new Uint8Array(32);crypto.getRandomValues(a);return Array.from(a,v=>(v%36).toString(36)).join('');};
 const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 async function authorize(){
  const clientId=$('spotifyClientId').value.trim();
  if(!/^[0-9a-f]{32}$/i.test(clientId)){
   const n=clientId.length;
   status('Nieprawidłowy Client ID ('+n+' znaków). Skopiuj pełne 32 znaki z Spotify Developer Dashboard → Twoja aplikacja → Settings → Client ID. Nie wklejaj nazwy konta ani Client Secret.');
   if($('spotifyConfig'))$('spotifyConfig').open=true;
   return;
  }
  prefs.set('client-id',clientId);
  if(!crypto?.subtle){status('Logowanie Spotify wymaga HTTPS. Otwórz stronę GitHub Pages.');return;}
  const verifier=randomUrl()+randomUrl();const challenge=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
  const state=randomUrl();prefs.set('oauth-verifier',verifier);prefs.set('oauth-state',state);prefs.set('oauth-since',Date.now());
  const url=new URL('https://accounts.spotify.com/authorize');
  url.search=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:redirectUri(),scope:'user-read-private user-read-playback-state user-modify-playback-state',state,code_challenge_method:'S256',code_challenge:challenge}).toString();
  location.assign(url.toString());
 }
 async function postToken(form){
  const response=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error_description||result.error||'Błąd logowania Spotify');
  store.set('access-token',result.access_token);
  if(result.scope)store.set('scopes',result.scope);
  store.set('expiry',Date.now()+(Number(result.expires_in||3600)-60)*1000);
  if(result.refresh_token)store.set('refresh-token',result.refresh_token);
  return result.access_token;
 }
 async function token(){
  const access=store.get('access-token');
  if(access&&Number(store.get('expiry'))>Date.now())return access;
  const refresh=store.get('refresh-token'),client_id=prefs.get('client-id');
  if(!refresh||!client_id)throw new Error('Połącz ponownie konto Spotify.');
  return postToken({grant_type:'refresh_token',refresh_token:refresh,client_id});
 }
 async function spotifyApi(path,opts={}){
  const bearer=await token();
  let response;
  try{
   response=await fetch('https://api.spotify.com/v1'+path,{...opts,headers:{'Authorization':'Bearer '+bearer,'Content-Type':'application/json',...(opts.headers||{})}});
  }catch(e){
   rememberApi(path,opts.method||'GET','NETWORK');
   throw new Error('Nie udało się skontaktować z API Spotify: '+(e.message||'błąd sieci'));
  }
  rememberApi(path,opts.method||'GET',response.status);
  if(response.status===204)return {};
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   const msg=typeof data?.error==='object'?data.error.message:data.error;
   if(response.status===401)throw new Error('Sesja Spotify wygasła. Połącz konto jeszcze raz.');
   if(response.status===403)throw new Error('HTTP 403 ['+path.split('?')[0]+']: Spotify odrzuciło dostęp. Sprawdź Users Management w Spotify Developer Dashboard i zaloguj się ponownie po aktualizacji uprawnień (także user-read-private). Szczegóły: '+String(msg||'brak').slice(0,140));
   if(response.status===404){const error=new Error('HTTP 404 ['+path.split('?')[0]+']: '+String(msg||'Brak aktywnego odtwarzacza').slice(0,130));error.status=404;throw error;}
   if(response.status===429)throw new Error('Spotify ogranicza liczbę zapytań. Spróbuj ponownie za chwilę.');
   throw new Error('Spotify HTTP '+response.status+' ['+path.split('?')[0]+']: '+String(msg||'Nieznany błąd').slice(0,160));
  }
  return data;
 }
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/feat\.?|featuring|ft\./g,' ').replace(/[^a-z0-9]+/g,' ').trim();
 function rankSong(song,track){
  const title=norm(song.title),artist=norm(song.artist),gotTitle=norm(track.name),gotArtist=norm((track.artists||[]).map(a=>a.name).join(' '));
  let result=0;
  if(gotTitle===title)result+=100;else if(gotTitle.startsWith(title)||title.startsWith(gotTitle))result+=60;
  for(const part of title.split(' ').filter(x=>x.length>2))if(gotTitle.includes(part))result+=4;
  for(const part of artist.split(' ').filter(x=>x.length>2))if(gotArtist.includes(part))result+=8;
  if(gotArtist.includes(artist))result+=45;
  return result;
 }
 async function playbackDevices(){
  // Two Spotify endpoints can disagree on iPhone; use both, not just the device list.
  const [devices,current]=await Promise.allSettled([
   spotifyApi('/me/player/devices'),spotifyApi('/me/player')
  ]);
  if(devices.status==='rejected'&&current.status==='rejected')throw devices.reason;
  const list=devices.status==='fulfilled'?(devices.value.devices||[]).filter(d=>d.id&&!d.is_restricted):[];
  const active=current.status==='fulfilled'?current.value?.device:null;
  if(active&&!active.is_restricted){
   const match=list.find(d=>d.id===active.id);
   if(match)match.is_active=true;
   else if(active.id)list.unshift({...active,is_active:true});
   else if(active.is_active)list.unshift({...active,id:'__active__',name:active.name||'Bieżące urządzenie Spotify',is_active:true});
  }
  return {list,current:current.status==='fulfilled'?current.value:null};
 }
 async function resolveTrack(song){
  const key=String(song.spotifyId||song.title+'|'+song.artist);
  if(trackCache.has(key))return trackCache.get(key);
  const work=(async()=>{
   if(song.spotifyId&&/^[a-zA-Z0-9]{22}$/.test(song.spotifyId))return 'spotify:track:'+song.spotifyId;
   let tracks=[];
   for(const q of ['track:'+song.title+' artist:'+song.artist,song.title+' '+song.artist]){
    const response=await spotifyApi('/search?'+new URLSearchParams({q,type:'track',limit:'10'}));
    tracks=(response.tracks?.items||[]).sort((a,b)=>rankSong(song,b)-rankSong(song,a));
    if(tracks.length&&rankSong(song,tracks[0])>=22)break;
   }
   if(!tracks.length||rankSong(song,tracks[0])<22)throw new Error('Spotify nie znalazło właściwego nagrania. Skorzystaj z ręcznego przycisku Spotify.');
   if(tracks[0].album?.uri)albumCache.set(tracks[0].uri,tracks[0].album.uri);
   return tracks[0].uri;
  })();
  trackCache.set(key,work);
  try{return await work;}catch(e){trackCache.delete(key);throw e;}
 }
 function prime(song){
  if(!isConnected()||!song)return Promise.resolve();
  return resolveTrack(song).catch(()=>{});
 }
 function selectAndRemember(list){
  const requested=$('spotifyDeviceSelect')?.value||'';
  const saved=prefs.get('device-id');
  const manual=prefs.get('device-preference')==='manual';
  // Prefer the current active Spotify Connect player over stale saved IDs;
  // honor an explicit manual device choice if it is still available.
  const active=list.find(d=>d.is_active);
  const device=(manual&&list.find(d=>d.id===requested||d.id===saved))
   ||active||list.find(d=>d.id===requested)||list.find(d=>d.id===saved)||list[0]||null;
  rememberDevice(device);
  return device;
 }
 async function verifyPlayback(trackUri,deviceName,checks=5){
  // HTTP 204 only acknowledges the command. Require the selected track and is_playing.
  const id=trackUri.split(':').pop();
  let reason='Spotify nie potwierdziło zmiany utworu.';
  for(let i=0;i<checks;i++){
   await nap(i===0?450:500);
   try{
    const player=await spotifyApi('/me/player');
    const item=player?.item;
    if(player?.is_playing===true && (item?.uri===trackUri||item?.id===id||item?.linked_from?.id===id)){
     startedOnSpotify=true;
     return {verified:true,device:player?.device?.name||deviceName};
    }
    if(!player?.device)reason='Spotify nie pokazuje aktywnego odtwarzacza.';
    else if(player.is_playing===false)reason='Spotify ma aktywny odtwarzacz, ale odtwarzanie jest wstrzymane.';
    else if(item)reason='Spotify nadal odtwarza poprzedni utwór.';
    else reason='Spotify nie zwraca jeszcze aktualnego utworu.';
   }catch(error){
    reason='Brak potwierdzenia odtwarzania: '+error.message;
    if(error.status===401||error.status===403)break;
   }
  }
  startedOnSpotify=false;
  return {verified:false,device:deviceName,message:reason};
 }
 async function getAlbumUri(trackUri){
  if(albumCache.has(trackUri))return albumCache.get(trackUri);
  const id=trackUri.split(':').pop();
  if(!/^[A-Za-z0-9]{22}$/.test(id))return null;
  try{
   const meta=await spotifyApi('/tracks/'+encodeURIComponent(id));
   const album=meta?.album?.uri||null;
   if(album)albumCache.set(trackUri,album);
   return album;
  }catch(e){
   console.info('Spotify album lookup:',e.message);
   return null;
  }
 }
 async function play(song){
  if(!isConnected())throw new Error('Brak autoryzacji Spotify.');
  const uri=await resolveTrack(song);
  let {list}=await playbackDevices();
  let device=selectAndRemember(list);
  const devicePath=d=>'/me/player/play'+(d?.id&&d.id!=='__active__'?'?device_id='+encodeURIComponent(d.id):'');
  const selectedName=d=>d?.name||prefs.get('device-name')||'urządzenie Spotify';
  const run=async(d,transfer=false)=>{
   if(d&&d.id!=='__active__'&&transfer&&!d.is_active){
    await spotifyApi('/me/player',{method:'PUT',body:JSON.stringify({device_ids:[d.id],play:true})});
    await nap(500);
   }
   // First try the standard Spotify API command for one specific track.
   await spotifyApi(devicePath(d),{method:'PUT',body:JSON.stringify({uris:[uri],position_ms:0})});
   rememberDevice(d);
   let result=await verifyPlayback(uri,selectedName(d),3);
   if(result.verified)return result;
   // Fall back to an album context when Spotify returns 204 but silently pauses.
   // This is a reported Spotify API regression affecting single-track URIs.
   const album=await getAlbumUri(uri);
   if(!album){
    return {...result,message:result.message+' Spróbowałem odtworzyć pojedynczy utwór, ale Spotify go nie rozpoczęło. Nie udało się pobrać albumu do alternatywnego uruchomienia.'};
   }
   try{
    await spotifyApi(devicePath(d),{method:'PUT',body:JSON.stringify({context_uri:album,offset:{uri},position_ms:0})});
    result=await verifyPlayback(uri,selectedName(d),6);
    if(!result.verified)result.message='Alternatywne uruchomienie z albumu też nie pomogło. '+result.message;
    return result;
   }catch(error){
    if(error.status===404)throw error;
    return {verified:false,device:selectedName(d),message:'Spotify odrzuciło próbę uruchomienia utworu z albumu: '+error.message};
   }
  };
  try{
   return await run(device,true);
  }catch(error){
   if(error.status!==404)throw error;
  }
  // iPhone Connect IDs can disappear on app backgrounding; refresh before retrying.
  await nap(300);
  ({list}=await playbackDevices());
  device=selectAndRemember(list);
  const attempts=[null,device];
  const saved=prefs.get('device-id');
  if(saved&&!attempts.some(d=>d?.id===saved))attempts.push({id:saved,name:prefs.get('device-name')||'zapisane urządzenie',is_active:false});
  let lastError=null;
  for(const candidate of attempts){
   try{return await run(candidate,!!candidate);}
   catch(error){lastError=error;if(error.status!==404)throw error;}
  }
  throw new Error('Spotify HTTP 404: brak aktywnego urządzenia. Otwórz Spotify na iPhonie, włącz dowolną piosenkę i wróć do FILMSTER. '+(lastError?.message||''));
 }
 async function activateDevice(){
  const report=$('spotifyDiagnostics'), visible=$('spotifyActivationStatus');
  const notify=msg=>{if(report)report.textContent=msg;if(visible)visible.textContent=msg;};
  if(!isConnected()){notify('❌ Konto Spotify nie jest połączone. Wróć do ustawień i połącz Premium.');return;}
  notify('⏳ Szukam i zapisuję odtwarzacz Spotify…');
  const button=$('spotifyActivateOnce');
  if(button)button.disabled=true;
  try{
   const {list}=await playbackDevices();
   const saved=prefs.get('device-id');
   if(!list.length){
    notify(saved
      ?'⚠️ Zapamiętany odtwarzacz „'+(prefs.get('device-name')||'Spotify')+'” jest obecnie niewidoczny. Możesz spróbować START — FILMSTER ponowi połączenie automatycznie. Jeśli wystąpi HTTP 404, otwórz Spotify i włącz utwór.'
      :'⚠️ Spotify nie pokazuje teraz żadnego odtwarzacza. Włącz dowolną piosenkę w aplikacji Spotify i wróć do FILMSTER. Gdy nadal nie widać urządzenia, START spróbuje uruchomić muzykę na aktywnym urządzeniu bez jego ID.');
    return;
   }
   const select=$('spotifyDeviceSelect'), preferred=select?.value||prefs.get('device-id');
   const chosen=list.find(d=>d.id===preferred)||list.find(d=>d.is_active)||list[0];
   rememberDevice(chosen);
   if(select){
    select.replaceChildren();
    for(const d of list){
      const opt=document.createElement('option');
      opt.value=d.id;
      opt.textContent=(d.is_active?'▶ ':'')+d.name+' ('+d.type+')';
      select.appendChild(opt);
    }
    select.value=chosen.id;select.disabled=false;
   }
   let availableNow=chosen.is_active||chosen.id==='__active__';
   if(!availableNow){
     try{await spotifyApi('/me/player',{method:'PUT',body:JSON.stringify({device_ids:[chosen.id],play:true})});await nap(500);availableNow=true;}
     catch(e){if(e.status!==404)throw e;}
   }
   notify(availableNow
     ?'✅ Wybrano i zapamiętano „'+chosen.name+'”. Teraz używaj START + Spotify. Jeśli iPhone przestanie odpowiadać, gra ponowi próbę połączenia.'
     :'⚠️ Zapamiętano „'+chosen.name+'”, ale Spotify nie potwierdziło, że jest aktywne. Spróbuj START; przy HTTP 404 włącz Spotify na telefonie ponownie.');
   if(availableNow){
    const settings=$('spotifyDeviceTools'),summary=$('spotifySetupSummary');
    if(settings)settings.open=false;
    if(summary)summary.textContent='✓ Spotify — '+chosen.name+' · ustawienia';
   }
  }catch(e){notify('❌ Przygotowanie Spotify: '+e.message);}
  finally{if(button)button.disabled=false;}
 }

 async function diagnose(writeFeedback=true){
  const report=$('spotifyDiagnostics'),select=$('spotifyDeviceSelect'),httpLog=$('spotifyHttpLog');
  const notify=msg=>{if(report)report.textContent=msg;if(writeFeedback&&$('game')&&!$('game').classList.contains('hidden'))feedback(msg);};
  const start=apiLog.length;
  const publishLog=()=>{
   if(!httpLog)return;
   const recent=apiLog.slice(start);
   httpLog.textContent=recent.length
    ?recent.map(r=>r.at+' | '+r.method+' '+r.path+' → '+(r.status==='NETWORK'?'BŁĄD SIECI':'HTTP '+r.status)).join('\n')
    :'Brak odpowiedzi HTTP z API. Sprawdź autoryzację i sieć.';
  };
  if(!isConnected()){notify('❌ FILMSTER nie ma zapisanej autoryzacji. Połącz konto w ustawieniach.');publishLog();return;}
  notify('⏳ Odpytuję Spotify Web API…');
  try{
   const profile=await spotifyApi('/me');
   const access=profile?.id?'✅ API uwierzytelnione':'✅ API odpowiedziało';
   const {list,current}=await playbackDevices();
   if(select){
    const chosenId=select.value||prefs.get('device-id');
    select.replaceChildren();
    for(const device of list){
     const option=document.createElement('option');option.value=device.id;option.textContent=(device.is_active?'▶ ':'')+device.name+' ('+device.type+')';select.appendChild(option);
    }
    const preferred=list.find(d=>d.id===chosenId)||list.find(d=>d.is_active)||list[0];
    if(preferred){select.value=preferred.id;rememberDevice(preferred);}
    select.disabled=!list.length;
   }
   const player=current?.device?.name||'brak aktywnego odtwarzacza';
   notify(access+'. Urządzenia: '+list.length+'. Aktywny odtwarzacz: '+player+'. '+(list.length?'Wybierz urządzenie i spróbuj START.':'Spotify nie udostępnia odtwarzacza — to inny problem niż logowanie.'));
  }catch(e){
   notify('❌ Test API: '+e.message);
  }finally{publishLog();}
 }

 async function pauseIfPlaying(){
  if(!startedOnSpotify)return;
  startedOnSpotify=false;
  try{await spotifyApi('/me/player/pause',{method:'PUT'});}catch(e){console.info('Spotify pause:',e.message)}
 }
 function isConnected(){return !!(prefs.get('client-id')&&(store.get('access-token')||store.get('refresh-token')));}
 async function handleCallback(){
  const params=new URLSearchParams(location.search);
  const code=params.get('code'),error=params.get('error');
  if(!code&&!error)return;
  history.replaceState(null,'',location.pathname+location.hash);
  if(error){status('Spotify: odrzucono autoryzację ('+error+').');$('spotifyConfig').open=true;return;}
  if(params.get('state')!==prefs.get('oauth-state')||Date.now()-Number(prefs.get('oauth-since')||0)>15*60*1000){status('Spotify: sesja logowania wygasła lub nie pasuje. Otwórz FILMSTER w Safari i połącz konto ponownie.');$('spotifyConfig').open=true;return;}
  const verifier=prefs.get('oauth-verifier'),client_id=prefs.get('client-id');
  prefs.del('oauth-state');prefs.del('oauth-verifier');prefs.del('oauth-since');
  if(!verifier||!client_id){status('Sesja logowania wygasła. Spróbuj ponownie.');return;}
  try{await postToken({grant_type:'authorization_code',code,redirect_uri:redirectUri(),client_id,code_verifier:verifier});status('🟡 Spotify zalogowane. Weryfikuję dostęp API…');$('spotifyConfig').open=true;await diagnose();}
  catch(e){status('Błąd połączenia: '+e.message);$('spotifyConfig').open=true;}
 }
 function disconnect(){
  ['access-token','expiry','refresh-token','scopes','verifier','state'].forEach(k=>store.del(k));['oauth-state','oauth-verifier','oauth-since'].forEach(k=>prefs.del(k));
  prefs.del('device-id');prefs.del('device-name');prefs.del('device-preference');trackCache.clear();albumCache.clear();
  startedOnSpotify=false;status('Rozłączono konto Spotify. Wciąż możesz otwierać utwory ręcznie.');
 }
 function setManualRound(b){manual=!!b;}
 const spotifyBridge={isConnected,hasDevice:()=>!!prefs.get('device-id'),isManualRound:()=>manual,setManualRound,play,pauseIfPlaying,diagnose,activateDevice,prime};
 window.FilmsterSpotify=spotifyBridge;

 // Short synthesized signals (not music recordings). Must be unlocked by a direct tap on iOS.
 let ctx=null;
 const getAudio=()=>{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return null;
  if(!ctx)ctx=new C();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
 };
 function beep(freq=600,duration=.13,volume=.30){
  try{
   const audio=getAudio();if(!audio)return false;
   const now=audio.currentTime+.007;
   const osc=audio.createOscillator(),gain=audio.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(freq,now);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.018);
   gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
   osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+duration+.015);
   return true;
  }catch(e){console.info('Audio unavailable:',e.message);return false;}
 }
 // Releasing AudioContext avoids retaining iOS audio focus while Spotify plays.
 async function releaseAudio(){
  if(!ctx)return;
  const existing=ctx;ctx=null;
  try{if(existing.state!=='closed')await existing.close();}catch(e){console.info('Audio release:',e.message);}
 }
 window.FilmsterAudio={unlock:()=>getAudio(),release:releaseAudio,tick:n=>beep(n===1?740:555,.17,.35),start:()=>{beep(1000,.28,.38);setTimeout(()=>beep(1270,.18,.25),130);},test:()=>{beep(600,.16,.36);setTimeout(()=>beep(850,.16,.36),250);setTimeout(()=>beep(1140,.23,.36),500);}};
 function updatePanel(){
  if($('spotifyRedirectUri'))$('spotifyRedirectUri').textContent=redirectUri();
  if($('spotifyClientId'))$('spotifyClientId').value=prefs.get('client-id');
  if(isConnected()){
   status('✅ Konto Spotify zalogowane do FILMSTER.');
   const saved=prefs.get('device-name'), note=$('spotifyActivationStatus');
   if(note&&saved)note.textContent='🎧 Poprzednio zapamiętane urządzenie: '+saved+'. Naciśnij START; przygotowanie Spotify jest potrzebne tylko gdy urządzenie przestanie działać.';
  }
 }
 $('spotifyConnect')?.addEventListener('click',()=>authorize().catch(e=>status(e.message)));
 $('spotifyDisconnect')?.addEventListener('click',disconnect);
 $('spotifyActivateOnce')?.addEventListener('click',activateDevice);
 $('spotifyRunDiagnostics')?.addEventListener('click',()=>diagnose(false));
 $('spotifyDeviceSelect')?.addEventListener('change',()=>{const el=$('spotifyDeviceSelect');if(el&&el.value){prefs.set('device-id',el.value);prefs.set('device-name',el.selectedOptions?.[0]?.textContent||'Spotify');prefs.set('device-preference','manual');const note=$('spotifyActivationStatus');if(note)note.textContent='✅ Wybrane urządzenie: '+(el.selectedOptions?.[0]?.textContent||'Spotify')+'. Możesz nacisnąć START.';}});
 $('testSound')?.addEventListener('click',()=>{
  window.FilmsterAudio.test();
  if($('audioStatus'))$('audioStatus').textContent='🔊 To tylko test. Podczas rund odliczanie jest wizualne, aby nie zatrzymywać muzyki Spotify na iPhonie.';
 });
 updatePanel();
 handleCallback().catch(e=>{status('Spotify: '+e.message);$('spotifyConfig').open=true;});
})();