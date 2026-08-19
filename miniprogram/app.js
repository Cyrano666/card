var cloudbase = require('@cloudbase/wx-cloud-client-sdk');
var cloudbaseEnvId = 'fx-d8gsy0r867fcba5ca';
var cloudbaseClient = null;
var readyPromise = null;

function getErrorMessage(error) {
  if (!error) return '请求失败，请稍后重试';
  return error.message || error.errMsg || '请求失败，请稍后重试';
}

function getSessionUid(auth) {
  return Promise.resolve(auth.getSession()).then(function (result) {
    var data = result && result.data ? result.data : result;
    var session = data && data.session ? data.session : data;
    var user = session && session.user ? session.user : null;
    return user && (user.id || user.uid);
  });
}

function initCloud() {
  if (cloudbaseClient) return cloudbaseClient;
  wx.cloud.init({ env: cloudbaseEnvId, traceUser: true });
  cloudbaseClient = cloudbase.init(wx.cloud, { envId: cloudbaseEnvId });
  return cloudbaseClient;
}

function loadProfile(uid) {
  var db = initCloud().rdb({ database: cloudbaseEnvId });
  return db.from('profiles').select('*').eq('id', uid).limit(1).then(function (result) {
    var rows = result && result.data ? result.data : [];
    if (rows.length) return rows[0];
    return db.from('profiles').insert({ id: uid, display_name: '新成员', role: 'member' }).select('*').then(function (created) {
      var createdRows = created && created.data ? created.data : [];
      return createdRows[0] || { id: uid, household_id: null, display_name: '新成员', role: 'member' };
    });
  });
}

App({
  globalData: {
    envId: cloudbaseEnvId,
    client: null,
    uid: '',
    profile: null
  },

  onLaunch: function () {
    this.globalData.client = initCloud();
  },

  ensureReady: function () {
    var self = this;
    if (readyPromise) return readyPromise;
    readyPromise = Promise.resolve().then(function () {
      var client = initCloud();
      return client.auth.signInWithOpenId().then(function (result) {
        if (result && result.error) throw result.error;
        return getSessionUid(client.auth);
      }).then(function (uid) {
        if (!uid) throw new Error('未获取到微信身份，请重新打开小程序');
        self.globalData.uid = uid;
        return loadProfile(uid);
      }).then(function (profile) {
        self.globalData.profile = profile;
        return { uid: self.globalData.uid, profile: profile, client: self.globalData.client };
      }).catch(function (error) {
        readyPromise = null;
        throw new Error(getErrorMessage(error));
      });
    });
    return readyPromise;
  },

  reloadProfile: function () {
    var self = this;
    if (!self.globalData.uid) return self.ensureReady();
    return loadProfile(self.globalData.uid).then(function (profile) {
      self.globalData.profile = profile;
      return { uid: self.globalData.uid, profile: profile, client: self.globalData.client };
    });
  },

  getDb: function () {
    return initCloud().rdb({ database: cloudbaseEnvId });
  },

  getAuth: function () {
    return initCloud().auth;
  },

  signOut: function () {
    var self = this;
    return Promise.resolve(initCloud().auth.signOut()).then(function () {
      readyPromise = null;
      self.globalData.uid = '';
      self.globalData.profile = null;
    });
  },

  errorMessage: getErrorMessage
});

