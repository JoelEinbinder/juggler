const {Helper} = ChromeUtils.import('chrome://juggler/content/Helper.js');
const {ContentSession} = ChromeUtils.import('chrome://juggler/content/content/ContentSession.js');
const {FrameTree} = ChromeUtils.import('chrome://juggler/content/content/FrameTree.js');
const {NetworkMonitor} = ChromeUtils.import('chrome://juggler/content/content/NetworkMonitor.js');
const {ScrollbarManager} = ChromeUtils.import('chrome://juggler/content/content/ScrollbarManager.js');

const sessions = new Map();
const frameTree = new FrameTree(docShell);
const networkMonitor = new NetworkMonitor(docShell, frameTree);
const scrollbarManager = new ScrollbarManager(docShell);

const helper = new Helper();
const messageManager = this;

function createContentSession(sessionId) {
  const session = new ContentSession(sessionId, messageManager, frameTree, scrollbarManager, networkMonitor);
  sessions.set(sessionId, session);
  return session;
}

function disposeContentSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session)
    return;
  sessions.delete(sessionId);
  session.dispose();
}

const gListeners = [
  helper.addMessageListener(messageManager, 'juggler:create-content-session', msg => {
    const sessionId = msg.data;
    createContentSession(sessionId);
  }),

  helper.addMessageListener(messageManager, 'juggler:dispose-content-session', msg => {
    const sessionId = msg.data;
    disposeContentSession(sessionId);
  }),

  helper.addEventListener(messageManager, 'unload', msg => {
    helper.removeListeners(gListeners);
    for (const session of sessions.values())
      session.dispose();
    sessions.clear();
    scrollbarManager.dispose();
    networkMonitor.dispose();
    frameTree.dispose();
  }),
];

const [attachInfo] = sendSyncMessage('juggler:content-ready', {});
for (const { sessionId, messages } of attachInfo || []) {
  const session = createContentSession(sessionId);
  for (const message of messages)
    session.handleMessage(message);
}
