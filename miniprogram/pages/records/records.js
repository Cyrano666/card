var app = getApp();
var cloud = require('../../utils/cloudbase');

Page({
  data: { loading: true, needsSetup: false, records: [], message: '' },

  onShow: function () {
    var self = this;
    app.ensureReady().then(function (ready) {
      if (!ready.profile.household_id) return self.setData({ loading: false, needsSetup: true });
      return self.load();
    }).catch(function (error) { self.setData({ loading: false, message: app.errorMessage(error) }); });
  },

  load: function () {
    var self = this;
    var db = app.getDb();
    return Promise.all([
      db.from('checkins').select('*').gte('checkin_date', cloud.daysAgo(30)).order('checkin_date', { ascending: false }).order('created_at', { ascending: false }),
      db.from('tasks').select('id,title').eq('household_id', app.globalData.profile.household_id)
    ]).then(function (result) {
      var taskMap = {};
      cloud.rows(result[1]).forEach(function (task) { taskMap[task.id] = task.title; });
      var records = cloud.rows(result[0]).map(function (item) {
        return Object.assign({}, item, { taskTitle: taskMap[item.task_id] || '已删除任务', dateLabel: item.checkin_date, timeLabel: item.created_at ? String(item.created_at).slice(11, 16) : '' });
      });
      self.setData({ loading: false, needsSetup: false, records: records });
    });
  }
});

