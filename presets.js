export const PRESETS = {
  vgm: {
    name:"VGM · Foreign-student scholarship",
    url:"https://www.vgm.gov.tr/sayfalar/burs-basvurulari",
    focusText:"Yabancı Uyruklu Öğrenci Bursu",
    requiredPhrases:["2026-2027"],
    openPhrases:["başvurular başlamıştır","başvurular alınmaktadır","başvuru yap"],
    upcomingPhrases:["Henüz kesinleşmemiştir","henüz belirlenmemiştir","başvurular başlamamıştır"],
    closedPhrases:["başvurular sona ermiştir","başvuru süresi sona ermiştir"],
    dateMode:"turkish"
  },
  dv: {
    name:"DV Lottery · Entry registration",
    actionText:"Begin Entry",
    url:"https://dvprogram.state.gov/",
    focusText:"",
    requiredPhrases:[],
    openPhrases:["Begin Entry","entry period is now open","registration is now open"],
    upcomingPhrases:["entry period will begin","registration will open","not yet open"],
    closedPhrases:["entry period is closed","entry period has ended","registration period has ended","no longer accepting entries"],
    dateMode:"none"
  }
};

