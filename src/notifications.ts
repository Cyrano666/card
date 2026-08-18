import { LocalNotifications } from '@capacitor/local-notifications'

const reminderIds=[1400,1800]

export async function scheduleReminders(){
  try{
    const current=await LocalNotifications.checkPermissions()
    if(current.display!=='granted'){
      const requested=await LocalNotifications.requestPermissions()
      if(requested.display!=='granted') return
    }
    await LocalNotifications.cancel({notifications:reminderIds.map(id=>({id}))})
    await LocalNotifications.schedule({notifications:[
      {id:1400,title:'一起打卡',body:'下午好，看看还有没有未完成的打卡吧。',schedule:{on:{hour:14,minute:0},allowWhileIdle:true},sound:'default'},
      {id:1800,title:'一起打卡',body:'晚上好，别忘了完成今天的打卡。',schedule:{on:{hour:18,minute:0},allowWhileIdle:true},sound:'default'}
    ]})
  }catch{ /* Web 端没有原生通知能力时静默跳过 */ }
}

export async function cancelReminders(){
  try{await LocalNotifications.cancel({notifications:reminderIds.map(id=>({id}))})}catch{}
}
