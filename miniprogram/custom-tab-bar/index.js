Component({
  data: { selected: 0, list: [{ pagePath: '/pages/index/index', text: '今天', icon: '⌂' }, { pagePath: '/pages/records/records', text: '记录', icon: '▦' }, { pagePath: '/pages/people/people', text: '我们', icon: '♧' }] },
  lifetimes: { attached: function () { this.sync(); } },
  pageLifetimes: { show: function () { this.sync(); } },
  methods: {
    sync: function () { var pages = getCurrentPages(); var current = pages[pages.length - 1]; var path = current ? '/' + current.route : ''; var selected = this.data.list.findIndex(function (item) { return item.pagePath === path; }); this.setData({ selected: selected < 0 ? 0 : selected }); },
    switchTab: function (event) { wx.switchTab({ url: event.currentTarget.dataset.path }); }
  }
});

