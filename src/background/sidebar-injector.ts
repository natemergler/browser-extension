import {
  chromeAPI,
  executeFunction,
  executeScript,
  getExtensionId,
} from './chrome-api';
import { detectContentType } from './detect-content-type';
import {
  AlreadyInjectedError,
  BlockedSiteError,
  LocalFileError,
  NoFileAccessError,
  RestrictedProtocolError,
} from './errors';

const CONTENT_TYPE_HTML = 'HTML';
const CONTENT_TYPE_PDF = 'PDF';

/* istanbul ignore next - Code coverage breaks `eval`-ing of this function in tests. */
function setClientConfig(config: object, extensionId: string) {
  const script = document.createElement('script');
  script.className = 'js-hypothesis-config';
  script.type = 'application/json';
  script.textContent = JSON.stringify(config);
  script.setAttribute('data-extension-id', extensionId);
  // This ensures the client removes the script when the extension is deactivated
  script.setAttribute('data-remove-on-unload', '');
  document.head.appendChild(script);
}

/**
 * Function that is run in a frame to test whether the Hypothesis client is
 * active there.
 *
 * @param extensionURL - Root URL for the extension, of the form
 *   "chrome-extension://{ID}/".
 */
function isClientActive(extensionURL: string) {
  const annotatorLink = document.querySelector(
    'link[type="application/annotator+html"]',
  ) as HTMLLinkElement | null;
  return annotatorLink?.href.startsWith(extensionURL) ?? false;
}

/**
 * A Chrome tab for which we have ID and URL information.
 *
 * This type avoids the need to check everywhere we access these properties.
 */
type Tab = chrome.tabs.Tab & { id: number; url: string };

/**
 * Check that a tab has the necessary metadata to inject or un-inject the client.
 *
 * All "normal" tabs should have this information because of the extension's
 * permissions.
 */
function checkTab(tab: chrome.tabs.Tab): Tab {
  if (!tab.id || !tab.url) {
    throw new Error('Tab is missing ID or URL');
  }
  return tab as Tab;
}

/**
 * The SidebarInjector is used to deploy and remove the Hypothesis sidebar
 * from tabs. It also deals with loading PDF documents into the PDF.js viewer
 * when applicable.
 */
export class SidebarInjector {
  isClientActiveInTab: (tab: chrome.tabs.Tab) => Promise<boolean>;
  injectIntoTab: (tab: chrome.tabs.Tab, config: object) => Promise<void>;
  removeFromTab: (tab: chrome.tabs.Tab) => Promise<void>;
  requestExtraPermissionsForTab: (tab: chrome.tabs.Tab) => Promise<boolean>;

  constructor() {
    const pdfViewerBaseURL = chromeAPI.runtime.getURL('/pdfjs/web/viewer.html');

    /**
     * Check for the presence of the client in a browser tab.
     *
     * If code cannot be run in this tab to check the state of the client, it is
     * assumed to not be active.
     */
    this.isClientActiveInTab = async (tab: chrome.tabs.Tab) => {
      const tab_ = checkTab(tab);

      // If this is our PDF viewer, the client is definitely active.
      if (isPDFViewerURL(tab_.url)) {
        return true;
      }

      try {
        const extensionURL = chromeAPI.runtime.getURL('/');
        const isActive = await executeFunction({
          tabId: tab_.id,
          func: isClientActive,
          args: [extensionURL],
        });
        return isActive;
      } catch {
        // We failed to run code in this tab, eg. because it is a URL that
        // disallows extension scripting or it is being unloaded.
        return false;
      }
    };

    /**
     * Injects the Hypothesis sidebar into the tab provided.
     *
     * @param tab - A tab object representing the tab to insert the sidebar into.
     * @param config - An object containing configuration info that is passed to
     *   the app when it loads.
     *
     * Returns a promise that will be resolved if the injection succeeded
     * otherwise it will be rejected with an error.
     */
    this.injectIntoTab = (tab: chrome.tabs.Tab, config: object = {}) => {
      const tab_ = checkTab(tab);
      if (isFileURL(tab_.url)) {
        return injectIntoLocalDocument(tab_, config);
      } else {
        return injectIntoRemoteDocument(tab_, config);
      }
    };

    /**
     * Removes the Hypothesis sidebar from the tab provided.
     *
     * Returns a promise that will be resolved if the removal succeeded
     * otherwise it will be rejected with an error.
     */
    this.removeFromTab = (tab: chrome.tabs.Tab) => {
      const tab_ = checkTab(tab);
      if (isPDFViewerURL(tab_.url)) {
        return removeFromPDF(tab_);
      } else {
        return removeFromHTML(tab_);
      }
    };

    /**
     * Request additional permissions that are required to inject Hypothesis
     * into a given tab.
     *
     * No additional permissions are required for basic web pages.
     */
    this.requestExtraPermissionsForTab = async (tab: chrome.tabs.Tab) => {
      // No extra permissions needed for standard web pages.
      return true;
    };

    function getPDFViewerURL(url: string) {
      // Encode the original URL but preserve the fragment. Preserving the
      // fragment was originally done to support `#annotations:` fragments that
      // bouncer used to use. Bouncer and the extension now use a different
      // mechanism to pass direct-linked annotation IDs to the client. However
      // preserving the fragment may be useful for other reasons.
      const parsedURL = new URL(url);
      const hash = parsedURL.hash;
      parsedURL.hash = '';
      const encodedURL = encodeURIComponent(parsedURL.href);
      return `${pdfViewerBaseURL}?file=${encodedURL}${hash}`;
    }

    /**
     * Returns true if the extension is permitted to inject a content script into
     * a tab with a given URL.
     */
    async function canInjectScript(url: string) {
      if (isFileURL(url)) {
        return chromeAPI.extension.isAllowedFileSchemeAccess();
      }
      return isSupportedURL(url);
    }

    /**
     * Guess the content type of a page from the URL alone.
     *
     * This is a fallback for when it is not possible to inject
     * a content script to determine the type of content in the page.
     */
    function guessContentTypeFromURL(url: string) {
      if (url.includes('.pdf')) {
        return CONTENT_TYPE_PDF;
      } else {
        return CONTENT_TYPE_HTML;
      }
    }

    // VitalSource and LMS integration removed for RabbitTrail adaptation

    async function detectTabContentType(tab: Tab) {
      if (isPDFViewerURL(tab.url)) {
        return CONTENT_TYPE_PDF;
      }

      const canInject = await canInjectScript(tab.url);
      if (canInject) {
        const result = await executeFunction({
          tabId: tab.id,
          func: detectContentType,
          args: [],
        });
        if (result) {
          return result.type;
        } else {
          // If the content script threw an exception,
          // frameResults may be null or undefined.
          //
          // In that case, fall back to guessing based on the
          // tab URL
          return guessContentTypeFromURL(tab.url);
        }
      } else {
        // We cannot inject a content script in order to determine the
        // file type, so fall back to a URL-based mechanism
        return guessContentTypeFromURL(tab.url);
      }
    }

    /**
     * Returns true if a tab is displaying a PDF using the PDF.js-based
     * viewer bundled with the extension.
     */
    function isPDFViewerURL(url: string) {
      return url.startsWith(pdfViewerBaseURL);
    }

    function isFileURL(url: string) {
      return url.startsWith('file:');
    }

    function isSupportedURL(url: string) {
      // Injection of content scripts is limited to a small number of protocols,
      // see https://developer.chrome.com/extensions/match_patterns
      const parsedURL = new URL(url);
      return ['http:', 'https:', 'ftp:'].includes(parsedURL.protocol);
    }

    async function injectIntoLocalDocument(tab: Tab, config: object) {
      const type = await detectTabContentType(tab);
      if (type === CONTENT_TYPE_PDF) {
        return injectIntoLocalPDF(tab, config);
      } else {
        throw new LocalFileError('Local non-PDF files are not supported');
      }
    }

    async function injectIntoRemoteDocument(tab: Tab, config: object) {
      if (isPDFViewerURL(tab.url)) {
        return;
      }

      if (!isSupportedURL(tab.url)) {
        // Chrome does not permit extensions to inject content scripts
        // into (chrome*):// URLs and other custom schemes.
        //
        // A common case where this happens is when the user has an
        // extension installed that provides a custom viewer for PDFs
        // (or some other format). In some cases we could extract the original
        // URL and open that in the Hypothesis viewer instead.
        const protocol = tab.url.split(':')[0];
        throw new RestrictedProtocolError(
          `Cannot load Hypothesis into ${protocol} pages`,
        );
      }

      const type = await detectTabContentType(tab);

      if (type === CONTENT_TYPE_PDF) {
        await injectIntoPDF(tab, config);
      } else {
        // FIXME - Nothing actually sets `installedURL`. It used to be part of
        // the client's boot script. See e0bf3fd2a09414170eb991d7837bf6acd821502b.
        const result = (await injectIntoHTML(tab, config)) as {
          installedURL: string;
        } | null;
        if (
          typeof result?.installedURL === 'string' &&
          !result.installedURL.includes(chromeAPI.runtime.getURL('/'))
        ) {
          throw new AlreadyInjectedError(
            'Hypothesis is already injected into this page',
          );
        }
      }
    }

    function injectIntoPDF(tab: Tab, config: object) {
      if (isPDFViewerURL(tab.url)) {
        return Promise.resolve();
      }

      const onMessage = chromeAPI.runtime.onMessage;
      const listener = (
        request: any,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void,
      ) => {
        if (sender.tab?.id === tab.id && request?.type === 'getConfigForTab') {
          sendResponse(config);
          onMessage.removeListener(listener);
        }
      };
      onMessage.addListener(listener);
      return chromeAPI.tabs.update(tab.id, { url: getPDFViewerURL(tab.url) });
    }

    async function injectIntoLocalPDF(tab: Tab, config: object) {
      const isAllowed = await chromeAPI.extension.isAllowedFileSchemeAccess();
      if (isAllowed) {
        await injectIntoPDF(tab, config);
      } else {
        throw new NoFileAccessError('Local file scheme access denied');
      }
    }

    async function injectIntoHTML(tab: Tab, config: object) {
      await injectConfig(tab.id, config);
      return executeClientBootScript(tab.id);
    }

    async function removeFromPDF(tab: Tab) {
      const parsedURL = new URL(tab.url);
      const originalURL = parsedURL.searchParams.get('file');
      if (!originalURL) {
        throw new Error(`Failed to extract original URL from ${tab.url}`);
      }
      let hash = parsedURL.hash;

      // If the original URL was a direct link, drop the #annotations fragment
      // as otherwise the Chrome extension will re-activate itself on this tab
      // when the original URL loads.
      if (hash.startsWith('#annotations:')) {
        hash = '';
      }

      await chromeAPI.tabs.update(tab.id, {
        url: decodeURIComponent(originalURL) + hash,
      });
    }

    async function removeFromHTML(tab: Tab) {
      if (!isSupportedURL(tab.url)) {
        return;
      }
      await executeScript({
        tabId: tab.id,
        file: '/unload-client.js',
      });
    }

    /**
     * Inject configuration for the Hypothesis client into the page via a
     * JSON <script> tag.
     */
    function injectConfig(
      tabId: number,
      clientConfig: object,
      frameId?: number,
    ) {
      const extensionId = getExtensionId();
      return executeFunction({
        tabId,
        frameId,
        func: setClientConfig,
        args: [clientConfig, extensionId],
      });
    }

    async function executeClientBootScript(tabId: number, frameId?: number) {
      return executeScript({
        tabId,
        frameId,
        file: '/client/build/boot.js',
      });
    }
  }
}
