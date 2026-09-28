import {PRESETS} from "./presets.js";
const event = {name:"Sample autumn hackathon", url:"https://example.test/register", openPhrases:["registration is open","apply now"], upcomingPhrases:["coming soon","not yet open"], closedPhrases:["registration is closed","sold out"], requiredPhrases:["2026"], selector:"#current", focusText:"", dateMode:"none"};
const wrap = text => "<main><section id='current'><h1>Autumn Hackathon 2026</h1><p>" + text + "</p></section></main>";
export const DEMO_NOW = Date.parse("2026-09-28T12:00:00+03:00");
export const SCENARIOS = [
  {id:"upcoming", title:"Registration coming soon", watch:event, html:wrap("Registration is coming soon. Join us in October."), expected:"upcoming"},
  {id:"open", title:"Registration is open", watch:event, html:wrap("Registration is open. Apply now."), expected:"open"},
  {id:"closed", title:"Registration has closed", watch:event, html:wrap("Registration is closed. See you next year."), expected:"closed"},
  {id:"soldout", title:"Event tickets sold out", watch:event, html:wrap("Apply now for next year's mailing list. Tickets for this event are sold out."), expected:"closed"},
  {id:"archive", title:"Old open notice + current upcoming", watch:event, html:"<section><h2>Archive 2025</h2><p>Registration is open. Apply now.</p></section>" + wrap("Coming soon. Registration is not yet open."), expected:"upcoming"},
  {id:"negated", title:"Open words inside a negative sentence", watch:event, html:wrap("Registration is not open."), expected:"closed"},
  {id:"mixed", title:"VGM: school dates + foreign dates pending", watch:PRESETS.vgm, html:"<main><h1>2026 – 2027 Burs Başvuruları</h1><p>Ortaöğrenim başvurular başlamıştır.</p><table><tr><td>Ortaöğrenim Bursu</td><td>06 Ekim 2026 Saat 10.00</td><td>20 Ekim 2026 Saat 23.59</td></tr><tr><td>Yabancı Uyruklu Öğrenci Bursu</td><td>Henüz kesinleşmemiştir.</td></tr></table></main>", expected:"upcoming"},
  {id:"vgmopen", title:"VGM: foreign-student date window open", watch:PRESETS.vgm, html:"<main><h1>2026-2027 Burs Başvuruları</h1><table><tr><td>Yabancı Uyruklu Öğrenci Bursu</td><td>20 Eylül 2026 Saat 10.00</td><td>20 Ekim 2026 Saat 23.59</td></tr></table></main>", expected:"open"},
  {id:"captcha", title:"Website requires verification", watch:event, html:"<h1>Verify you are human</h1><p>CAPTCHA verification</p>", expected:"review"},
  {id:"changed", title:"Website layout changed", watch:event, html:"<div id='new-layout'>2026 — Registration is open</div>", expected:"review"},
  {id:"oldround", title:"Wrong registration year", watch:event, html:"<section id='current'><h1>Hackathon 2025</h1><p>Registration is open.</p></section>", expected:"review"},
  {id:"unclear", title:"No registration status on the page", watch:event, html:wrap("Find our agenda and speaker list here."), expected:"review"},
  {id:"hidden", title:"Hidden open text should not count", watch:event, html:wrap("Coming soon.") + "<script>Registration is open</script><div hidden>Apply now</div>", expected:"upcoming"},
  {id:"dvcheck", title:"DV result check is not entry registration", watch:PRESETS.dv, html:"<main><h1>Diversity Visa Program</h1><p>Check the status of your entry.</p><a href='/status'>Entrant Status Check</a></main>", expected:"review"},
  {id:"dvopen", title:"DV active Begin Entry button", watch:PRESETS.dv, html:"<main><h1>Diversity Visa Program</h1><p>Registration is now open.</p><a href='/entry'>Begin Entry</a></main>", expected:"open"},
  {id:"dvdisabled", title:"DV instructions without an active entry link", watch:PRESETS.dv, html:"<main><p>When registration is now open you will click Begin Entry.</p><button disabled>Begin Entry</button></main>", expected:"review"}
];

