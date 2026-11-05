// The coach-mark tour: two parts, each a list of steps. A step names the
// screen it needs (path), the control to cut out (target, see
// native/lib/tour.js) and where it draws: 'main' in the app shell, 'add' on
// the Add screen (a native sheet on iPhone, so it hosts its own overlay).
// The widget step has no cutout; its Next opens the widget tip.
export const TOUR_PARTS = {
  basics: {
    coins: 20,
    steps: [
      { key: 'swipe', path: '/tonight', target: 'swipe', scope: 'main', titleKey: 'tour.swipeTitle', lineKey: 'tour.swipeLine', hand: true },
      { key: 'add', path: '/tonight', target: 'menu', scope: 'main', titleKey: 'tour.addTitle', lineKey: 'tour.addLine' },
      { key: 'time', path: '/add', target: 'reminder', scope: 'add', titleKey: 'tour.timeTitle', lineKey: 'tour.timeLine' },
      { key: 'schedule', path: '/add', target: 'schedule', scope: 'add', titleKey: 'tour.scheduleTitle', lineKey: 'tour.scheduleLine' },
      { key: 'folders', path: '/add', target: 'folder', scope: 'add', scroll: true, titleKey: 'tour.foldersTitle', lineKey: 'tour.foldersLine' },
      { key: 'notYet', path: '/tonight', target: 'notYet', scope: 'main', titleKey: 'tour.notYetTitle', lineKey: 'tour.notYetLine' },
      { key: 'widget', path: '/tonight', target: '', scope: 'main', titleKey: 'tour.widgetTitle', lineKey: 'tour.widgetLine', widget: true },
    ],
  },
  more: {
    coins: 30,
    steps: [
      { key: 'friend', path: '/people/connect', target: 'friendId', scope: 'main', scroll: true, titleKey: 'tour.friendTitle', lineKey: 'tour.friendLine' },
      { key: 'you', path: '/add', target: 'lead', scope: 'add', titleKey: 'tour.youTitle', lineKey: 'tour.youLine' },
      { key: 'we', path: '/add', target: 'lead', scope: 'add', titleKey: 'tour.weTitle', lineKey: 'tour.weLine' },
      { key: 'cheer', path: '/people', target: 'people', scope: 'main', scroll: true, titleKey: 'tour.cheerTitle', lineKey: 'tour.cheerLine' },
      { key: 'shop', path: '/tonight', target: 'menu', scope: 'main', titleKey: 'tour.shopTitle', lineKey: 'tour.shopLine' },
      { key: 'questions', path: '/lamps', target: 'questions', scope: 'main', titleKey: 'tour.questionsTitle', lineKey: 'tour.questionsLine' },
      { key: 'recent', path: '/recent', target: 'recent', scope: 'main', scroll: true, titleKey: 'tour.recentTitle', lineKey: 'tour.recentLine' },
    ],
  },
}
