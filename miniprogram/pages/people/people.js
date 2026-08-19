var app = getApp();
var cloud = require('../../utils/cloudbase');

Page({
  data: { loading: true, needsSetup: false, profile: null, invite: '', message: '' },

  onShow: function () {
    var self = this;
    app.ensureReady().then(function (ready) {
      if (!ready.profile.household_id) return self.setData({ loading: false, needsSetup: true, profile: ready.profile });
      return cloud.loadWorkspace().then(function (workspace) { self.setData({ loading: false, needsSetup: false, profile: app.globalData.profile, invite: workspace.invite }); });
    }).catch(function (error) { self.setData({ loading: false, message: app.errorMessage(error) }); });
  },

  copyInvite: function () {
    if (!this.data.invite) return;
    wx.setClipboardData({ data: this.data.invite, success: function () { wx.showToast({ title: '邀请码已复制', icon: 'none' }); } });
  },

  switchSpace: function () { wx.switchTab({ url: '/pages/index/index' }); },

  logout: function () {
    var self = this;
    wx.showModal({ title: '退出当前微信身份', content: '退出后会回到小程序首页，数据不会删除。', success: function (result) {
      if (!result.confirm) return;
      app.signOut().then(function () { wx.reLaunch({ url: '/pages/index/index' }); }).catch(function (error) { self.setData({ message: app.errorMessage(error) }); });
    } });
  }
});

