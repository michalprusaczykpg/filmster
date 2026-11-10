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
 const redirectUri=()=>location.origin+location.pathname;
 const status=(s)=>{if($('spotifyStatus'))$('spotifyStatus').textContent=s;};
 const feedback=(s)=>{if($('spotifyFeedback'))$('spotifyFeedback').textContent=s;};
 const randomUrl=()=>{const a=new Uint8Array(32);crypto.getRandomValues(a);return Array.from(a,v=>(v%36).toString(36)).join('');};
 const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 async function authorize(){
  const clientId=$('spotifyClientId').value.trim();
  if(!/^[0-9a-f]{32}$/i.test(clientId)){status('Wklej Client ID Spotify (32 znaki). Nie wklejaj Client Secret.');return;}
  prefs.set('client-id',clientId);
  if(!crypto?.subtle){status('Logowanie Spotify wymaga HTTPS. Otwórz stronę GitHub Pages.');return;}
  const verifier=randomUrl()+randomUrl();const challenge=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
  const state=randomUrl();store.set('verifier',verifier);store.set('state',state);
  const url=new URL('https://accounts.spotify.com/authorize');
  url.search=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:redirectUri(),scope:'user-read-playback-state user-modify-playback-state',state,code_challenge_method:'S256',code_challenge:challenge}).toString();
  location.assign(url.toString());
 }
 async function postToken(form){
  const response=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error_description||result.error||'Błąd logowania Spotify');
  store.set('access-token',result.access_token);
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
  const response=await fetch('https://api.spotify.com/v1'+path,{...opts,headers:{'Authorization':'Bearer '+bearer,'Content-Type':'application/json',...(opts.headers||{})}});
  if(response.status===204)return {};
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   const msg=typeof data?.error==='object'?data.error.message:data.error;
   if(response.status===401)throw new Error('Sesja Spotify wygasła. Połącz konto jeszcze raz.');
   if(response.status===403)throw new Error('Spotify nie zezwoliło na odtwarzanie. Sprawdź Premium oraz dostęp użytkownika w Spotify Developer Dashboard.');
   if(response.status===404)throw new Error('Nie znaleziono aktywnego odtwarzacza Spotify.');
   if(response.status===429)throw new Error('Spotify ogranicza liczbę zapytań. Spróbuj ponownie za chwilę.');
   throw new Error('Spotify: '+(msg||'błąd '+response.status));
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
 async function play(song){
  if(!isConnected())throw new Error('Nie połączono konta Spotify.');
  const q='track:'+song.title+' artist:'+song.artist;
  const search=await spotifyApi('/search?'+new URLSearchParams({q,type:'track',limit:'10'}));
  let tracks=search.tracks?.items||[];
  if(!tracks.length){const loose=await spotifyApi('/search?'+new URLSearchParams({q:song.title+' '+song.artist,type:'track',limit:'10'}));tracks=loose.tracks?.items||[];}
  if(!tracks.length)throw new Error('Nie znalazłem tego nagrania w Spotify. Możesz wyszukać je ręcznie.');
  tracks.sort((a,b)=>rankSong(song,b)-rankSong(song,a));
  if(rankSong(song,tracks[0])<22)throw new Error('Spotify nie znalazło wiarygodnego dopasowania utworu. Wyszukaj ręcznie.');
  const devices=await spotifyApi('/me/player/devices');
  const available=(devices.devices||[]).filter(d=>!d.is_restricted);
  if(!available.length)throw new Error('Otwórz aplikację Spotify, odtwórz dowolny utwór, wróć do FILMSTER i spróbuj ponownie.');
  const active=available.find(d=>d.is_active)||available[0];
  if(!active?.id)throw new Error('Spotify nie zwróciło urządzenia do odtwarzania.');
  await spotifyApi('/me/player/play?device_id='+encodeURIComponent(active.id),{method:'PUT',body:JSON.stringify({uris:[tracks[0].uri],position_ms:0})});
  startedOnSpotify=true;
  return active.name;
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
  if(params.get('state')!==store.get('state')){status('Spotify: zabezpieczenie logowania nie pasuje. Spróbuj jeszcze raz.');$('spotifyConfig').open=true;return;}
  const verifier=store.get('verifier'),client_id=prefs.get('client-id');
  store.del('state');store.del('verifier');
  if(!verifier||!client_id){status('Sesja logowania wygasła. Spróbuj ponownie.');return;}
  try{await postToken({grant_type:'authorization_code',code,redirect_uri:redirectUri(),client_id,code_verifier:verifier});status('✅ Spotify połączone. Otwórz Spotify, odtwórz dowolny utwór i wróć do FILMSTER.');$('spotifyConfig').open=true;}
  catch(e){status('Błąd połączenia: '+e.message);$('spotifyConfig').open=true;}
 }
 function disconnect(){
  ['access-token','expiry','refresh-token','verifier','state'].forEach(k=>store.del(k));
  startedOnSpotify=false;status('Rozłączono konto Spotify. Wciąż możesz otwierać utwory ręcznie.');
 }
 function setManualRound(b){manual=!!b;}
 const spotifyBridge={isConnected,isManualRound:()=>manual,setManualRound,play,pauseIfPlaying};
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
 window.FilmsterAudio={unlock:()=>getAudio(),tick:n=>beep(n===1?740:555,.17,.35),start:()=>{beep(1000,.28,.38);setTimeout(()=>beep(1270,.18,.25),130);},test:()=>{beep(600,.16,.36);setTimeout(()=>beep(850,.16,.36),250);setTimeout(()=>beep(1140,.23,.36),500);}};
 function updatePanel(){
  if($('spotifyRedirectUri'))$('spotifyRedirectUri').textContent=redirectUri();
  if($('spotifyClientId'))$('spotifyClientId').value=prefs.get('client-id');
  if(isConnected())status('✅ Spotify połączone. Otwórz aplikację Spotify i włącz dowolną piosenkę, potem wróć do gry.');
 }
 $('spotifyConnect')?.addEventListener('click',()=>authorize().catch(e=>status(e.message)));
 $('spotifyDisconnect')?.addEventListener('click',disconnect);
 $('testSound')?.addEventListener('click',()=>{
  window.FilmsterAudio.test();
  if($('audioStatus'))$('audioStatus').textContent='🔊 Słychać 3 sygnały? Jeśli nie, zwiększ głośność multimediów i wyłącz tryb cichy.';
 });
 updatePanel();
 handleCallback().catch(e=>{status('Spotify: '+e.message);$('spotifyConfig').open=true;});
})();