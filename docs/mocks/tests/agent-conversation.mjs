import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)).replace(/\/$/,'');
mkdirSync(root+'/.local',{recursive:true});
const {chromium,expect}=createRequire(process.env.PORTFOLIO_PLAYWRIGHT_PACKAGE || root+'/e2e/package.json')('@playwright/test');
const browser=await chromium.launch({headless:true,executablePath:process.env.PORTFOLIO_CHROMIUM_PATH || undefined});
const checks=[],errors=[],network=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await page.addInitScript(()=>{window.micCalls=0;navigator.mediaDevices.getUserMedia=()=>{window.micCalls++;throw Error('Mock must not capture audio');};});
 await page.goto('file://'+root+'/docs/mocks/agent-conversation.html');
 await page.screenshot({path:root+'/.local/conversation-hero-light.png'});
 await page.locator('#open-chat').click();
 await expect(page.locator('#message')).toBeFocused();
 await page.locator('[data-query="agent systems"]').click();
 await expect(page.locator('#sources .evidence-card')).toHaveCount(2);
 await expect(page.locator('#thread')).toContainText('agent harness');
 const publicURLs=await page.locator('#sources a').evaluateAll(es=>es.map(e=>e.href));
 if(publicURLs.some(u=>!u.startsWith('https://www.jckail.com/')))throw Error('Source isolation');
 await page.screenshot({path:root+'/.local/conversation-text-light.png'});
 await page.locator('#message').fill('Unknown confidential achievement');await page.locator('#send').click();
 await expect(page.locator('#thread')).toContainText('I do not have supporting evidence');
 await expect(page.locator('#sources .evidence-card')).toHaveCount(0);
 for(let i=0;i<2;i++){await page.locator('[data-query="projects"]').click();await expect(page.locator('#send')).toBeEnabled();}
 await page.locator('[data-query="agent systems"]').click();await expect(page.locator('#text-status')).toContainText('quota exhausted');
 checks.push('Grounded answers, public source links, unsupported claims denied, four-turn quota');
 await page.locator('.lab summary').click();await page.locator('#reset').click();
 await page.locator('[data-query="projects"]').evaluate(el=>{el.click();el.click();el.click();});
 await expect(page.locator('#send')).toBeEnabled();
 await expect(page.locator('#thread .user')).toHaveCount(1);
 await page.locator('#reset').click();await page.locator('[data-query="agent systems"]').click();await page.locator('#voice-mode').click();
 await page.waitForTimeout(400);await expect(page.locator('#thread .agent')).toHaveCount(1);await expect(page.locator('#text-status')).toHaveText('');
 checks.push('Repeated clicks admit one turn; switching mode cancels pending answer');
 await page.locator('#reset').click();
 for(const [scenario,phrase] of [['mic-denied','Microphone access denied'],['auth-canceled','Sign-in canceled'],['quota','quota exhausted'],['missing-config','API not configured'],['provider-error','Voice provider unavailable']]) {
  await page.locator('#scenario').selectOption(scenario);await page.locator('#start-voice').click();await expect(page.locator('#voice-status')).toContainText(phrase);
  if(!await page.evaluate(()=>sample.paused&&!voiceActive))throw Error('Denied voice started '+scenario);
 }
 await page.locator('#text-mode').click();await page.locator('[data-query="projects"]').click();await expect(page.locator('#sources .evidence-card')).toHaveCount(2);
 checks.push('Denied microphone, canceled sign-in, missing API, exhausted quota, provider error, text fallback');
 await page.locator('#reset').click();await page.locator('#voice-mode').click();
 for(const provider of ['ElevenLabs (mock)','OpenAI Realtime (mock)']) {
  await page.locator('#provider').selectOption({label:provider});await page.locator('#start-voice').click();await page.waitForTimeout(1150);
  await expect(page.locator('#voice-status')).toContainText('Speaking');
  await expect(page.locator('#sources .evidence-card')).toHaveCount(2);
  const audio=await page.evaluate(()=>({paused:sample.paused,duration:sample.duration,active:voiceActive}));
  if(audio.paused||!audio.active||!(audio.duration>0&&audio.duration<20))throw Error('Offline audio failed '+JSON.stringify(audio));
  await page.locator('#mute').click();if(!await page.evaluate(()=>sample.muted))throw Error('Mute');
  await page.locator('#mute').click();if(await page.evaluate(()=>sample.muted))throw Error('Unmute');
  await page.screenshot({path:root+'/.local/conversation-voice-light.png'});
  await page.locator('#interrupt').click();await page.waitForTimeout(1000);
  await expect(page.locator('#voice-status')).toContainText('Interrupted');if(!await page.evaluate(()=>sample.paused&&!voiceActive&&timers.length===0))throw Error('Interrupt leak');
 }
 checks.push('Both provider fixtures: actual offline playback, mute/unmute, interruption and source display');
 await page.locator('#reset').click();await page.locator('#start-voice').click();await page.locator('#end-voice').click();await page.waitForTimeout(1000);await expect(page.locator('#voice-status')).toHaveText('Conversation ended');
 await page.locator('#start-voice').click();await page.keyboard.press('Escape');await page.waitForTimeout(1000);await expect(page.locator('#open-chat')).toBeFocused();
 if(!await page.evaluate(()=>sample.paused&&!voiceActive))throw Error('Escape did not stop');
 checks.push('End and Escape cancel pending speech and restore focus');
 await page.locator('#open-chat').click();await page.locator('#voice-mode').click();await page.locator('#reset').click();
 await page.evaluate(()=>{window.realPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=()=>Promise.reject(Error('Fixture denied autoplay'));});
 await page.locator('#start-voice').click();await expect(page.locator('#voice-status')).toContainText('Audio unavailable');
 await page.evaluate(()=>{HTMLMediaElement.prototype.play=window.realPlay;});await page.locator('#end-voice').click();
 checks.push('Playback denial leaves transcript and sources available');
 await page.locator('#reset').click();await page.locator('#start-voice').click();await page.locator('#provider').selectOption({label:'ElevenLabs (mock)'});await page.waitForTimeout(1000);
 await expect(page.locator('#voice-status')).toContainText('Provider changed');if(!await page.evaluate(()=>sample.paused&&!voiceActive))throw Error('Provider change retained speech');
 await page.locator('#start-voice').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(1000);await expect(page.locator('#voice-status')).toContainText('Paused while the page is hidden');
 await page.evaluate(()=>{delete document.hidden;});
 checks.push('Changing provider or hiding the page cancels pending speech');
 await page.locator('#close-chat').click();await page.locator('#theme').click();await page.screenshot({path:root+'/.local/conversation-hero-dark.png'});
 await page.locator('#open-connect').click();await expect(page.locator('#connection')).toBeVisible();await expect(page.locator('#connection')).toContainText('Public deployment is pending');
 await page.locator('#connect').click();await page.screenshot({path:root+'/.local/conversation-text-dark.png'});
 for(const theme of ['light','dark'])for(const width of [320,390,768,1280]) {
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page overflow '+width);
  const dialog=await page.locator('#conversation').boundingBox();if(dialog.x<0||dialog.x+dialog.width>width+1)throw Error('Dialog overflow '+width);
  await expect(page.locator('#close-chat')).toBeInViewport();
  await page.locator('#voice-mode').click();await expect(page.locator('#start-voice')).toBeVisible();await page.locator('#text-mode').click();
  await page.keyboard.press('Tab');if(!await page.evaluate(()=>document.querySelector('#conversation').contains(document.activeElement)))throw Error('Focus escaped dialog');
  if(width===390)await page.screenshot({path:root+'/.local/conversation-mobile-'+theme+'.png'});
  checks.push(theme+' '+width+'px: no overflow, close, modes, keyboard focus');
 }
 if(errors.length||network.length||await page.evaluate(()=>window.micCalls))throw Error(JSON.stringify({errors,network,micCalls:await page.evaluate(()=>window.micCalls)}));
 const result={passed:true,checks,pageErrors:errors,externalRequests:network,microphoneCalls:0,providers:'mock only',audio:'offline stock SAPI sample'};
 writeFileSync(root+'/.local/conversation-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {await browser.close();}
