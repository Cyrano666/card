var app = getApp();
var cloud = require('../../utils/cloudbase');
var quotes = [
  '今天完成的一小步，也是给自己的大大的拥抱。',
  '慢慢来，你已经比昨天更靠近目标了。',
  '认真生活的人，连平凡的日子也会发光。',
  '把今天过好，就是最温柔的自律。',
  '每一次打卡，都是在对未来的自己说：我会做到。'
];

Page({
  data: {
    loading: true,
    needsSetup: false,
    setupMode: '',
    profile: null,
    tasks: [],
    checks: [],
    doneCount: 0,
    percent: 0,
    invite: '',
    displayName: '',
    joinCode: '',
    message: '',
    busy: false,
    showCheckin: false,
    selectedTask: null,
    note: '',
    photoPath: '',
    celebration: '',
    showEditor: false,
    editingId: '',
    title: '',
    description: '',
    dueTime: ''
  },

  onLoad: function () { this.start(); },

  onShow: function () {
    if (!this.data.loading && !this.data.needsSetup) this.refresh();
  },

  start: function () {
    var self = this;
    this.setData({ loading: true, message: '' });
    app.ensureReady().then(function (ready) {
      self.setData({ profile: ready.profile, displayName: ready.profile.display_name || '' });
      if (!ready.profile.household_id) {
        wx.hideTabBar({ animation: false });
        self.setData({ loading: false, needsSetup: true });
        return null;
      }
      wx.showTabBar({ animation: false });
      return self.refresh();
    }).catch(function (error) {
      self.setData({ loading: false, message: app.errorMessage(error) });
    });
  },

  refresh: function () {
    var self = this;
    return cloud.loadWorkspace().then(function (workspace) {
      var done = {};
      var date = cloud.today();
      workspace.checks.forEach(function (item) {
        if (item.checkin_date === date) done[item.task_id] = true;
      });
      var tasks = workspace.tasks.map(function (task) {
        var dueLabel = task.due_time ? String(task.due_time).slice(0, 5) : '';
        return Object.assign({}, task, {
          done: !!done[task.id],
          dueLabel: dueLabel,
          summary: done[task.id] ? '已完成' : ((task.description || '点击完成今天的打卡') + (dueLabel ? ' · ' + dueLabel + ' 前' : ''))
        });
      });
      var doneCount = tasks.filter(function (task) { return task.done; }).length;
      self.setData({ loading: false, needsSetup: false, tasks: tasks, checks: workspace.checks, invite: workspace.invite, doneCount: doneCount, percent: tasks.length ? Math.round(doneCount * 100 / tasks.length) : 0 });
      return workspace;
    }).catch(function (error) {
      self.setData({ loading: false, message: app.errorMessage(error) });
    });
  },

  selectSetup: function (event) {
    this.setData({ setupMode: event.currentTarget.dataset.mode, message: '' });
  },

  handleSetupAction: function () {
    if (this.data.setupMode === 'create') this.createSpace();
    else this.joinSpace();
  },

  inputName: function (event) { this.setData({ displayName: event.detail.value }); },
  inputCode: function (event) { this.setData({ joinCode: event.detail.value.toUpperCase() }); },

  createSpace: function () {
    var self = this;
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    var code = Math.random().toString(36).slice(2, 8).toUpperCase();
    var db = app.getDb();
    db.from('households').insert({ name: '我们的打卡', invite_code: code, owner_id: app.globalData.uid }).select('*').then(function (result) {
      var house = cloud.rows(result)[0];
      if (!house) throw new Error('创建空间失败');
      return db.from('profiles').update({ household_id: house.id, display_name: self.data.displayName || '新成员', role: 'owner' }).eq('id', app.globalData.uid);
    }).then(function () {
      return app.reloadProfile();
    }).then(function () {
      self.setData({ profile: app.globalData.profile, needsSetup: false, setupMode: '', busy: false });
      wx.showTabBar({ animation: false });
      return self.refresh();
    }).catch(function (error) {
      self.setData({ busy: false, message: app.errorMessage(error) });
    });
  },

  joinSpace: function () {
    var self = this;
    var code = (this.data.joinCode || '').trim().toUpperCase();
    if (code.length !== 6) return this.setData({ message: '请输入 6 位邀请码' });
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    app.getDb().rpc('join_household', { code: code, chosen_name: this.data.displayName || '新成员' }).then(function (result) {
      if (result && result.error) throw result.error;
      return app.reloadProfile();
    }).then(function () {
      self.setData({ profile: app.globalData.profile, needsSetup: false, setupMode: '', busy: false });
      wx.showTabBar({ animation: false });
      return self.refresh();
    }).catch(function (error) {
      self.setData({ busy: false, message: app.errorMessage(error) });
    });
  },

  openCheckin: function (event) {
    var task = this.data.tasks.find(function (item) { return item.id === event.currentTarget.dataset.id; });
    if (!task) return;
    this.setData({ showCheckin: true, selectedTask: task, note: '', photoPath: '', message: '' });
  },

  handleTaskTap: function (event) {
    var task = this.data.tasks.find(function (item) { return item.id === event.currentTarget.dataset.id; });
    if (!task) return;
    if (task.done) this.setData({ showEditor: true, editingId: task.id, title: task.title, description: task.description || '', dueTime: task.due_time ? String(task.due_time).slice(0, 5) : '', message: '' });
    else this.setData({ showCheckin: true, selectedTask: task, note: '', photoPath: '', message: '' });
  },
  closeCheckin: function () { this.setData({ showCheckin: false, selectedTask: null }); },
  inputNote: function (event) { this.setData({ note: event.detail.value }); },

  choosePhoto: function () {
    var self = this;
    cloud.choosePhoto().then(function (path) { self.setData({ photoPath: path || '' }); }).catch(function () {});
  },

  confirmCheckin: function () {
    var self = this;
    var task = this.data.selectedTask;
    if (!task || this.data.busy) return;
    this.setData({ busy: true, message: '' });
    cloud.savePhoto(this.data.photoPath, app.globalData.profile.household_id).then(function (photoUrl) {
      return app.getDb().from('checkins').insert({
        task_id: task.id,
        user_id: app.globalData.uid,
        checkin_date: cloud.today(),
        note: self.data.note || null,
        photo_url: photoUrl
      });
    }).then(function (result) {
      if (result && result.error) throw result.error;
      self.setData({ busy: false, showCheckin: false, selectedTask: null, celebration: quotes[Math.floor(Math.random() * quotes.length)] });
      wx.vibrateShort({ type: 'light' });
      self.refresh();
      setTimeout(function () { self.setData({ celebration: '' }); }, 3200);
    }).catch(function (error) {
      self.setData({ busy: false, message: app.errorMessage(error) });
    });
  },

  openEditor: function (event) {
    var task = event.currentTarget.dataset.id ? this.data.tasks.find(function (item) { return item.id === event.currentTarget.dataset.id; }) : null;
    this.setData({ showEditor: true, editingId: task ? task.id : '', title: task ? task.title : '', description: task ? (task.description || '') : '', dueTime: task && task.due_time ? task.due_time.slice(0, 5) : '', message: '' });
  },
  closeEditor: function () { this.setData({ showEditor: false, editingId: '' }); },
  inputTitle: function (event) { this.setData({ title: event.detail.value }); },
  inputDescription: function (event) { this.setData({ description: event.detail.value }); },
  inputDueTime: function (event) { this.setData({ dueTime: event.detail.value }); },

  saveTask: function () {
    var self = this;
    var title = (this.data.title || '').trim();
    if (!title) return this.setData({ message: '请输入任务名称' });
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    var values = { title: title, description: this.data.description || null, due_time: this.data.dueTime || null, schedule: 'daily', active: true, household_id: app.globalData.profile.household_id, created_by: app.globalData.uid };
    var query = this.data.editingId ? app.getDb().from('tasks').update(values).eq('id', this.data.editingId) : app.getDb().from('tasks').insert(values);
    query.then(function (result) {
      if (result && result.error) throw result.error;
      self.setData({ busy: false, showEditor: false, editingId: '' });
      return self.refresh();
    }).catch(function (error) { self.setData({ busy: false, message: app.errorMessage(error) }); });
  },

  deleteTask: function () {
    var self = this;
    if (!this.data.editingId) return;
    wx.showModal({ title: '删除任务', content: '确定删除这个任务吗？', success: function (result) {
      if (!result.confirm) return;
      app.getDb().from('tasks').update({ active: false }).eq('id', self.data.editingId).then(function () {
        self.setData({ showEditor: false, editingId: '' });
        self.refresh();
      });
    } });
  }
});

