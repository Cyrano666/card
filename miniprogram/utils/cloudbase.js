var app = getApp();

function rows(result) {
  return result && result.data ? result.data : [];
}

function today() {
  var date = new Date();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function daysAgo(number) {
  var date = new Date(Date.now() - number * 86400000);
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function loadWorkspace() {
  var profile = app.globalData.profile;
  if (!profile || !profile.household_id) return Promise.resolve({ tasks: [], checks: [], invite: '' });
  var db = app.getDb();
  return Promise.all([
    db.from('tasks').select('*').eq('active', true).eq('household_id', profile.household_id).order('created_at', { ascending: true }),
    db.from('checkins').select('*').gte('checkin_date', daysAgo(30)).order('created_at', { ascending: false }),
    db.from('households').select('invite_code').eq('id', profile.household_id).limit(1)
  ]).then(function (result) {
    var households = rows(result[2]);
    return { tasks: rows(result[0]), checks: rows(result[1]), invite: households[0] ? households[0].invite_code : '' };
  });
}

function getToday() {
  return today();
}

function savePhoto(filePath, householdId) {
  if (!filePath) return Promise.resolve(null);
  return new Promise(function (resolve, reject) {
    wx.cloud.uploadFile({
      cloudPath: 'checkin-photos/' + householdId + '/' + Date.now() + '.jpg',
      filePath: filePath,
      success: function (result) { resolve(result.fileID || null); },
      fail: reject
    });
  });
}

function choosePhoto() {
  return new Promise(function (resolve, reject) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (result) {
        var file = result.tempFiles && result.tempFiles[0];
        resolve(file ? file.tempFilePath : null);
      },
      fail: reject
    });
  });
}

module.exports = {
  rows: rows,
  today: getToday,
  daysAgo: daysAgo,
  loadWorkspace: loadWorkspace,
  savePhoto: savePhoto,
  choosePhoto: choosePhoto
};

